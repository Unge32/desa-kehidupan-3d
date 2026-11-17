// Desa Kehidupan — npc.js
// Penduduk desa: mengobrol (hati persahabatan), memberi hadiah, pacaran,
// melamar, menikah, dan punya anak yang tumbuh lalu sekolah dan bermain.
// Bicara juga menerima / menyelesaikan tugas bantu warga yang dibayar Gold.
import { NPCS } from './config.js';
import { taskForNpc, taskStatus, acceptTask, taskProgress, completeTask } from './tasks.js';

export function npcAt(world, tx, ty) {
  return world.npcs.find((n) => Math.floor(n.x / 32) === tx && Math.floor(n.y / 32) === ty) || null;
}

export function nearestNpc(world, px, py, maxDist = 48) {
  let best = null;
  let bestD = maxDist;
  for (const n of world.npcs) {
    const d = Math.hypot(n.x - px, n.y - py);
    if (d < bestD) { best = n; bestD = d; }
  }
  return best;
}

export function talkTo(world, npc) {
  const p = world.player;
  let msg = '';
  // Tugas warga: bicara pertama menerima tugas, bicara lagi setelah syarat
  // terpenuhi menyelesaikan tugas dan membayar Gold.
  const def = taskForNpc(world, npc.id);
  if (def) {
    const st = taskStatus(world, def.id);
    if (st === 'none') {
      acceptTask(world, def);
      msg = ` 📋 TUGAS: ${def.title} — ${def.offer} (Hadiah ${def.reward}G)`;
    } else if (st === 'active') {
      const prog = taskProgress(world, def);
      if (prog.ready) msg = ` 📋 ${completeTask(world, def)}`;
      else msg = ` 📋 TUGAS: ${def.title} — ${prog.text}`;
    }
  }
  if (npc.talkedToday) {
    return { ok: true, msg: `${npc.name}: "${npc.lines[Math.floor(world.rng() * npc.lines.length)]}"${msg}`, sfx: 'talk' };
  }
  npc.talkedToday = true;
  npc.hearts = Math.min(5, npc.hearts + 1);
  world.stats.talked += 1;
  msg = `${npc.name}: "${npc.lines[Math.floor(world.rng() * npc.lines.length)]}"${msg}`;
  if (npc.hearts === 5 && npc.datable && !p.married) {
    msg += ' ❤ Hati Rani PENUH! Lamar dia dengan Cincin Lamaran.';
  }
  return { ok: true, msg, sfx: 'talk', hearts: npc.hearts };
}

export function giftTo(world, npc) {
  const p = world.player;
  const giftKey = npc.gift || 'bunga';
  if ((world.inventory[giftKey] || 0) <= 0) {
    return { ok: false, msg: `Kamu tidak punya hadiah. Beli Buket Bunga di Toko Umum.` };
  }
  world.inventory[giftKey] -= 1;
  world.stats.gifted += 1;
  const liked = npc.datable && giftKey === 'bunga';
  npc.hearts = Math.min(5, npc.hearts + (liked ? 2 : 1));
  let msg = `${npc.name} senang menerima hadiahmu! (+${liked ? 2 : 1} ❤)`;
  if (npc.hearts === 5 && npc.datable && !p.married) {
    msg += ' Hati Rani PENUH! Lamar dia dengan Cincin Lamaran.';
  }
  return { ok: true, msg, sfx: 'heart' };
}

export function propose(world, npc) {
  const p = world.player;
  if (!npc.datable) return { ok: false, msg: `${npc.name} tidak bisa dilamar.` };
  if (p.married) return { ok: false, msg: 'Kamu sudah menikah!' };
  if (npc.hearts < 5) return { ok: false, msg: `Hati ${npc.name} belum penuh (${npc.hearts}/5). Ajak bicara dan beri hadiah.` };
  if ((world.inventory.cincin || 0) <= 0) {
    return { ok: false, msg: 'Kamu butuh Cincin Lamaran (5.000G di Toko Umum).' };
  }
  world.inventory.cincin -= 1;
  p.married = true;
  p.spouse = npc.id;
  p.childBornDay = world.day + 3;
  p.childStage = 0;
  p.childName = 'Bimo';
  return {
    ok: true, sfx: 'win',
    msg: `Rani menerima lamaranmu! 💍 Kalian menikah! Anak kalian lahir dalam 3 hari.`,
  };
}

export function updateFamily(world) {
  const p = world.player;
  if (!p.married || p.childStage > 0) return;
  if (world.day >= p.childBornDay) {
    p.childStage = 1;
    world.message = `Bayi kalian lahir! Selamat datang, ${p.childName}! 👶`;
    world.messageTimer = 6;
  }
}

export function childDescription(world) {
  const p = world.player;
  if (!p.married) return null;
  if (p.childStage === 0) return `Bayi ${p.childName} lahir ${Math.max(0, p.childBornDay - world.day)} hari lagi.`;
  if (p.childStage === 1) return `Bayi ${p.childName} sedang tidur di rumah.`;
  if (p.childStage === 2) return `${p.childName} (balita) bermain di taman.`;
  return `${p.childName} bersekolah di Sekolah Desa dan bermain di taman.`;
}

export function festivalBonus(world) {
  // Festival hari ini: penduduk berkumpul di alun-alun, hadiah dari Pak RT.
  const fest = world.day % 7 === 0;
  if (!fest || world.flags.festivalDoneToday) return null;
  world.flags.festivalDoneToday = true;
  const season = Math.floor((world.day - 1) / 7) % 4;
  if (season === 1) {
    world.gold += 1000;
    return { ok: true, sfx: 'festival', msg: 'Lomba Mancing! Kamu menang! Hadiah 1.000G!' };
  }
  if (season === 2) {
    world.inventory.benih_labu = (world.inventory.benih_labu || 0) + 3;
    return { ok: true, sfx: 'festival', msg: 'Festival Panen! Kamu dapat 3 Benih Labu. Harga panen hari ini 2x!' };
  }
  world.inventory.bunga = (world.inventory.bunga || 0) + 2;
  return { ok: true, sfx: 'festival', msg: 'Festival desa! Kamu dapat 2 Buket Bunga.' };
}
