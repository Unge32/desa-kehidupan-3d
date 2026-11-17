// Desa Kehidupan 3D — main.js
// Titik masuk game: loop utama, mesin state (judul/bermain/dialog/toko/
// tas/jeda/bantuan/menang/kalah), semua interaksi pemain, kontrol sentuh
// (joystick + tombol aksi), dan hook debug untuk playtest serta adegan
// screenshot (?shot=...&seed=...).
// Logika game SAMA dengan versi 2D; yang berubah hanya render (Three.js)
// dan UI (DOM).
import { TILE, SEASONS, SEASON_NAMES, CROPS } from './config.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { createTouchControls } from './touch.js';
import {
  createWorld, seasonOf, festivalOf, tileAt, isWalkable, nearWater,
  updatePlayer, tickClock, sleep, faint, updateNPCs, gameResult, scoreOf,
} from './world.js';
import { plotAt, farmAction } from './farm.js';
import { feedAnimal, collectAnimal, healAnimal, updateAnimals } from './animals.js';
import { startFishing, updateFishing, reelIn } from './fishing.js';
import { digSpotAt, dig } from './mining.js';
import { sellItem, sellAll, buyItem, sellableItems, itemName } from './economy.js';
import { nearestNpc, talkTo, giftTo, propose, updateFamily, festivalBonus, childDescription } from './npc.js';
import { Renderer3D } from './render3d.js';
import {
  createUI, showDialog, advanceDialog, updateHUD, showOverlay, hideOverlays,
  renderShop, renderInventory, showPause, showWin, showLose, SEED_KEYS,
} from './ui.js';

const canvas = document.getElementById('game');
const renderer = new Renderer3D(canvas);
const audio = new AudioSys();
const input = new Input();
const ui = createUI();

let world = createWorld(1);
let state = 'title';
let animTime = 0;
let lastTs = 0;
let shotMode = false; // ?shot=... : adegan screenshot dibekukan (tanpa simulasi) supaya deterministik.
const statusEl = document.getElementById('status');

function setState(next) {
  state = next;
  ui.mode = next;
  if (statusEl) statusEl.textContent = `Desa Kehidupan 3D: ${next}`;
  if (next === 'title') showOverlay('overlay-title');
  else if (next === 'shop') { renderShop(world, ui); showOverlay('overlay-shop'); }
  else if (next === 'inventory') { renderInventory(world, ui); showOverlay('overlay-inv'); }
  else if (next === 'pause') { showPause(world, ui); }
  else if (next === 'help') showOverlay('overlay-help');
  else if (next === 'win') showWin(world);
  else if (next === 'lose') showLose(world);
  else if (next === 'playing') hideOverlays();
}

function openDialog(text) {
  showDialog(ui, text);
  setState('dialog');
}

function closeDialogStep() {
  const mode = advanceDialog(ui);
  if (mode === 'playing') setState('playing');
}

function say(msg, sfx) {
  world.message = msg;
  world.messageTimer = 5;
  if (sfx) audio.sfx(sfx);
}

function resetGame(seed = 1) {
  world = createWorld(seed);
  renderer.build(world);
  ui.dialog = null;
  ui.dialogQueue = [];
  ui.shopSel = 0;
  ui.invSel = 0;
  ui.seedSel = 0;
  setState('playing');
}

