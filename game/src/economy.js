// Desa Kehidupan — economy.js
// Ekonomi: nama barang, harga jual, toko (beli) dan pasar (jual).
import { CROPS, FISH, GEMS, ANIMALS, SHOP } from './config.js';
import { addPlots } from './farm.js';
import { buyAnimal } from './animals.js';

export function itemName(id) {
  if (id.startsWith('benih_')) return `Benih ${CROPS[id.slice(6)].name}`;
  if (id.startsWith('panen_')) return CROPS[id.slice(6)].name;
  if (id.startsWith('ikan_')) return FISH[id.slice(5)].name;
  if (id.startsWith('permata_')) return GEMS[id.slice(8)].name;
  if (id === 'telur') return 'Telur';
  if (id === 'susu') return 'Susu';
  if (id === 'penyiram') return 'Penyiram Tanaman';
  if (id === 'ember_perah') return 'Ember Perah';
  for (const cat of Object.values(SHOP)) {
    const found = cat.find((i) => i.id === id);
    if (found) return found.name;
  }
  return id;
}

export function sellPrice(id, world) {
  if (id.startsWith('panen_')) return CROPS[id.slice(6)].sell;
  if (id.startsWith('ikan_')) return FISH[id.slice(5)].sell;
  if (id.startsWith('permata_')) return GEMS[id.slice(8)].sell;
  if (id === 'telur') return 40;
  if (id === 'susu') return 120;
  return 0;
}

export function sellableItems(world) {
  return Object.entries(world.inventory)
    .filter(([id, n]) => n > 0 && sellPrice(id, world) > 0)
    .map(([id, n]) => ({ id, name: itemName(id), count: n, price: sellPrice(id, world) }));
}

export function sellItem(world, id, count = 1) {
  const have = world.inventory[id] || 0;
  if (have < count) return { ok: false, msg: 'Jumlah tidak cukup.' };
  let price = sellPrice(id, world) * count;
  // Festival Panen: harga panen 2x lipat.
  if (world.day % 7 === 0 && Math.floor((world.day - 1) / 7) % 4 === 2 && id.startsWith('panen_')) price *= 2;
  world.inventory[id] -= count;
  world.gold += price;
  world.stats.earned += price;
  return { ok: true, sfx: 'coin', msg: `Terjual ${count}x ${itemName(id)} = ${price}G` };
}

export function sellAll(world) {
  let total = 0;
  let n = 0;
  for (const item of sellableItems(world)) {
    total += item.price * item.count;
    n += item.count;
    world.inventory[item.id] = 0;
  }
  if (n === 0) return { ok: false, msg: 'Tidak ada barang yang bisa dijual.' };
  world.gold += total;
  world.stats.earned += total;
  return { ok: true, sfx: 'coin', msg: `Terjual ${n} barang = ${total}G` };
}

export function shopItem(id) {
  for (const cat of Object.values(SHOP)) {
    const found = cat.find((i) => i.id === id);
    if (found) return found;
  }
  return null;
}

export function buyItem(world, id) {
  const item = shopItem(id);
  if (!item) return { ok: false, msg: 'Barang tidak dikenal.' };
  if (world.gold < item.price) return { ok: false, msg: `Uang tidak cukup. Perlu ${item.price}G.` };
  // Barang spesial (bukan stok tas).
  if (id === 'tanah') {
    if (world.flags.landBought) return { ok: false, msg: 'Tanah sudah diperluas.' };
    world.gold -= item.price;
    world.flags.landBought = true;
    addPlots(world, 6);
    return { ok: true, sfx: 'buy', msg: 'Ladang diperluas +6 petak!' };
  }
  if (id === 'rumah_besar') {
    world.gold -= item.price;
    world.flags.bigHouse = true;
    return { ok: true, sfx: 'win', msg: 'Kamu membeli RUMAH BESAR!' };
  }
  if (id === 'cincin') {
    world.gold -= item.price;
    world.inventory.cincin = (world.inventory.cincin || 0) + 1;
    return { ok: true, sfx: 'buy', msg: 'Cincin lamaran dibeli. Lamar Rani saat hatinya penuh!' };
  }
  if (id === 'pancing_baru') {
    if (world.flags.pancingPro) return { ok: false, msg: 'Kamu sudah punya Pancingan Pro.' };
    world.gold -= item.price;
    world.flags.pancingPro = true;
    return { ok: true, sfx: 'buy', msg: 'Pancingan Pro! Ikan langka lebih mudah didapat.' };
  }
  if (id === 'cangkul_baja') {
    if (world.flags.cangkulBaja) return { ok: false, msg: 'Kamu sudah punya Cangkul Baja.' };
    world.gold -= item.price;
    world.flags.cangkulBaja = true;
    return { ok: true, sfx: 'buy', msg: 'Cangkul Baja! Mencangkul tidak lagi melelahkan.' };
  }
  if (id.startsWith('beli_')) {
    const kind = id.slice(5);
    world.gold -= item.price;
    buyAnimal(world, kind);
    return { ok: true, sfx: 'buy', msg: `${ANIMALS[kind].name} baru di kandang! Beri pakan tiap hari.` };
  }
  world.gold -= item.price;
  world.inventory[id] = (world.inventory[id] || 0) + 1;
  return { ok: true, sfx: 'buy', msg: `Beli ${item.name} (${item.price}G).` };
}
