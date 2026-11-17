// Desa Kehidupan 3D — world.js
// Dunia game: peta desa (ladang, desa, danau, laut, hutan tambang, kota,
// sekolah, taman), jam real-time, kalender musim, cuaca, pergerakan pemain,
// tidur, dan skor.
//
// Logika dan angka SAMA PERSIS dengan versi 2D. Koordinat logika tetap
// ruang pixel/tile (TILE=32) seperti 2D; render3d.js yang memetakan ke
// koordinat dunia Three.js. Bedanya dari 2D: pergerakan mendukung joystick
// virtual (input.joyX/joyY) dan kamera 2D dihapus (kamera 3D mengikuti
// pemain di render3d.js).
import {
  TILE, MAP_W, MAP_H, SECONDS_PER_HOUR, DAY_START_HOUR, DAY_END_HOUR,
  DAYS_PER_SEASON, SEASONS, WEATHERS, YEAR_DAYS, WIN_GOLD, START_GOLD,
  START_ITEMS, NPCS, FESTIVALS,
} from './config.js';
import { mulberry32 } from './random.js';

export const T = {
  GRASS: 'grass', PATH: 'path', WATER: 'water', SAND: 'sand',
  SOIL: 'soil', FLOOR: 'floor', TREE: 'tree', PINE: 'pine', ROCK: 'rock',
  FLOWER: 'flower', WELL: 'well', STALL: 'stall', HOUSE: 'house',
};

function blankGrid(fill) {
  const g = [];
  for (let y = 0; y < MAP_H; y += 1) g.push(new Array(MAP_W).fill(fill));
  return g;
}

function rect(g, x0, y0, x1, y1, v) {
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
    if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) g[y][x] = v;
  }
}

function ellipse(g, cx, cy, rx, ry, v) {
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1 && x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) g[y][x] = v;
    }
  }
}

