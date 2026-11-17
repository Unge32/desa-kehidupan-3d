// Desa Kehidupan 3D — ui.js
// Antarmuka berbasis DOM (bukan canvas): HUD atas (emas, hari/musim/cuaca,
// jam, lapar/haus/energi/sehat, benih terpilih), layar judul, menang,
// kalah, dialog, toko, tas, jeda, dan bantuan — semua Bahasa Indonesia,
// tombol besar untuk jempol di HP.
import { SEASON_NAMES, CROPS, SHOP } from './config.js';
import { seasonOf, festivalOf, scoreOf } from './world.js';
import { itemName, sellableItems } from './economy.js';
import { activeTasks } from './tasks.js';

const SEED_KEYS = ['lobak', 'wortel', 'tomat', 'gandum', 'labu', 'stroberi'];
const SHOP_TABS = ['benih', 'makanan', 'hewan', 'obat', 'rumah', 'lain'];
const SHOP_TAB_NAMES = { benih: 'Benih', makanan: 'Makanan', hewan: 'Hewan', obat: 'Obat', rumah: 'Rumah', lain: 'Lainnya' };

export const HELP_TEXT = `TUJUAN: Beli RUMAH BESAR (50.000G) sebelum akhir Tahun 1 (28 hari).
Semua transaksi pakai Gold — duit mainan di dalam game.

🌱 BERTANI: tombol AKSI di petak ladang untuk cangkul → tanam benih (pilih benih di atas) → siram tiap hari → panen saat matang.
   Modal awal: benih sayur + Stroberi gratis, 8 petak ladang, Penyiram Tanaman, Ember Perah, dan sedikit pakan.
🌧️ MUSIM SEMI HUJAN: minggu pertama sering hujan, tanamanmu tersiram sendiri. Fokus cari duit: panen, mancing, gali, ternak.
🎣 MANCING: berdiri di tepi air, tekan PANCING, tarik saat muncul "❗"
⛏️ MENAMBANG: tekan AKSI di titik ✦ di hutan. Berlian = 2.000G!
🐄 TERNAK: beli hewan di pasar, beri pakan, ambil telur/susu. Perah susu pakai Ember Perah. Hewan sakit? Beri Obat Hewan.
📋 TUGAS WARGA: bicara (AKSI) ke Pak Tani, Budi, Bu Sari, atau Rani untuk tugas berbayar Gold. Selesai? Bicara lagi untuk upah!
🛒 PASAR: tekan TOKO. Jual hasil panen di tas (TAS → JUAL SEMUA).
💬 WARGA: tekan AKSI dekat warga untuk mengobrol (+hati). Beri bunga untuk Rani. Hati penuh + cincin = menikah, lalu punya anak!
🎉 FESTIVAL: tiap hari ke-7 musim, di alun-alun. Panen di Festival Panen harganya 2x lipat!
🍞 MAKAN/MINUM: lapar & haus turun tiap jam. Makan dari tas, minum di sumur/danau. Sehat 0 = pingsan, kehilangan 10% emas.
😴 TIDUR: tekan AKSI di depan rumahmu untuk tidur ke hari berikut.

Kontrol HP: joystick kiri jalan • AKSI • PANCING • TAS • TOKO.
Kontrol desktop: WASD/Arrows jalan • E aksi • F mancing • I tas • B toko • 1-6 pilih benih • P jeda • M suara • H bantuan • Enter mulai/ulang`;

function $(id) { return document.getElementById(id); }

export function createUI() {
  const ui = {
    mode: 'title',
    dialog: null,
    dialogQueue: [],
    shopTab: 'benih',
    shopSel: 0,
    invSel: 0,
    seedSel: 0,
    handlers: null,
    _cache: {},
  };
  // Benih chips.
  const row = $('seed-row');
  SEED_KEYS.forEach((key, i) => {
    const b = document.createElement('button');
    b.className = 'seed-chip';
    b.textContent = `${i + 1} ${CROPS[key].name}`;
    b.addEventListener('click', () => {
      ui.seedSel = i;
      if (ui.handlers) ui.handlers.selectSeed(i);
      refreshSeedChips(ui);
    });
    row.appendChild(b);
  });
  refreshSeedChips(ui);
  // Tombol statis.
  $('btn-start').addEventListener('click', () => ui.handlers && ui.handlers.start());
  $('btn-dialog-next').addEventListener('click', () => ui.handlers && ui.handlers.dialogNext());
  $('btn-shop-close').addEventListener('click', () => ui.handlers && ui.handlers.close());
  $('btn-inv-close').addEventListener('click', () => ui.handlers && ui.handlers.close());
  $('btn-sell-all').addEventListener('click', () => ui.handlers && ui.handlers.sellAll());
  $('btn-use-item').addEventListener('click', () => ui.handlers && ui.handlers.useSelected());
  $('btn-resume').addEventListener('click', () => ui.handlers && ui.handlers.close());
  $('btn-help-close').addEventListener('click', () => ui.handlers && ui.handlers.close());
  $('btn-win-restart').addEventListener('click', () => ui.handlers && ui.handlers.start());
  $('btn-lose-restart').addEventListener('click', () => ui.handlers && ui.handlers.start());
  $('help-text').textContent = HELP_TEXT;
  return ui;
}