// --- Interaksi konteks (tombol E / AKSI) ---
function doInteract() {
  const p = world.player;
  const { x: tx, y: ty } = tileAt(world, p.x, p.y);
  // 1. Memancing sedang aktif: tarik.
  if (world.fish.active) {
    const r = reelIn(world);
    if (r) say(r.msg, r.sfx);
    return;
  }
  // 2. Warga terdekat.
  const npc = nearestNpc(world, p.x, p.y, 56);
  if (npc) {
    const r = talkTo(world, npc);
    openDialog(r.msg);
    audio.sfx(r.sfx || 'talk');
    return;
  }
  // 3. Hewan di kandang (jarak dekat).
  let bestAnimal = null;
  let bestD = 56;
  for (const a of world.animals) {
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d < bestD) { bestAnimal = a; bestD = d; }
  }
  if (bestAnimal) {
    let r;
    if (bestAnimal.sick) r = healAnimal(world, bestAnimal);
    else if (bestAnimal.produceReady) r = collectAnimal(world, bestAnimal);
    else r = feedAnimal(world, bestAnimal);
    say(r.msg, r.sfx || (r.ok ? 'eat' : 'error'));
    return;
  }
  // 4. Titik galian.
  const spot = digSpotAt(world, tx, ty) || digSpotAt(world, tx, ty + 1) || digSpotAt(world, tx, ty - 1)
    || digSpotAt(world, tx + 1, ty) || digSpotAt(world, tx - 1, ty);
  if (spot) {
    const r = dig(world, spot);
    say(r.msg, r.sfx || (r.ok ? 'dig' : 'error'));
    return;
  }
  // 5. Petak ladang.
  const plot = plotAt(world, tx, ty);
  if (plot) {
    const seedId = SEED_KEYS[ui.seedSel];
    const r = farmAction(world, plot, seedId);
    say(r.msg, r.sfx || (r.ok ? 'plant' : 'error'));
    return;
  }
  // 6. Pintu bangunan.
  const b = world.buildings.find((bb) => Math.abs(bb.door.x - tx) <= 1 && Math.abs(bb.door.y - ty) <= 1);
  if (b) {
    if (b.id === 'rumah') {
      audio.sfx('sleep');
      sleep(world, true);
      say(`Hari ${world.day}. ${SEASON_NAMES[seasonOf(world.day)]}, ${world.weather}.`, null);
      return;
    }
    if (b.id === 'tokoBenih' || b.id === 'tokoUmum') {
      setState('shop');
      ui.shopTab = b.id === 'tokoBenih' ? 'benih' : 'makanan';
      ui.shopSel = 0;
      renderShop(world, ui);
      audio.sfx('talk');
      return;
    }
    if (b.id === 'sekolah') {
      const child = childDescription(world);
      openDialog(child || 'Sekolah Desa. Anak-anak belajar di sini tiap pagi. Kiki sering bermain di taman setelah pulang sekolah.');
      return;
    }
    const def = world.npcs.find((n) => n.id === b.id);
    if (def) {
      openDialog(`${def.name} sedang ${world.hour >= 20 || world.hour < 8 ? 'di dalam rumah. Ketuk pintunya besok pagi.' : 'tidak di rumah. Cari di sekitar desa.'}`);
      return;
    }
    openDialog(`${b.name}.`);
    return;
  }
  // 7. Sumur / air: minum.
  const t = world.terrain[ty] && world.terrain[ty][tx];
  if (t === 'well' || nearWater(world, p.x, p.y)) {
    p.thirst = Math.min(100, p.thirst + 50);
    say('Kamu minum air segar. Haus +50.', 'water');
    return;
  }
  say('Tidak ada yang bisa dilakukan di sini.', null);
}

function doFish() {
  if (world.fish.active) {
    const r = reelIn(world);
    if (r) say(r.msg, r.sfx);
  } else {
    const r = startFishing(world);
    say(r.msg, r.sfx || (r.ok ? 'splash' : 'error'));
  }
}

function useSelectedItem() {
  const entries = Object.entries(world.inventory).filter(([, n]) => n > 0);
  const entry = entries[ui.invSel];
  if (!entry) return;
  const [id] = entry;
  const p = world.player;
  const eat = { roti: [35, 0, 0, 0], nasi: [70, 0, 15, 0], jus: [0, 60, 10, 0], air: [0, 40, 0, 0] };
  if (eat[id]) {
    world.inventory[id] -= 1;
    p.hunger = Math.min(100, p.hunger + eat[id][0]);
    p.thirst = Math.min(100, p.thirst + eat[id][1]);
    p.energy = Math.min(100, p.energy + eat[id][2]);
    say(`Kamu menikmati ${itemName(id)}.`, 'eat');
    return;
  }
  if (id === 'obat_diri') {
    world.inventory[id] -= 1;
    p.health = Math.min(100, p.health + 50);
    say('Kamu minum Obat Herbal. Sehat +50.', 'eat');
    return;
  }
  if (id === 'vitamin') {
    world.inventory[id] -= 1;
    p.energy = Math.min(100, p.energy + 60);
    p.health = Math.min(100, p.health + 20);
    say('Vitamin diminum. Energi +60.', 'eat');
    return;
  }
  if (id === 'bunga') {
    say('Buket Bunga: beri ke warga dengan tombol G saat berdiri di dekatnya.', null);
    return;
  }
  if (id === 'penyiram') {
    say('Penyiram Tanaman: dipakai otomatis saat menyiram (tekan AKSI di tanaman).', null);
    return;
  }
  if (id === 'ember_perah') {
    say('Ember Perah: dipakai otomatis saat memerah susu sapi/kambing/kerbau.', null);
    return;
  }
  if (sellableItems(world).some((s) => s.id === id)) {
    const r = sellItem(world, id, 1);
    say(r.msg, r.sfx);
    return;
  }
  say('Barang ini tidak bisa dipakai langsung.', null);
}

