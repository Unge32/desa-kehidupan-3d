// Desa Kehidupan — fishing.js
// Memancing: lempar di tepi air, tunggu pelampung tenggelam ("!"), tekan
// tepat waktu. Ikan yang didapat tergantung musim dan alat pancing.
import { FISH } from './config.js';
import { seasonOf, nearWater } from './world.js';
import { pickWeighted } from './random.js';

export function startFishing(world) {
  const p = world.player;
  if (world.fish.active) return { ok: false, msg: '' };
  if (!nearWater(world, p.x, p.y)) return { ok: false, msg: 'Berdirilah di tepi danau atau laut.' };
  world.fish.active = true;
  world.fish.phase = 'wait';
  world.fish.timer = 1.5 + world.rng() * 3;
  world.fish.caught = null;
  return { ok: true, sfx: 'splash', msg: 'Kail dilempar... tunggu pelampung tenggelam!' };
}

export function updateFishing(world, dt) {
  const f = world.fish;
  if (!f.active) return;
  f.timer -= dt;
  if (f.phase === 'wait' && f.timer <= 0) {
    f.phase = 'bite';
    f.timer = world.player && world.flags.pancingPro ? 1.6 : 1.1;
  } else if (f.phase === 'bite' && f.timer <= 0) {
    f.active = false;
    f.phase = 'idle';
    world.message = 'Ikan kabur... Terlalu lambat!';
    world.messageTimer = 3;
  }
}

export function reelIn(world) {
  const f = world.fish;
  if (!f.active) return null;
  if (f.phase !== 'bite') {
    f.active = false;
    f.phase = 'idle';
    return { ok: false, msg: 'Belum ada ikan. Sabar...' };
  }
  const season = seasonOf(world.day);
  const pool = Object.entries(FISH)
    .filter(([, v]) => v.seasons.includes(season))
    .map(([id, v]) => ({ id, ...v }));
  const caught = pickWeighted(world.rng, pool);
  const key = `ikan_${caught.id}`;
  world.inventory[key] = (world.inventory[key] || 0) + 1;
  world.stats.fishCaught += 1;
  f.active = false;
  f.phase = 'idle';
  f.caught = caught.name;
  return { ok: true, sfx: 'fish', msg: `Dapat ${caught.name}! (jual ${caught.sell}G)` };
}