function refreshSeedChips(ui) {
  const row = $('seed-row');
  [...row.children].forEach((el, i) => el.classList.toggle('sel', i === ui.seedSel));
}

export function showDialog(ui, text) {
  ui.dialogQueue.push(text);
  if (!ui.dialog) ui.dialog = ui.dialogQueue.shift();
  ui.mode = 'dialog';
  $('dialog-text').textContent = ui.dialog;
  showOverlay('overlay-dialog');
}

export function advanceDialog(ui) {
  if (ui.dialogQueue.length > 0) {
    ui.dialog = ui.dialogQueue.shift();
    $('dialog-text').textContent = ui.dialog;
  } else {
    ui.dialog = null;
    ui.mode = 'playing';
    hideOverlays();
  }
  return ui.mode;
}

const OVERLAYS = ['overlay-title', 'overlay-dialog', 'overlay-shop', 'overlay-inv', 'overlay-pause', 'overlay-help', 'overlay-win', 'overlay-lose'];
export function showOverlay(id) {
  for (const o of OVERLAYS) $(o).classList.toggle('show', o === id);
}
export function hideOverlays() {
  for (const o of OVERLAYS) $(o).classList.remove('show');
}

function setText(id, value, cache, key) {
  if (cache[key] !== value) {
    cache[key] = value;
    $(id).textContent = value;
  }
}
function setBar(id, frac, cache, key) {
  const v = Math.round(Math.max(0, Math.min(1, frac)) * 100);
  if (cache[key] !== v) {
    cache[key] = v;
    $(id).style.width = `${v}%`;
  }
}

export function updateHUD(world, ui) {
  const p = world.player;
  const c = ui._cache;
  const season = seasonOf(world.day);
  setText('hud-gold', `🪙 ${world.gold.toLocaleString('id-ID')}G`, c, 'gold');
  const hh = String(Math.floor(world.hour)).padStart(2, '0');
  const mm = String(Math.floor(world.minute)).padStart(2, '0');
  setText('hud-day', `Hari ${world.day}/28  •  ${SEASON_NAMES[season]}  •  ${world.weather}  •  ${hh}:${mm}`, c, 'day');
  const fest = festivalOf(world.day);
  setText('hud-fest', fest ? `🎉 ${fest.name} hari ini!` : '', c, 'fest');
  setBar('bar-hunger', p.hunger / 100, c, 'hunger');
  setBar('bar-thirst', p.thirst / 100, c, 'thirst');
  setBar('bar-energy', p.energy / 100, c, 'energy');
  setBar('bar-health', p.health / 100, c, 'health');
  setText('hud-married', p.married ? '💍 Menikah dengan Rani' : '', c, 'married');
  // Pesan singkat.
  const msg = $('message');
  if (world.message && world.messageTimer > 0) {
    if (c.msg !== world.message) {
      c.msg = world.message;
      msg.textContent = world.message;
    }
    msg.style.display = 'block';
  } else if (c.msg !== null) {
    c.msg = null;
    msg.style.display = 'none';
  }
  // Banner mancing + tombol PANCING.
  const banner = $('fish-banner');
  const fishBtn = $('btn-fish');
  if (world.fish.active) {
    banner.style.display = 'block';
    if (world.fish.phase === 'bite') {
      banner.textContent = '❗ TARIK SEKARANG! (F)';
      fishBtn.classList.add('bite');
    } else {
      banner.textContent = '🎣 Menunggu ikan...';
      fishBtn.classList.remove('bite');
    }
  } else {
    banner.style.display = 'none';
    fishBtn.classList.remove('bite');
  }
  // Seed chips: tampilkan jumlah benih terpilih.
  const seed = SEED_KEYS[ui.seedSel];
  const label = `${ui.seedSel + 1} ${CROPS[seed].name} (${world.inventory[`benih_${seed}`] || 0})`;
  if (c.seedLabel !== label) {
    c.seedLabel = label;
    const chip = $('seed-row').children[ui.seedSel];
    if (chip) chip.textContent = label;
  }
  refreshSeedChips(ui);
}

