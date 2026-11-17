// Desa Kehidupan 3D — render3d.js
// Scene Three.js low-poly prosedural (semua aset original, dibuat dari
// geometri dasar): desa third-person dengan ladang, rumah NPC 3 tier,
// danau + laut, tambang, pasar, sekolah, taman, musim, cuaca, dan
// siklus siang/malam. Tanpa shadow map (performa HP), pixelRatio dibatasi.
import * as THREE from 'three';
import { TILE, MAP_W, MAP_H, CROPS, SEASONS } from './config.js';
import { mulberry32 } from './random.js';
import { seasonOf } from './world.js';

export const CELL = 2; // 1 petak tile = 2 unit dunia

// Logika game memakai ruang pixel (TILE=32); ini pemetaannya ke dunia 3D.
export function toWorldX(px) { return (px / TILE - MAP_W / 2) * CELL; }
export function toWorldZ(py) { return (py / TILE - MAP_H / 2) * CELL; }

const SEASON_GRASS = ['#5dbb63', '#a8b545', '#d98a3d', '#e8e8e8'];
const SEASON_LEAF = ['#2f9e44', '#7fae2e', '#e07b39', '#dfe8ee'];
const SEASON_SKY = [
  { h: 6, c: '#ffd9a0' }, { h: 8, c: '#aee2ff' }, { h: 12, c: '#87ceeb' },
  { h: 17, c: '#ffd27d' }, { h: 19, c: '#ff9a76' }, { h: 20, c: '#2c3e6b' },
  { h: 24, c: '#0b1026' },
];

function lerpColor(a, b, t) {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, t);
}

function skyColorForHour(hour) {
  let prev = SEASON_SKY[0];
  let next = SEASON_SKY[SEASON_SKY.length - 1];
  for (let i = 0; i < SEASON_SKY.length; i += 1) {
    if (SEASON_SKY[i].h <= hour) prev = SEASON_SKY[i];
    if (SEASON_SKY[i].h >= hour) { next = SEASON_SKY[i]; break; }
  }
  if (next.h === prev.h) return new THREE.Color(prev.c);
  const t = (hour - prev.h) / (next.h - prev.h);
  return lerpColor(prev.c, next.c, Math.max(0, Math.min(1, t)));
}

function makePerson(color, opts = {}) {
  const g = new THREE.Group();
  const scale = opts.scale || 1;
  const skin = new THREE.MeshLambertMaterial({ color: '#f2c89b' });
  const shirt = new THREE.MeshLambertMaterial({ color });
  const pants = new THREE.MeshLambertMaterial({ color: '#3d5a80' });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.45), shirt);
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skin);
  head.position.y = 1.5;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.24), pants);
  legL.position.set(-0.18, 0.25, 0);
  const legR = legL.clone();
  legR.position.x = 0.18;
  g.add(body, head, legL, legR);
  if (opts.hat) {
    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.3, 10),
      new THREE.MeshLambertMaterial({ color: '#e9c46a' }),
    );
    hat.position.y = 1.82;
    g.add(hat);
  }
  if (opts.hair) {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.33, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshLambertMaterial({ color: opts.hair }),
    );
    hair.position.y = 1.53;
    g.add(hair);
  }
  g.scale.setScalar(scale);
  g.userData = { legL, legR, body, head };
  return g;
}

function makeAnimalMesh(kind) {
  const g = new THREE.Group();
  const colors = { ayam: '#f8f9fa', kambing: '#e9ecef', sapi: '#fff3e0', kerbau: '#6c757d' };
  const sizes = { ayam: 0.55, kambing: 0.9, sapi: 1.25, kerbau: 1.35 };
  const mat = new THREE.MeshLambertMaterial({ color: colors[kind] || '#ffffff' });
  const s = sizes[kind] || 1;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.55 * s, 0.55 * s), mat);
  body.position.y = 0.45 * s;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32 * s, 0.32 * s, 0.32 * s), mat);
  head.position.set(0.55 * s, 0.75 * s, 0);
  g.add(body, head);
  if (kind === 'ayam') {
    const comb = new THREE.Mesh(
      new THREE.ConeGeometry(0.1 * s, 0.18 * s, 6),
      new THREE.MeshLambertMaterial({ color: '#e63946' }),
    );
    comb.position.set(0.55 * s, 0.98 * s, 0);
    g.add(comb);
  } else {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.07 * s, 0.25 * s, 6),
      new THREE.MeshLambertMaterial({ color: '#f4f1de' }),
    );
    horn.position.set(0.5 * s, 0.95 * s, 0.14 * s);
    horn.rotation.z = -0.4;
    g.add(horn);
  }
  g.userData = { body };
  return g;
}

