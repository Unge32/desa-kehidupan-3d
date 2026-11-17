// Desa Kehidupan — farm.js
// Bertani: cangkul, tanam benih, siram, panen. Petak tumbuh per hari yang
// disiram (atau hujan), dan hanya di musim yang cocok.
import { CROPS } from './config.js';
import { seasonOf } from './world.js';

export function plotAt(world, tx, ty) {
  return world.plots.find((p) => p.x === tx && p.y === ty) || null;
}

export function canPlant(cropId, day) {
  return CROPS[cropId].seasons.includes(seasonOf(day));
}

export function farmAction(world, plot, seedId) {
  const p = world.player;
  if (!plot) return { ok: false, msg: 'Bukan petak ladang.' };
  if (plot.state === 'untilled') {
    plot.state = 'tilled';
    p.energy = Math.max(0, p.energy - 2);
    return { ok: true, sfx: 'dig', msg: 'Tanah dicangkul. Siap ditanam!' };
  }
  if (!plot.crop) {
    if (!seedId) return { ok: false, msg: 'Pilih benih dulu (tekan 1-5).' };
    const crop = CROPS[seedId];
    if (!canPlant(seedId, world.day)) {
      return { ok: false, msg: `${crop.name} tidak tumbuh di musim ini.` };
    }
    const key = `benih_${seedId}`;
    if ((world.inventory[key] || 0) <= 0) return { ok: false, msg: `Kamu tidak punya ${crop.name} (beli di Toko Benih).` };
    world.inventory[key] -= 1;
    plot.crop = seedId;
    plot.growth = 0;
    p.energy = Math.max(0, p.energy - 1);
    return { ok: true, sfx: 'plant', msg: `${crop.name} ditanam! Siram tiap hari.` };
  }
  if (plot.crop && plot.growth < CROPS[plot.crop].days) {
    if (plot.watered) return { ok: false, msg: 'Sudah disiram hari ini.' };
    if ((world.inventory.penyiram || 0) <= 0) return { ok: false, msg: 'Kamu butuh Penyiram Tanaman untuk menyiram!' };
    plot.watered = true;
    plot.state = 'wet';
    p.energy = Math.max(0, p.energy - 1);
    return { ok: true, sfx: 'water', msg: 'Tanaman disiram.' };
  }
  if (plot.crop && plot.growth >= CROPS[plot.crop].days) {
    const crop = CROPS[plot.crop];
    const key = `panen_${plot.crop}`;
    world.inventory[key] = (world.inventory[key] || 0) + 1;
    world.stats.harvested += 1;
    plot.crop = null;
    plot.growth = 0;
    plot.watered = false;
    plot.state = 'tilled';
    p.energy = Math.max(0, p.energy - 1);
    return { ok: true, sfx: 'coin', msg: `Panen ${crop.name}! (+1 di tas, jual di pasar)` };
  }
  return { ok: false, msg: '' };
}

export function cropStage(plot) {
  if (!plot.crop) return -1;
  const days = CROPS[plot.crop].days;
  if (plot.growth >= days) return 2;
  if (plot.growth >= Math.ceil(days / 2)) return 1;
  return 0;
}

export function addPlots(world, count) {
  // Perluas ladang: petak baru di sebelah kanan petak lama.
  const startX = 12;
  let added = 0;
  for (let i = 0; i < count; i += 1) {
    const x = startX + (added % 3);
    const y = 6 + Math.floor(added / 3);
    if (world.plots.some((p) => p.x === x && p.y === y)) continue;
    world.terrain[y][x] = 'soil';
    world.plots.push({ x, y, state: 'untilled', crop: null, growth: 0, watered: false });
    added += 1;
  }
  return added;
}