export function renderShop(world, ui) {
  $('shop-title').textContent = `🛒 PASAR DESA  —  Emas: ${world.gold.toLocaleString('id-ID')}G`;
  const tabs = $('shop-tabs');
  tabs.innerHTML = '';
  SHOP_TABS.forEach((tab) => {
    const b = document.createElement('button');
    b.className = `tab${ui.shopTab === tab ? ' sel' : ''}`;
    b.textContent = SHOP_TAB_NAMES[tab];
    b.addEventListener('click', () => {
      ui.shopTab = tab; ui.shopSel = 0;
      renderShop(world, ui);
    });
    tabs.appendChild(b);
  });
  const list = $('shop-items');
  list.innerHTML = '';
  SHOP[ui.shopTab].forEach((item, i) => {
    const b = document.createElement('button');
    b.className = `itemrow${ui.shopSel === i ? ' sel' : ''}`;
    b.innerHTML = `<span>${item.name}<span class="desc">${item.desc}</span></span><span class="price">${item.price.toLocaleString('id-ID')}G</span>`;
    b.addEventListener('click', () => {
      ui.shopSel = i;
      if (ui.handlers) ui.handlers.buy(item.id);
      renderShop(world, ui);
    });
    list.appendChild(b);
  });
}

export function renderInventory(world, ui) {
  $('inv-title').textContent = `🎒 TAS  —  Emas: ${world.gold.toLocaleString('id-ID')}G`;
  const list = $('inv-items');
  list.innerHTML = '';
  const entries = Object.entries(world.inventory).filter(([, n]) => n > 0);
  if (entries.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Tas kosong.';
    list.appendChild(p);
  }
  entries.forEach(([id, n], i) => {
    const price = sellableItems(world).find((s) => s.id === id);
    const b = document.createElement('button');
    b.className = `itemrow${ui.invSel === i ? ' sel' : ''}`;
    b.innerHTML = `<span>${itemName(id)}  x${n}</span><span class="price">${price ? `jual ${price.price}G` : ''}</span>`;
    b.addEventListener('click', () => {
      ui.invSel = i;
      renderInventory(world, ui);
    });
    list.appendChild(b);
  });
}

export function showPause(world, ui) {
  $('pause-info').textContent = `Hari ${world.day}/28 — ${SEASON_NAMES[seasonOf(world.day)]} — ${world.weather} • Emas ${world.gold.toLocaleString('id-ID')}G • Skor ${scoreOf(world).toLocaleString('id-ID')}`;
  const tasks = activeTasks(world);
  const box = $('pause-tasks');
  box.innerHTML = '';
  if (tasks.length > 0) {
    const h = document.createElement('p');
    h.innerHTML = '<b>📋 TUGAS AKTIF:</b>';
    box.appendChild(h);
    tasks.forEach((t) => {
      const p = document.createElement('p');
      p.textContent = t.text;
      box.appendChild(p);
    });
  }
  showOverlay('overlay-pause');
}

export function showWin(world) {
  $('win-stats').innerHTML =
    `Skor akhir: ${scoreOf(world).toLocaleString('id-ID')}<br>` +
    `Emas: ${world.gold.toLocaleString('id-ID')}G  •  Panen: ${world.stats.harvested}  •  Ikan: ${world.stats.fishCaught}  •  Permata: ${world.stats.gemsFound}<br>` +
    `Hari selesai: ${world.day}/28  •  Menikah: ${world.player.married ? 'Ya 💍' : 'Belum'}  •  Anak: ${world.player.childStage > 0 ? world.player.childName : '-'}`;
  showOverlay('overlay-win');
}

export function showLose(world) {
  $('lose-stats').innerHTML =
    `Skor akhir: ${scoreOf(world).toLocaleString('id-ID')}<br>` +
    `Emas: ${world.gold.toLocaleString('id-ID')}G dari 50.000G  •  Panen: ${world.stats.harvested}  •  Ikan: ${world.stats.fishCaught}`;
  showOverlay('overlay-lose');
}

export { SEED_KEYS };