export class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#87ceeb');
    this.scene.fog = new THREE.Fog('#87ceeb', 55, 130);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
    this.camera.position.set(0, 16, 14);
    this.hemi = new THREE.HemisphereLight(0xbfd9ff, 0x4a7c59, 0.9);
    this.sun = new THREE.DirectionalLight(0xfff2cc, 1.1);
    this.sun.position.set(30, 40, 10);
    this.scene.add(this.hemi, this.sun);
    // Semua objek dunia masuk worldGroup supaya rebuild (restart game)
    // bisa membersihkan scene lama — tanpa ini objek menumpuk dan frame
    // melambat tiap reset.
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);
    this.built = false;
    this.lastSeason = -1;
    this.plotMeshes = new Map();
    this.spotMeshes = [];
    this.npcMeshes = new Map();
    this.animalMeshes = new Map();
    this.cropSig = new Map();
    this.rain = null;
    this.sunMesh = null;
    this.moonMesh = null;
    this.lakeMesh = null;
    this.seaMesh = null;
    this.playerMesh = null;
    this.childMesh = null;
    this.groundMat = null;
    this.groundCanvas = null;
    this.groundCtx = null;
    this.world = null;
    this.camPos = new THREE.Vector3(0, 16, 14);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Portrait HP: kamera lebih jauh + FOV lebih lebar supaya desa terlihat.
    this.camera.fov = this.camera.aspect < 1 ? 68 : 55;
    this.camera.updateProjectionMatrix();
  }

  // Hapus semua objek dunia lama (dipakai tiap rebuild/restart).
  clearWorld() {
    if (!this.worldGroup) return;
    this.worldGroup.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m.map) m.map.dispose();
          m.dispose();
        }
      }
    });
    this.worldGroup.clear();
    this.plotMeshes = new Map();
    this.cropSig = new Map();
    this.spotMeshes = [];
    this.npcMeshes = new Map();
    this.animalMeshes = new Map();
    this.rain = null;
    this.sunMesh = null;
    this.moonMesh = null;
    this.lakeMesh = null;
    this.seaMesh = null;
    this.playerMesh = null;
    this.childMesh = null;
    this.bobber = null;
    this.groundMat = null;
    this.groundCanvas = null;
    this.groundCtx = null;
    this.leafMat = null;
    this.plotGroup = null;
  }

  // --- Bangun scene statis dari data dunia ber-seed ---
  build(world) {
    this.clearWorld();
    this.world = world;
    const rng = mulberry32(world.seed * 7919 + 13);
    const scene = this.worldGroup;

    // Tanah: satu bidang dengan tekstur canvas dari grid terrain.
    this.groundCanvas = document.createElement('canvas');
    this.groundCanvas.width = MAP_W * 20;
    this.groundCanvas.height = MAP_H * 20;
    this.groundCtx = this.groundCanvas.getContext('2d');
    const tex = new THREE.CanvasTexture(this.groundCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.groundMat = new THREE.MeshLambertMaterial({ map: tex });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_W * CELL, MAP_H * CELL),
      this.groundMat,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);
    this.paintGround(world);

    // Air: danau (elips) + laut (persegi), sedikit di atas tanah.
    const waterMat = new THREE.MeshLambertMaterial({ color: '#2a9dcc', transparent: true, opacity: 0.9 });
    this.lakeMesh = new THREE.Mesh(new THREE.CircleGeometry(1, 28), waterMat);
    this.lakeMesh.rotation.x = -Math.PI / 2;
    this.lakeMesh.scale.set(7 * CELL, 5 * CELL, 1);
    this.lakeMesh.position.set(toWorldX(43 * TILE), 0.06, toWorldZ(8 * TILE));
    scene.add(this.lakeMesh);
    this.seaMesh = new THREE.Mesh(new THREE.PlaneGeometry(14 * CELL, 8 * CELL), waterMat);
    this.seaMesh.rotation.x = -Math.PI / 2;
    this.seaMesh.position.set(toWorldX(44.5 * TILE), 0.06, toWorldZ(31.5 * TILE));
    scene.add(this.seaMesh);

    // Bangunan: badan kotak + atap piramida + pintu.
    const roofColors = { poor: '#8d6e63', mid: '#bc4749', rich: '#3d5a80' };
    const wallColors = { poor: '#d9c7a7', mid: '#f4f1de', rich: '#ffe8a3' };
    for (const b of world.buildings) {
      const g = new THREE.Group();
      const w = 3 * CELL;
      const h = b.kind === 'rich' ? 3.4 : 2.6;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, w),
        new THREE.MeshLambertMaterial({ color: wallColors[b.kind] }),
      );
      body.position.y = h / 2;
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(w * 0.78, 1.8, 4),
        new THREE.MeshLambertMaterial({ color: roofColors[b.kind] }),
      );
      roof.position.y = h + 0.9;
      roof.rotation.y = Math.PI / 4;
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.5, 0.15),
        new THREE.MeshLambertMaterial({ color: '#5a3520' }),
      );
      door.position.set(0, 0.75, w / 2 + 0.05);
      g.add(body, roof, door);
      g.position.set(toWorldX((b.x + 1.5) * TILE), 0, toWorldZ((b.y + 1.5) * TILE));
      scene.add(g);
    }

    // Sumur.
    const well = new THREE.Group();
    const wellBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1, 1, 10),
      new THREE.MeshLambertMaterial({ color: '#adb5bd' }),
    );
    wellBase.position.y = 0.5;
    const wellRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 0.8, 4),
      new THREE.MeshLambertMaterial({ color: '#bc4749' }),
    );
    wellRoof.position.y = 2.2;
    wellRoof.rotation.y = Math.PI / 4;
    well.add(wellBase, wellRoof);
    well.position.set(toWorldX(13 * TILE), 0, toWorldZ(4 * TILE));
    scene.add(well);

    // Pohon, pinus, batu, bunga (instanced, dari grid decor ber-seed).
    const treeTrunks = [];
    const treeTops = [];
    const pineTops = [];
    const rocks = [];
    const flowers = [];
    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) {
        const d = world.decor[y][x];
        if (!d) continue;
        const wx = toWorldX((x + 0.5) * TILE);
        const wz = toWorldZ((y + 0.5) * TILE);
        if (d === 'tree') { treeTrunks.push([wx, wz]); treeTops.push([wx, wz, 0.9 + rng() * 0.4]); }
        else if (d === 'pine') { treeTrunks.push([wx, wz]); pineTops.push([wx, wz, 0.9 + rng() * 0.4]); }
        else if (d === 'rock') rocks.push([wx, wz, 0.5 + rng() * 0.5]);
        else if (d === 'flower') flowers.push([wx, wz, ['#ff70a6', '#ffd60a', '#ff8c1a', '#c77dff'][Math.floor(rng() * 4)]]);
      }
    }
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: '#7b4b2a' });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeTrunks.length);
    const m4 = new THREE.Matrix4();
    treeTrunks.forEach(([x, z], i) => {
      m4.makeTranslation(x, 0.7, z);
      trunks.setMatrixAt(i, m4);
    });
    scene.add(trunks);
    const topGeo = new THREE.IcosahedronGeometry(1.1, 0);
    const topMat = new THREE.MeshLambertMaterial({ color: SEASON_LEAF[0] });
    this.leafMat = topMat;
    const tops = new THREE.InstancedMesh(topGeo, topMat, treeTops.length);
    treeTops.forEach(([x, z, s], i) => {
      m4.makeScale(s, s, s);
      m4.setPosition(x, 2.1 * s, z);
      tops.setMatrixAt(i, m4);
    });
    scene.add(tops);
    const pineGeo = new THREE.ConeGeometry(1.0, 2.6, 7);
    const pineMat = new THREE.MeshLambertMaterial({ color: '#2d6a4f' });
    const pines = new THREE.InstancedMesh(pineGeo, pineMat, pineTops.length);
    pineTops.forEach(([x, z, s], i) => {
      m4.makeScale(s, s, s);
      m4.setPosition(x, 2.2 * s, z);
      pines.setMatrixAt(i, m4);
    });
    scene.add(pines);
    const rockGeo = new THREE.DodecahedronGeometry(0.6, 0);
    const rockMat = new THREE.MeshLambertMaterial({ color: '#8d99ae' });
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
    rocks.forEach(([x, z, s], i) => {
      m4.makeScale(s, s * 0.7, s);
      m4.setPosition(x, 0.3 * s, z);
      rockMesh.setMatrixAt(i, m4);
    });
    scene.add(rockMesh);
    const flowerGeo = new THREE.SphereGeometry(0.16, 6, 5);
    const flowerMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const flowerMesh = new THREE.InstancedMesh(flowerGeo, flowerMat, flowers.length);
    const col = new THREE.Color();
    flowers.forEach(([x, z, c], i) => {
      m4.makeTranslation(x, 0.22, z);
      flowerMesh.setMatrixAt(i, m4);
      flowerMesh.setColorAt(i, col.set(c));
    });
    scene.add(flowerMesh);

    // Pagar kandang.
    const penMat = new THREE.MeshLambertMaterial({ color: '#8d6e63' });
    const pen = world.pen;
    const fence = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 0.12), penMat);
      bar.position.set((x0 + x1) / 2, 0.4, (z0 + z1) / 2);
      bar.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      scene.add(bar);
    };
    const px0 = toWorldX(pen.x0 * TILE);
    const px1 = toWorldX((pen.x1 + 1) * TILE);
    const pz0 = toWorldZ(pen.y0 * TILE);
    const pz1 = toWorldZ((pen.y1 + 1) * TILE);
    fence(px0, pz0, px1, pz0);
    fence(px0, pz1, px1, pz1);
    fence(px0, pz0, px0, pz1);
    fence(px1, pz0, px1, pz1);

    // Ayunan + perosotan di taman (petak 23-28, 21-25).
    const park = new THREE.Group();
    const poleMat = new THREE.MeshLambertMaterial({ color: '#6c757d' });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), poleMat);
    p1.position.set(-0.8, 1.1, 0);
    const p2 = p1.clone(); p2.position.x = 0.8;
    const barTop = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6), poleMat);
    barTop.rotation.z = Math.PI / 2; barTop.position.y = 2.2;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.4), new THREE.MeshLambertMaterial({ color: '#e07a5f' }));
    seat.position.y = 0.9;
    park.add(p1, p2, barTop, seat);
    const slide = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.12, 2.6),
      new THREE.MeshLambertMaterial({ color: '#f4d35e' }),
    );
    slide.position.set(2.2, 0.9, 0);
    slide.rotation.x = 0.5;
    park.add(slide);
    park.position.set(toWorldX(25.5 * TILE), 0, toWorldZ(23 * TILE));
    scene.add(park);

    // Kios pasar di alun-alun.
    for (const [ox, oz] of [[-2.5, -1], [2.5, -1]]) {
      const stall = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.2), new THREE.MeshLambertMaterial({ color: '#8d6e63' }));
      base.position.y = 0.5;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1.6), new THREE.MeshLambertMaterial({ color: '#e63946' }));
      roof.position.y = 1.7;
      stall.add(base, roof);
      stall.position.set(toWorldX(23 * TILE) + ox, 0, toWorldZ(15 * TILE) + oz);
      scene.add(stall);
    }

    // Petak ladang (dibangun dinamis di render, tapi wadah dibuat di sini).
    this.plotGroup = new THREE.Group();
    scene.add(this.plotGroup);

    // Titik galian: gundukan + penanda berkilau saat tersedia.
    for (const d of world.digSpots) {
      const g = new THREE.Group();
      const mound = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 8, 6),
        new THREE.MeshLambertMaterial({ color: '#6c4a2f' }),
      );
      mound.scale.y = 0.35;
      mound.position.y = 0.1;
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3, 0),
        new THREE.MeshLambertMaterial({ color: '#ffd60a', emissive: '#664d00' }),
      );
      gem.position.y = 0.9;
      g.add(mound, gem);
      g.position.set(toWorldX((d.x + 0.5) * TILE), 0, toWorldZ((d.y + 0.5) * TILE));
      g.userData.gem = gem;
      scene.add(g);
      this.spotMeshes.push({ spot: d, group: g, gem });
    }

    // Matahari & bulan.
    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#ffd60a' }),
    );
    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#e8e8e8' }),
    );
    scene.add(this.sunMesh, this.moonMesh);

    // Hujan: titik-titik jatuh di sekitar pemain.
    const rainCount = 500;
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i += 1) {
      rainPos[i * 3] = (rng() - 0.5) * 50;
      rainPos[i * 3 + 1] = rng() * 22;
      rainPos[i * 3 + 2] = (rng() - 0.5) * 50;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    this.rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
      color: '#9db8d6', size: 0.28, transparent: true, opacity: 0.75, sizeAttenuation: true,
    }));
    this.rain.visible = false;
    scene.add(this.rain);

    // Pemain.
    this.playerMesh = makePerson('#2a9d8f', { hat: true });
    scene.add(this.playerMesh);

    // NPC: satu figur per warga, warna dari config.
    for (const n of world.npcs) {
      const mesh = makePerson(n.color, { hair: n.id === 'kiki' ? '#3d2c1e' : undefined, scale: n.id === 'kiki' ? 0.7 : 1 });
      const heart = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#ff70a6' }),
      );
      heart.position.y = 2.1;
      heart.visible = false;
      mesh.add(heart);
      mesh.userData.heart = heart;
      scene.add(mesh);
      this.npcMeshes.set(n.id, mesh);
    }

    // Anak (muncul setelah menikah + lahir).
    this.childMesh = makePerson('#f4d35e', { scale: 0.55 });
    this.childMesh.visible = false;
    scene.add(this.childMesh);

    // Pelampung pancing.
    this.bobber = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshBasicMaterial({ color: '#ff3b30' }),
    );
    this.bobber.visible = false;
    scene.add(this.bobber);

    this.built = true;
    this.lastSeason = -1;
  }

  paintGround(world) {
    if (!this.groundCtx) return;
    const ctx = this.groundCtx;
    const season = seasonOf(world.day);
    const grass = SEASON_GRASS[season];
    const rng = mulberry32(world.seed * 31 + season * 7 + 5);
    const colors = {
      grass, path: '#d9c7a7', water: '#2a9dcc', sand: '#f4e3b2',
      soil: '#7b4b2a', floor: '#c9b18c', tree: grass, pine: grass,
      rock: grass, flower: grass, well: '#adb5bd', stall: '#c9b18c', house: '#c9b18c',
    };
    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) {
        let c = colors[world.terrain[y][x]] || grass;
        // Bintik rumput acak supaya tanah tidak polos.
        if (world.terrain[y][x] === 'grass') {
          const v = rng();
          if (v < 0.12) c = season === 3 ? '#ffffff' : '#4caf50';
          else if (v < 0.2) c = season === 3 ? '#dfe8ee' : '#6bcB6b';
        }
        ctx.fillStyle = c;
        ctx.fillRect(x * 20, y * 20, 20, 20);
      }
    }
    // Petak ladang digambar lebih gelap (tanah).
    for (const p of world.plots) {
      ctx.fillStyle = p.state === 'wet' ? '#5a3a20' : '#8a5a34';
      ctx.fillRect(p.x * 20 + 2, p.y * 20 + 2, 16, 16);
    }
    if (this.groundMat && this.groundMat.map) this.groundMat.map.needsUpdate = true;
    // Daun pohon ikut musim.
    if (this.leafMat) this.leafMat.color.set(SEASON_LEAF[season]);
  }

  // --- Per-frame ---
  render(world, dt, t) {
    if (!this.built) this.build(world);
    const season = seasonOf(world.day);
    if (season !== this.lastSeason) {
      this.lastSeason = season;
      this.paintGround(world);
    }
    const p = world.player;
    const px = toWorldX(p.x);
    const pz = toWorldZ(p.y);

    // Pemain.
    const pm = this.playerMesh;
    pm.position.set(px, 0, pz);
    const targetRot = { down: 0, up: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[p.dir] || 0;
    pm.rotation.y = targetRot;
    const bob = p.moving ? Math.abs(Math.sin(t * 10)) * 0.08 : 0;
    pm.position.y = bob;
    const swing = p.moving ? Math.sin(t * 10) * 0.5 : 0;
    pm.userData.legL.rotation.x = swing;
    pm.userData.legR.rotation.x = -swing;

    // NPC.
    for (const n of world.npcs) {
      const m = this.npcMeshes.get(n.id);
      if (!m) continue;
      m.position.set(toWorldX(n.x), 0, toWorldZ(n.y));
      m.userData.heart.visible = n.hearts >= 3;
      if (n.tx !== null) {
        const dx = n.tx - n.x;
        const dy = n.ty - n.y;
        m.rotation.y = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? -Math.PI / 2 : Math.PI / 2) : (dy > 0 ? 0 : Math.PI);
      }
    }

    // Anak.
    if (p.childStage > 0) {
      this.childMesh.visible = true;
      if (p.childStage === 1) {
        this.childMesh.position.set(toWorldX(7 * TILE), 0, toWorldZ(5.5 * TILE));
      } else {
        this.childMesh.position.set(toWorldX(25.5 * TILE), 0, toWorldZ(23 * TILE));
      }
    } else {
      this.childMesh.visible = false;
    }

    // Hewan: sinkronkan mesh dengan world.animals.
    const seen = new Set();
    for (const a of world.animals) {
      let m = this.animalMeshes.get(a);
      if (!m) {
        m = makeAnimalMesh(a.kind);
        this.worldGroup.add(m);
        this.animalMeshes.set(a, m);
      }
      seen.add(a);
      m.position.set(toWorldX(a.x), 0, toWorldZ(a.y));
      if (a.tx !== null) {
        const dx = a.tx - a.x;
        m.rotation.y = dx > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      // Hewan sakit: miring sedikit.
      m.rotation.z = a.sick ? 0.15 : 0;
    }
    for (const [a, m] of this.animalMeshes) {
      if (!seen.has(a)) { this.worldGroup.remove(m); this.animalMeshes.delete(a); }
    }

    // Petak + tanaman.
    for (const plot of world.plots) {
      const sig = `${plot.state}|${plot.crop || ''}|${plot.growth}`;
      if (this.cropSig.get(plot) === sig) continue;
      this.cropSig.set(plot, sig);
      let g = this.plotMeshes.get(plot);
      if (!g) {
        g = new THREE.Group();
        const soil = new THREE.Mesh(
          new THREE.BoxGeometry(CELL * 0.9, 0.18, CELL * 0.9),
          new THREE.MeshLambertMaterial({ color: '#8a5a34' }),
        );
        soil.position.y = 0.09;
        g.add(soil);
        g.userData.soil = soil;
        g.position.set(toWorldX((plot.x + 0.5) * TILE), 0, toWorldZ((plot.y + 0.5) * TILE));
        this.plotGroup.add(g);
        this.plotMeshes.set(plot, g);
      }
      g.userData.soil.material.color.set(plot.state === 'wet' ? '#5a3a20' : '#8a5a34');
      // Hapus tanaman lama, bangun yang baru sesuai tahap.
      const old = g.userData.cropMesh;
      if (old) { g.remove(old); g.userData.cropMesh = null; }
      if (plot.crop) {
        const crop = CROPS[plot.crop];
        const days = crop.days;
        const stage = plot.growth >= days ? 2 : plot.growth >= Math.ceil(days / 2) ? 1 : 0;
        const cm = new THREE.Group();
        if (stage === 0) {
          const sprout = new THREE.Mesh(
            new THREE.ConeGeometry(0.22, 0.5, 6),
            new THREE.MeshLambertMaterial({ color: '#3fae4a' }),
          );
          sprout.position.y = 0.35;
          cm.add(sprout);
        } else if (stage === 1) {
          const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.7, 5),
            new THREE.MeshLambertMaterial({ color: '#2f9e44' }),
          );
          stem.position.y = 0.5;
          const leaves = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.4, 0),
            new THREE.MeshLambertMaterial({ color: crop.leaf }),
          );
          leaves.position.y = 0.9;
          leaves.scale.y = 0.7;
          cm.add(stem, leaves);
        } else {
          const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.6, 5),
            new THREE.MeshLambertMaterial({ color: '#2f9e44' }),
          );
          stem.position.y = 0.45;
          const fruit = new THREE.Mesh(
            new THREE.SphereGeometry(0.34, 8, 6),
            new THREE.MeshLambertMaterial({ color: crop.color }),
          );
          fruit.position.y = 0.95;
          cm.add(stem, fruit);
        }
        g.add(cm);
        g.userData.cropMesh = cm;
      }
    }

    // Titik galian: penanda hilang bila sudah digali.
    for (const s of this.spotMeshes) s.gem.visible = s.spot.available;

    // Pelampung pancing.
    if (world.fish.active) {
      this.bobber.visible = true;
      const dir = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[p.dir] || [0, 1];
      this.bobber.position.set(px + dir[0] * 1.6, 0.15 + Math.sin(t * 3) * 0.05, pz + dir[1] * 1.6);
    } else {
      this.bobber.visible = false;
    }

    // Langit, matahari/bulan, cahaya menurut jam.
    const hour = world.hour + world.minute / 60;
    const sky = skyColorForHour(hour);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    const isDay = hour >= 6 && hour < 19;
    const sunAngle = ((hour - 6) / 13) * Math.PI; // 06:00 terbit, 19:00 terbenam
    this.sunMesh.position.set(Math.cos(sunAngle) * 60, Math.sin(sunAngle) * 45 + 4, -30);
    this.sunMesh.visible = isDay;
    this.moonMesh.position.set(Math.cos(sunAngle) * 60, Math.sin(sunAngle) * 40 + 6, -30);
    this.moonMesh.visible = !isDay;
    const dayFactor = isDay ? 0.55 + 0.45 * Math.sin(sunAngle) : 0.18;
    this.sun.intensity = 0.4 + dayFactor * 0.9;
    this.hemi.intensity = 0.35 + dayFactor * 0.6;
    this.sun.position.set(Math.cos(sunAngle) * 40, Math.max(8, Math.sin(sunAngle) * 45), 15);

    // Air beriak pelan.
    const wave = Math.sin(t * 1.5) * 0.03;
    if (this.lakeMesh) this.lakeMesh.position.y = 0.06 + wave;
    if (this.seaMesh) this.seaMesh.position.y = 0.06 - wave;

    // Hujan.
    const raining = world.weather === 'Hujan' || world.weather === 'Badai';
    this.rain.visible = raining;
    if (raining) {
      const pos = this.rain.geometry.attributes.position;
      const speed = world.weather === 'Badai' ? 34 : 24;
      for (let i = 0; i < pos.count; i += 1) {
        let y = pos.getY(i) - speed * dt;
        if (y < 0) {
          y = 20 + Math.random() * 2;
          pos.setX(i, px + (Math.random() - 0.5) * 50);
          pos.setZ(i, pz + (Math.random() - 0.5) * 50);
        }
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // Kamera third-person mengikuti pemain (sudut agak landai ala Harvest Moon 3D).
    const portrait = this.camera.aspect < 1;
    const dist = portrait ? 1.45 : 1;
    const target = new THREE.Vector3(px, 1.2, pz);
    const desired = new THREE.Vector3(px, 12.5 * dist, pz + 14 * dist);
    this.camPos.lerp(desired, 1 - Math.pow(0.001, dt));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(target);

    this.renderer.render(this.scene, this.camera);
  }
}
