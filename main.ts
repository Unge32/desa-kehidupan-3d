// Desa Kehidupan 3D — main.ts (Node 22, standard library only)
// Menyerahkan game ke make.fun: menyalin game/ dan screenshots/ dari
// sebelah file ini ke /output, lalu menulis /output/dossier.json dengan
// pustaka make.fun yang divendor. Di luar grader, MAKEFUN_OUTPUT_DIR
// menggantikan /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Game-nya: simulasi hidup desa 3D ala Harvest Moon — berkebun, memancing,
// menambang berlian, beternak, menikah dan berkeluarga, 4 musim, festival.
// Render Three.js low-poly (dimuat dari CDN saat game dibuka di browser),
// kontrol mobile-first: joystick virtual + tombol aksi, keyboard di desktop.
// Sajikan lokal dengan `node serve.ts`, lalu buka http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Batas scorer (lihat RULES.txt): hanya text_max_bytes yang membentuk byte;
// sisanya menolak entri yang akan ditolak scorer (lebih dari 4 screenshot
// atau satu di atas 256 KiB; lebih dari 993 file di game/ atau 48 MiB
// total, atau path di bawah game/ di atas 1000 byte).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
