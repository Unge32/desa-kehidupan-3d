// Desa Kehidupan — animals.js
// Ternak: beli di pasar, beri pakan tiap hari, panen hasil (telur/susu),
// hewan bisa sakit dan perlu obat.
import { ANIMALS } from './config.js';

export function buyAnimal(world, kind) {
  const def = ANIMALS[kind];
  const pen = world.pen;
  const x = (pen.x0 + 1 + Math.floor(world.rng() * (pen.x1 - pen.x0 - 1))) * 32 + 16;
  const y = (pen.y0 + 1 + Math.floor(world.rng() * (pen.y1 - pen.y0 - 1))) * 32 + 16;
  world.animals.push({
    kind, x, y, tx: null, ty: null, idle: 0,
    fed: false, sick: false, produceReady: false, happy: 3,
  });
  return def;
}

export function feedAnimal(world, animal) {
  const def = ANIMALS[animal.kind];
  const feedKey = def.feed === 'Pakan Ayam' ? 'pakan_ayam' : 'rumput';
  if ((world.inventory[feedKey] || 0) <= 0) {
    return { ok: false, msg: `Tidak ada ${def.feed}. Beli di Toko Umum.` };
  }
  world.inventory[feedKey] -= 1;
  animal.fed = true;
  animal.happy = Math.min(5, animal.happy + 1);
  return { ok: true, sfx: 'eat', msg: `${def.name} makan dengan lahap.` };
}

export function collectAnimal(world, animal) {
  const def = ANIMALS[animal.kind];
  if (!animal.produceReady) {
    if (animal.sick) return { ok: false, msg: `${def.name} sedang sakit. Beri Obat Hewan.` };
    return { ok: false, msg: animal.fed ? 'Hasilnya baru ada besok pagi.' : `${def.name} belum diberi pakan hari ini.` };
  }
  if (def.product !== 'Telur' && (world.inventory.ember_perah || 0) <= 0) {
    return { ok: false, msg: 'Kamu butuh Ember Perah untuk memerah susu.' };
  }
  const key = def.product === 'Telur' ? 'telur' : 'susu';
  world.inventory[key] = (world.inventory[key] || 0) + 1;
  animal.produceReady = false;
  return { ok: true, sfx: 'coin', msg: `Dapat 1 ${def.product}!` };
}

export function healAnimal(world, animal) {
  if (!animal.sick) return { ok: false, msg: `${ANIMALS[animal.kind].name} sehat-sehat saja.` };
  if ((world.inventory.obat_hewan || 0) <= 0) {
    return { ok: false, msg: 'Tidak ada Obat Hewan. Beli di Toko Umum.' };
  }
  world.inventory.obat_hewan -= 1;
  animal.sick = false;
  return { ok: true, sfx: 'heart', msg: `${ANIMALS[animal.kind].name} sembuh!` };
}

export function updateAnimals(world, dt) {
  const pen = world.pen;
  for (const a of world.animals) {
    if (a.tx === null || a.idle > 0) {
      a.idle -= dt;
      if (a.idle <= 0 && world.rng() < 0.01) {
        a.tx = (pen.x0 * 32 + 20 + world.rng() * ((pen.x1 - pen.x0) * 32 - 40));
        a.ty = (pen.y0 * 32 + 20 + world.rng() * ((pen.y1 - pen.y0) * 32 - 40));
      }
    }
    if (a.tx !== null) {
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 3) {
        a.tx = null;
        a.idle = 2 + world.rng() * 5;
      } else {
        a.x += (dx / dist) * 22 * dt;
        a.y += (dy / dist) * 22 * dt;
      }
    }
  }
}
