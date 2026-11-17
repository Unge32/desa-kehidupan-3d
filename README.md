[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Unge32/desa-kehidupan-3d/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Unge32/desa-kehidupan-3d/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Entry for [make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01) ($1,000 in USDC).

# Desa Kehidupan 3D

Versi 3D (Three.js, mobile-first) dari **Desa Kehidupan** — simulasi hidup
desa ala Harvest Moon: berkebun, memancing, menambang berlian, beternak,
berdagang di pasar, dan berkeluarga — semua dalam satu desa 3D yang hidup
dengan 4 musim, cuaca, festival, dan waktu real-time.

Seorang petani muda mewarisi ladang di Desa Kehidupan. Tujuannya: beli
RUMAH BESAR (50.000G) sebelum akhir Tahun 1 (28 hari: 4 musim x 7 hari).
Semua transaksi di game memakai Gold — duit mainan di dalam game saja,
tanpa pembayaran uang asli.

## Cara menjalankan

Serve folder `game/` dengan static server apa pun, misal:

```sh
cd game
python3 -m http.server 8134
```

Lalu buka `http://127.0.0.1:8134/` di browser. Tanpa build step, tanpa
CDN, tanpa network call saat runtime — Three.js di-vendor lokal di
`game/vendor/three.module.js`.

## Kontrol

**HP (mobile-first):**
- 🕹️ Joystick virtual kiri-bawah untuk jalan (kamera third-person mengikuti)
- **AKSI** — cangkul, tanam, siram, panen, gali, bicara, beri makan hewan, minum, tidur
- **🎣 PANCING** — di tepi air; tarik saat muncul "❗"
- **🎒 TAS** — pakai/makan barang, jual hasil (JUAL SEMUA)
- **🛒 TOKO** — beli benih, makanan, hewan, obat, rumah
- Ketuk chip benih (1–6) untuk memilih benih yang ditanam

**Desktop (keyboard):**
- WASD / panah jalan • **E** aksi • **F** mancing • **G** beri hadiah • **R** lamar
- **1–6** pilih benih • **B** toko • **I** tas • **J** jual semua (di tas)
- **P** jeda • **H** bantuan • **M** suara • **Enter** mulai / ulang

## Sistem game (sama dengan versi 2D)

- Jam real-time: 1 jam game = 12 detik, hari 06:00–24:00, tidur ke hari berikut
- 4 musim x 7 hari; cuaca Cerah/Hujan/Berawan/Badai (Semi didominasi hujan)
- 6 tanaman season-locked, 5 ikan, 5 permata tambang, 4 ternak (ayam, kambing, sapi, kerbau)
- Survival: lapar, haus, energi, sehat — sehat 0 = pingsan (−10% emas)
- 8 NPC dengan hati persahabatan; Rani bisa dipacari → dinikahi (cincin 5.000G) → punya anak (sekolah + taman)
- Festival tiap hari ke-7 musim di alun-alun (Lomba Mancing +1.000G, Panen harga 2x, dll.)
- 4 tugas berbayar warga: Pak Tani (3 Lobak → 300G), Budi (2 ikan → 400G), Bu Sari (5 sayur → 450G), Rani (1 bunga → 250G + hati)
- Toko 6 tab (benih, makanan, hewan, obat, rumah, lain-lain)

## Screenshot deterministik

`?shot=start|play|fish|win|end&seed=N` — staging adegan lalu set
`window.__shotReady` setelah 2 frame.

## Struktur

```
game/
  index.html            — canvas + HUD DOM + panel + kontrol sentuh
  vendor/three.module.js — Three.js 0.160.0 (lokal, offline)
  src/
    config.js   random.js   audio.js    input.js    touch.js
    world.js    farm.js     animals.js  fishing.js  mining.js
    economy.js  tasks.js    npc.js      render3d.js ui.js   main.js
tests/
  serve.mjs     — static server untuk playtest
  playtest.mjs  — Playwright: boot, jalan, tani, toko, mancing, gali, NPC, menang/kalah
```

## Performa

Low-poly prosedural, tanpa shadow map, satu directional light + hemisphere,
pixelRatio dibatasi 1,5, pohon/batu/bunga memakai InstancedMesh.