export function createWorld(seed = 1) {
  const rng = mulberry32(seed);
  const terrain = blankGrid(T.GRASS);
  const solid = blankGrid(false);
  const decor = blankGrid(null); // 'tree' | 'pine' | 'rock' | 'flower' | null

  // Danau (kanan atas) dan laut (kanan bawah) + pantai pasir.
  ellipse(terrain, 43, 8, 7, 5, T.WATER);
  rect(terrain, 38, 28, 51, 35, T.WATER);
  rect(terrain, 37, 26, 51, 27, T.SAND);
  rect(terrain, 36, 26, 36, 35, T.SAND);
  // Air tidak bisa dilalui.
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      if (terrain[y][x] === T.WATER) solid[y][x] = true;
    }
  }

  // Jalan utama.
  rect(terrain, 1, 13, 51, 13, T.PATH);
  rect(terrain, 1, 17, 51, 17, T.PATH);
  rect(terrain, 1, 25, 51, 25, T.PATH);
  rect(terrain, 15, 1, 15, 35, T.PATH);
  rect(terrain, 34, 13, 34, 27, T.PATH);

  // Alun-alun desa.
  rect(terrain, 20, 14, 26, 16, T.FLOOR);
  // Lantai sekolah & balai.
  rect(terrain, 19, 19, 28, 19, T.FLOOR);

  // Sumur di ladang.
  terrain[4][13] = T.WELL;
  solid[4][13] = true;

  // Bangunan: x, y (petak kiri-atas), 3x3 petak.
  const buildings = [
    { id: 'rumah', name: 'Rumahmu', kind: 'mid', x: 4, y: 3, door: { x: 5, y: 6 } },
    { id: 'tani', name: 'Rumah Pak Tani', kind: 'poor', x: 19, y: 4, door: { x: 20, y: 7 } },
    { id: 'sari', name: 'Rumah Bu Sari', kind: 'mid', x: 25, y: 4, door: { x: 26, y: 7 } },
    { id: 'rani', name: 'Rumah Rani', kind: 'mid', x: 22, y: 10, door: { x: 23, y: 13 } },
    { id: 'dimas', name: 'Rumah Dimas', kind: 'rich', x: 29, y: 10, door: { x: 30, y: 13 } },
    { id: 'murni', name: 'Rumah Nek Murni', kind: 'poor', x: 16, y: 10, door: { x: 17, y: 13 } },
    { id: 'rt', name: 'Balai Desa', kind: 'rich', x: 28, y: 15, door: { x: 29, y: 18 } },
    { id: 'sekolah', name: 'Sekolah Desa', kind: 'rich', x: 20, y: 20, door: { x: 21, y: 23 } },
    { id: 'tokoBenih', name: 'Toko Benih', kind: 'mid', x: 36, y: 17, door: { x: 37, y: 20 } },
    { id: 'tokoUmum', name: 'Toko Umum', kind: 'mid', x: 42, y: 17, door: { x: 43, y: 20 } },
    { id: 'balaiKota', name: 'Kantor Kota', kind: 'rich', x: 39, y: 21, door: { x: 40, y: 24 } },
  ];
  for (const b of buildings) {
    for (let y = b.y; y < b.y + 3; y += 1) {
      for (let x = b.x; x < b.x + 3; x += 1) {
        terrain[y][x] = T.HOUSE;
        solid[y][x] = true;
      }
    }
  }

  // Petak ladang awal (8 petak) di depan rumah pemain.
  // Baris pertama sudah dicangkul — modal awal petani baru.
  const plots = [];
  for (let y = 0; y < 2; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const px = 6 + x;
      const py = 6 + y;
      terrain[py][px] = T.SOIL;
      plots.push({ x: px, y: py, state: y === 0 ? 'tilled' : 'untilled', crop: null, growth: 0, watered: false });
    }
  }

  // Kandang hewan (kiri bawah ladang).
  const pen = { x0: 2, y0: 8, x1: 5, y1: 11 };

  // Titik galian tambang (hutan kiri bawah).
  const digSpots = [
    { x: 5, y: 24, available: true }, { x: 8, y: 27, available: true },
    { x: 10, y: 22, available: true }, { x: 6, y: 29, available: true },
  ];
  for (const d of digSpots) terrain[d.y][d.x] = T.SOIL;

  // Pohon, batu, bunga tersebar (hindari jalan, air, bangunan, petak).
  const isFree = (x, y) => {
    if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return false;
    const t = terrain[y][x];
    if (t !== T.GRASS) return false;
    if (solid[y][x] || decor[y][x]) return false;
    for (const b of buildings) if (x >= b.x - 1 && x <= b.x + 3 && y >= b.y - 1 && y <= b.y + 3) return false;
    if (x >= 5 && x <= 12 && y >= 5 && y <= 8) return false;
    if (x >= pen.x0 - 1 && x <= pen.x1 + 1 && y >= pen.y0 - 1 && y <= pen.y1 + 1) return false;
    if (x >= 23 && x <= 28 && y >= 21 && y <= 25) return false; // taman
    return true;
  };
  let trees = 0;
  while (trees < 64) {
    const x = 1 + Math.floor(rng() * (MAP_W - 2));
    const y = 1 + Math.floor(rng() * (MAP_H - 2));
    if (!isFree(x, y)) continue;
    decor[y][x] = rng() < 0.25 ? 'pine' : 'tree';
    solid[y][x] = true;
    trees += 1;
  }
  let rocks = 0;
  while (rocks < 14) {
    const x = 1 + Math.floor(rng() * (MAP_W - 2));
    const y = 1 + Math.floor(rng() * (MAP_H - 2));
    if (!isFree(x, y)) continue;
    decor[y][x] = 'rock';
    solid[y][x] = true;
    rocks += 1;
  }
  let flowers = 0;
  while (flowers < 42) {
    const x = 1 + Math.floor(rng() * (MAP_W - 2));
    const y = 1 + Math.floor(rng() * (MAP_H - 2));
    if (!isFree(x, y)) continue;
    decor[y][x] = 'flower';
    flowers += 1;
  }

  const npcs = NPCS.map((def) => ({
    ...def,
    x: (def.hx + 1) * TILE,
    y: (def.hy + 2) * TILE,
    tx: null, ty: null, idle: 0,
    hearts: def.id === 'tani' ? 1 : 0,
    talkedToday: false,
    home: true,
  }));

  const world = {
    seed, rng,
    terrain, solid, decor, buildings, plots, pen, digSpots, npcs,
    day: 1, hour: DAY_START_HOUR, minute: 0,
    weather: 'Cerah',
    gold: START_GOLD,
    inventory: { ...START_ITEMS },
    player: {
      x: 7 * TILE, y: 5 * TILE, dir: 'down', moving: false,
      energy: 100, hunger: 100, thirst: 100, health: 100,
      married: false, spouse: null, childStage: 0, childBornDay: 0, childName: '',
    },
    animals: [],
    tasks: {},
    fish: { active: false, phase: 'idle', timer: 0, caught: null, pro: false },
    flags: { landBought: false, bigHouse: false, pancingPro: false, cangkulBaja: false, festivalDoneToday: false },
    stats: { harvested: 0, fishCaught: 0, gemsFound: 0, earned: 0, gifted: 0, talked: 0 },
    camera: { x: 0, y: 0 },
    message: null, messageTimer: 0,
    timeScale: 1,
  };
  rollWeather(world);
  return world;
}