function giftNearby() {
  const npc = nearestNpc(world, world.player.x, world.player.y, 56);
  if (!npc) { say('Tidak ada warga di dekatmu.', 'error'); return; }
  const r = giftTo(world, npc);
  say(r.msg, r.sfx || (r.ok ? 'heart' : 'error'));
}

function proposeNearby() {
  const npc = nearestNpc(world, world.player.x, world.player.y, 56);
  if (!npc) { say('Tidak ada warga di dekatmu.', 'error'); return; }
  const r = propose(world, npc);
  if (r.ok) openDialog(r.msg);
  else say(r.msg, 'error');
  if (r.sfx) audio.sfx(r.sfx);
}

// --- Handler tombol UI (DOM) ---
ui.handlers = {
  start: () => { audio.ensure(); audio.startMusic(); resetGame(1); },
  dialogNext: () => closeDialogStep(),
  close: () => setState('playing'),
  buy: (id) => {
    const r = buyItem(world, id);
    say(r.msg, r.sfx || (r.ok ? 'buy' : 'error'));
    renderShop(world, ui);
    if (gameResult(world) === 'win') setState('win');
  },
  useSelected: () => { useSelectedItem(); renderInventory(world, ui); },
  sellAll: () => {
    const r = sellAll(world);
    say(r.msg, r.sfx || (r.ok ? 'coin' : 'error'));
    renderInventory(world, ui);
  },
  selectSeed: (i) => { ui.seedSel = i; },
};

// --- Kontrol sentuh ---
const touch = createTouchControls(input, (name) => {
  if (state === 'title' && name === 'action') { ui.handlers.start(); return; }
  if (state !== 'playing') return;
  if (name === 'action') doInteract();
  else if (name === 'fish') doFish();
  else if (name === 'inventory') setState('inventory');
  else if (name === 'shop') setState('shop');
});

// --- Input per state ---
function handlePlayingKeys() {
  if (input.wasPressed('e', 'E')) doInteract();
  if (input.wasPressed('f', 'F')) doFish();
  if (input.wasPressed('b', 'B')) setState('shop');
  if (input.wasPressed('i', 'I')) setState('inventory');
  if (input.wasPressed('g', 'G')) giftNearby();
  if (input.wasPressed('r', 'R')) proposeNearby();
  if (input.wasPressed('p', 'P', 'Escape')) setState('pause');
  if (input.wasPressed('h', 'H')) setState('help');
  if (input.wasPressed('m', 'M')) { audio.muted = !audio.muted; say(audio.muted ? 'Suara dimatikan.' : 'Suara dinyalakan.', null); }
  for (let i = 0; i < 6; i += 1) {
    if (input.wasPressed(String(i + 1))) ui.seedSel = i;
  }
}

function handleShopKeys() {
  const tabs = ['benih', 'makanan', 'hewan', 'obat', 'rumah', 'lain'];
  const items = { benih: 6, makanan: 4, hewan: 6, obat: 3, rumah: 3, lain: 3 }[ui.shopTab];
  if (input.wasPressed('ArrowLeft', 'a')) {
    const i = (tabs.indexOf(ui.shopTab) + tabs.length - 1) % tabs.length;
    ui.shopTab = tabs[i]; ui.shopSel = 0; renderShop(world, ui);
  }
  if (input.wasPressed('ArrowRight', 'd')) {
    const i = (tabs.indexOf(ui.shopTab) + 1) % tabs.length;
    ui.shopTab = tabs[i]; ui.shopSel = 0; renderShop(world, ui);
  }
  if (input.wasPressed('ArrowUp', 'w')) { ui.shopSel = Math.max(0, ui.shopSel - 1); renderShop(world, ui); }
  if (input.wasPressed('ArrowDown', 's')) { ui.shopSel = Math.min(items - 1, ui.shopSel + 1); renderShop(world, ui); }
  if (input.wasPressed('Enter', ' ')) {
    const list = { benih: ['benih_lobak', 'benih_wortel', 'benih_tomat', 'benih_gandum', 'benih_labu', 'benih_stroberi'], makanan: ['roti', 'nasi', 'jus', 'air'], hewan: ['beli_ayam', 'beli_kambing', 'beli_sapi', 'beli_kerbau', 'pakan_ayam', 'rumput'], obat: ['obat_hewan', 'obat_diri', 'vitamin'], rumah: ['tanah', 'cincin', 'rumah_besar'], lain: ['bunga', 'pancing_baru', 'cangkul_baja'] }[ui.shopTab];
    ui.handlers.buy(list[ui.shopSel]);
  }
  if (input.wasPressed('Escape', 'b', 'B')) setState('playing');
}

