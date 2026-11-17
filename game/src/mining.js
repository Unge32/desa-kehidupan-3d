// Desa Kehidupan — mining.js
// Menggali tanah di hutan tambang: batu, kuarsa, rubi, zamrud, dan berlian
// langka. Titik galian pulih setiap pagi.
import { GEMS } from './config.js';
import { pickWeighted } from './random.js';

export function digSpotAt(world, tx, ty) {
  return world.digSpots.find((d) => d.x === tx && d.y === ty) || null;
}

export function dig(world, spot) {
  if (!spot) return { ok: false, msg: 'Bukan titik galian.' };
  if (!spot.available) return { ok: false, msg: 'Titik ini sudah digali. Kembali besok.' };
  spot.available = false;
  world.player.energy = Math.max(0, world.player.energy - 5);
  const pool = Object.entries(GEMS).map(([id, v]) => ({ id, ...v }));
  const found = pickWeighted(world.rng, pool);
  const key = `permata_${found.id}`;
  world.inventory[key] = (world.inventory[key] || 0) + 1;
  world.stats.gemsFound += 1;
  const rare = found.id === 'berlian' || found.id === 'zamrud';
  return {
    ok: true,
    sfx: rare ? 'gem' : 'dig',
    msg: `Kamu menggali ${found.name}! (jual ${found.sell}G)`,
  };
}