export function seasonOf(day) {
  return Math.floor((day - 1) / DAYS_PER_SEASON) % 4;
}

export function festivalOf(day) {
  if (day % DAYS_PER_SEASON !== 0) return null;
  return FESTIVALS[seasonOf(day)];
}

export function rollWeather(world) {
  const r = world.rng();
  // Musim Semi (hari 1-7) didominasi hujan: tanaman tersiram otomatis dan
  // pemain baru bisa fokus cari duit dulu. Tidak ada Badai di musim Semi.
  if (seasonOf(world.day) === 0) {
    world.weather = r < 0.75 ? 'Hujan' : r < 0.88 ? 'Berawan' : 'Cerah';
    return;
  }
  world.weather = r < 0.62 ? 'Cerah' : r < 0.82 ? 'Hujan' : r < 0.93 ? 'Berawan' : 'Badai';
  if (world.weather === 'Badai' && seasonOf(world.day) === 3) world.weather = 'Cerah';
}

export function isWalkable(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  return !world.solid[ty][tx];
}

export function tileAt(world, px, py) {
  return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
}

export function nearWater(world, px, py) {
  const { x, y } = tileAt(world, px, py);
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H && world.terrain[ny][nx] === T.WATER) return true;
    }
  }
  return false;
}

export function updatePlayer(world, dt, input) {
  const p = world.player;
  let dx = 0;
  let dy = 0;
  if (input.isDown('w', 'ArrowUp')) dy -= 1;
  if (input.isDown('s', 'ArrowDown')) dy += 1;
  if (input.isDown('a', 'ArrowLeft')) dx -= 1;
  if (input.isDown('d', 'ArrowRight')) dx += 1;
  // Joystick virtual (sentuh): vektor analog -1..1, atas = maju (dy negatif).
  if (input.joyActive) {
    dx += input.joyX;
    dy += input.joyY;
  }
  p.moving = dx !== 0 || dy !== 0;
  if (p.moving) {
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 'right' : 'left';
    else p.dir = dy > 0 ? 'down' : 'up';
    const len = Math.hypot(dx, dy) || 1;
    const speed = 150;
    const nx = p.x + (dx / len) * speed * dt;
    const ny = p.y + (dy / len) * speed * dt;
    const r = 10;
    if (isWalkable(world, Math.floor((nx + Math.sign(dx) * r) / TILE), Math.floor(p.y / TILE))
      && isWalkable(world, Math.floor((nx + Math.sign(dx) * r) / TILE), Math.floor((p.y + r * 0.6) / TILE))
      && isWalkable(world, Math.floor((nx + Math.sign(dx) * r) / TILE), Math.floor((p.y - r * 0.6) / TILE))) p.x = nx;
    if (isWalkable(world, Math.floor(p.x / TILE), Math.floor((ny + Math.sign(dy) * r) / TILE))
      && isWalkable(world, Math.floor((p.x + r * 0.6) / TILE), Math.floor((ny + Math.sign(dy) * r) / TILE))
      && isWalkable(world, Math.floor((p.x - r * 0.6) / TILE), Math.floor((ny + Math.sign(dy) * r) / TILE))) p.y = ny;
    p.energy = Math.max(0, p.energy - dt * 0.25);
  }
  // Kamera 3D mengikuti pemain di render3d.js; simpan posisi pemain di sini
  // untuk kompatibilitas adegan screenshot.
  world.camera.x = p.x;
  world.camera.y = p.y;
}

export function tickClock(world, dt) {
  const minutes = dt * (60 / SECONDS_PER_HOUR) * world.timeScale;
  world.minute += minutes;
  while (world.minute >= 60) {
    world.minute -= 60;
    world.hour += 1;
    drainNeeds(world, 1);
  }
  if (world.hour >= DAY_END_HOUR) {
    // Kelelahan: otomatis tidur.
    sleep(world, false);
  }
}