function handleInventoryKeys() {
  const entries = Object.entries(world.inventory).filter(([, n]) => n > 0);
  if (input.wasPressed('ArrowUp', 'w')) { ui.invSel = Math.max(0, ui.invSel - 1); renderInventory(world, ui); }
  if (input.wasPressed('ArrowDown', 's')) { ui.invSel = Math.min(Math.max(0, entries.length - 1), ui.invSel + 1); renderInventory(world, ui); }
  if (input.wasPressed('Enter', ' ')) { useSelectedItem(); renderInventory(world, ui); }
  if (input.wasPressed('j', 'J')) {
    const r = sellAll(world);
    say(r.msg, r.sfx || (r.ok ? 'coin' : 'error'));
    renderInventory(world, ui);
  }
  if (input.wasPressed('Escape', 'i', 'I')) setState('playing');
}

// --- Loop utama ---
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  animTime += dt;

  if (state === 'title') {
    if (input.wasPressed('Enter', ' ')) { audio.ensure(); audio.startMusic(); resetGame(1); }
  } else if (state === 'playing') {
    if (!shotMode) {
      handlePlayingKeys();
      updatePlayer(world, dt, input);
      tickClock(world, dt);
      updateNPCs(world, dt);
      updateAnimals(world, dt);
      updateFishing(world, dt);
      updateFamily(world);
      // Festival: pemain masuk alun-alun di hari festival.
      const fest = festivalOf(world.day);
      if (fest && !world.flags.festivalDoneToday) {
        const p = world.player;
        if (p.x >= 20 * TILE && p.x <= 27 * TILE && p.y >= 13 * TILE && p.y <= 17 * TILE) {
          const r = festivalBonus(world);
          if (r) openDialog(`🎉 ${fest.name}! ${fest.desc} ${r.msg}`);
        }
      }
      if (world.messageTimer > 0) world.messageTimer -= dt;
      const res = gameResult(world);
      if (res === 'win') { setState('win'); audio.sfx('win'); }
      else if (res === 'lose') { setState('lose'); audio.sfx('lose'); }
    }
  } else if (state === 'dialog') {
    if (input.wasPressed('Enter', ' ', 'e', 'E')) closeDialogStep();
  } else if (state === 'shop') {
    handleShopKeys();
  } else if (state === 'inventory') {
    handleInventoryKeys();
  } else if (state === 'pause') {
    if (input.wasPressed('p', 'P', 'Escape')) setState('playing');
    if (input.wasPressed('Enter')) resetGame(1);
    if (input.wasPressed('h', 'H')) setState('help');
  } else if (state === 'help') {
    if (input.wasPressed('h', 'H', 'Escape', 'Enter')) setState('playing');
  } else if (state === 'win' || state === 'lose') {
    if (input.wasPressed('Enter', ' ')) resetGame(1);
  }

  // Render 3D + HUD (kecuali layar judul yang memakai overlay penuh).
  if (state !== 'title') {
    renderer.render(world, dt, animTime);
    updateHUD(world, ui);
    if (touch) touch.setFishEnabled(world.fish.active || nearWater(world, world.player.x, world.player.y));
  }

  input.endFrame();
}