function drainNeeds(world, hours) {
  const p = world.player;
  p.hunger = Math.max(0, p.hunger - 2.2 * hours);
  p.thirst = Math.max(0, p.thirst - 3 * hours);
  p.energy = Math.max(0, p.energy - 2 * hours);
  if (p.hunger <= 0 || p.thirst <= 0) p.health = Math.max(0, p.health - 4 * hours);
  if (p.health <= 0) faint(world);
}

export function faint(world) {
  const p = world.player;
  const lost = Math.floor(world.gold * 0.1);
  world.gold -= lost;
  world.message = `Kamu pingsan! Seorang warga mengantarmu pulang. Kehilangan ${lost}G.`;
  world.messageTimer = 6;
  advanceDay(world);
  p.health = 60;
  p.energy = 70;
  p.hunger = 60;
  p.thirst = 60;
}

export function sleep(world, byBed) {
  const p = world.player;
  if (byBed) {
    p.energy = 100;
    p.health = Math.min(100, p.health + 30);
    p.hunger = Math.max(0, p.hunger - 15);
    p.thirst = Math.max(0, p.thirst - 20);
  }
  advanceDay(world);
}

export function advanceDay(world) {
  world.day += 1;
  world.hour = DAY_START_HOUR;
  world.minute = 0;
  world.flags.festivalDoneToday = false;
  rollWeather(world);
  // Tanaman tumbuh: hari yang disiram (atau hujan) dihitung.
  const rain = world.weather === 'Hujan' || world.weather === 'Badai';
  for (const plot of world.plots) {
    if (plot.crop && plot.state !== 'untilled') {
      if (plot.watered || rain) plot.growth += 1;
      plot.watered = rain;
      plot.state = rain ? 'wet' : 'tilled';
    }
  }
  // Hewan: produksi & risiko sakit.
  for (const a of world.animals) {
    a.produceReady = a.fed && !a.sick;
    a.fed = false;
    if (!a.sick && world.rng() < 0.08) a.sick = true;
  }
  // Titik galian pulih.
  for (const d of world.digSpots) d.available = true;
  // NPC: reset obrolan harian, pulang ke rumah.
  for (const n of world.npcs) {
    n.talkedToday = false;
    n.x = (n.hx + 1) * TILE;
    n.y = (n.hy + 2) * TILE;
    n.tx = null; n.ty = null;
  }
  // Anak tumbuh.
  const p = world.player;
  if (p.childStage > 0) {
    const age = world.day - p.childBornDay;
    p.childStage = age >= 14 ? 3 : age >= 7 ? 2 : 1;
  }
  // Pemain kembali ke rumah.
  p.x = 7 * TILE;
  p.y = 5 * TILE;
}

export function updateNPCs(world, dt) {
  const hour = world.hour;
  for (const n of world.npcs) {
    const atHome = hour < 8 || hour >= 20;
    if (atHome) {
      n.tx = (n.hx + 1) * TILE;
      n.ty = (n.hy + 2) * TILE;
    } else if (n.tx === null || n.idle > 0) {
      n.idle -= dt;
      if (n.idle <= 0 && world.rng() < 0.02) {
        const range = n.id === 'kiki' ? 6 : 4;
        const nx = (n.hx + 1 + Math.floor((world.rng() * 2 - 1) * range)) * TILE;
        const ny = (n.hy + 2 + Math.floor((world.rng() * 2 - 1) * range)) * TILE;
        if (isWalkable(world, Math.floor(nx / TILE), Math.floor(ny / TILE))) {
          n.tx = nx; n.ty = ny;
        }
      }
    }
    if (n.tx !== null) {
      const dx = n.tx - n.x;
      const dy = n.ty - n.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        n.tx = null;
        n.idle = 2 + world.rng() * 4;
      } else {
        n.x += (dx / dist) * 42 * dt;
        n.y += (dy / dist) * 42 * dt;
      }
    }
  }
}

export function scoreOf(world) {
  const hearts = world.npcs.reduce((s, n) => s + n.hearts, 0);
  return world.gold + hearts * 200 + world.stats.harvested * 50 + world.stats.fishCaught * 40
    + world.stats.gemsFound * 100 + (world.player.married ? 2000 : 0) + world.player.childStage * 1000;
}

export function gameResult(world) {
  if (world.flags.bigHouse) return 'win';
  if (world.day > YEAR_DAYS) return 'lose';
  return null;
}