// --- Adegan screenshot deterministik (?shot=...&seed=...) ---
function stageShot(name, seed) {
  const w = createWorld(seed);
  if (name === 'play') {
    w.day = 3; w.hour = 10; w.minute = 15; w.weather = 'Cerah'; w.gold = 1240;
    w.inventory.benih_lobak = 4; w.inventory.benih_wortel = 2; w.inventory.roti = 2;
    for (let i = 0; i < 8; i += 1) {
      const plot = w.plots[i];
      plot.state = 'tilled';
      if (i < 6) {
        plot.crop = i < 3 ? 'lobak' : 'wortel';
        plot.growth = i < 3 ? 2 : 1;
        plot.watered = i % 2 === 0;
        if (plot.watered) plot.state = 'wet';
      }
    }
    w.animals.push({ kind: 'ayam', x: 3.5 * TILE, y: 9.5 * TILE, tx: null, ty: null, idle: 0, fed: true, sick: false, produceReady: true, happy: 4 });
    w.animals.push({ kind: 'sapi', x: 4.5 * TILE, y: 10 * TILE, tx: null, ty: null, idle: 0, fed: true, sick: false, produceReady: false, happy: 3 });
    const rani = w.npcs.find((n) => n.id === 'rani');
    rani.x = 20 * TILE; rani.y = 12 * TILE; rani.hearts = 3;
    const tani = w.npcs.find((n) => n.id === 'tani');
    tani.x = 18 * TILE; tani.y = 8 * TILE; tani.hearts = 2;
    w.player.x = 8 * TILE; w.player.y = 8 * TILE; w.player.dir = 'down';
    w.player.energy = 82; w.player.hunger = 74; w.player.thirst = 68; w.player.health = 100;
    w.message = 'Panen Lobak! (+1 di tas, jual di pasar)';
    w.messageTimer = 5;
    return { world: w, state: 'playing' };
  }
  if (name === 'fish') {
    w.day = 6; w.hour = 16; w.minute = 30; w.weather = 'Cerah'; w.gold = 860;
    w.inventory.ikan_ikanMas = 2;
    w.player.x = 35 * TILE + 16; w.player.y = 8 * TILE + 16; w.player.dir = 'right';
    startFishing(w);
    w.fish.phase = 'bite';
    w.fish.timer = 1.0;
    w.message = '❗ Ada ikan! Tarik sekarang!';
    w.messageTimer = 5;
    return { world: w, state: 'playing' };
  }
  if (name === 'win') {
    w.day = 24; w.hour = 12; w.gold = 52340; w.flags.bigHouse = true;
    w.stats.harvested = 86; w.stats.fishCaught = 24; w.stats.gemsFound = 9;
    w.player.married = true; w.player.spouse = 'rani'; w.player.childStage = 3; w.player.childName = 'Bimo';
    return { world: w, state: 'win' };
  }
  if (name === 'end') {
    w.day = 29; w.gold = 31200; w.stats.harvested = 41; w.stats.fishCaught = 12;
    return { world: w, state: 'lose' };
  }
  return { world: w, state: 'title' };
}

const params = new URLSearchParams(window.location.search);
if (params.has('shot')) {
  shotMode = true;
  const seed = Number(params.get('seed') || 1);
  const staged = stageShot(params.get('shot'), seed);
  world = staged.world;
  renderer.build(world);
  setState(staged.state);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { window.__shotReady = true; });
  });
} else {
  renderer.build(world);
}

window.__game = {
  get state() { return state; },
  get world() { return world; },
  get ui() { return ui; },
  audio,
  start: () => { resetGame(1); },
  reset: (seed) => resetGame(seed || 1),
  setGold: (g) => { world.gold = g; },
  setDay: (d) => { world.day = d; },
  setHour: (h) => { world.hour = h; world.minute = 0; },
  setWeather: (w) => { world.weather = w; },
  give: (id, n) => { world.inventory[id] = (world.inventory[id] || 0) + (n || 1); },
  teleport: (tx, ty) => { world.player.x = tx * TILE + 16; world.player.y = ty * TILE + 16; },
  sleepNow: () => sleep(world, true),
  faintNow: () => faint(world),
  setHearts: (id, h) => { const n = world.npcs.find((x) => x.id === id); if (n) n.hearts = h; },
  marry: () => {
    world.player.married = true;
    world.player.spouse = 'rani';
    world.player.childBornDay = world.day + 3;
    world.player.childName = 'Bimo';
  },
  growChild: (stage) => {
    world.player.childStage = stage;
    world.player.childBornDay = world.day - (stage === 3 ? 15 : stage === 2 ? 8 : 1);
  },
  winNow: () => { world.flags.bigHouse = true; setState('win'); },
  loseNow: () => { world.day = 29; setState('lose'); },
  interact: () => doInteract(),
  startFishing: () => startFishing(world),
  reelIn: () => reelIn(world),
  setJoy: (x, y, active) => input.setJoy(x, y, active),
};

requestAnimationFrame(frame);
