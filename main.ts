// Sizzle House — the hand-in program (Node 22, standard library only).
//
// The game itself is the static files under game/ (game/index.html plus its ES modules, no
// library and no network request), and this program hands it in: it copies game/ and
// screenshots/ from beside this file into the output directory and writes dossier.json there,
// the summary the judge reads, using the vendored make.fun library.
//
// Serve the game locally first to play-test it and take its screenshots:
//   node --experimental-strip-types serve-check.mjs  (or any static server over game/)
//   open http://localhost:8080
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

// What this program does, in plain words:
// The game lives in game/ as plain files a browser can open with no build step and no
// network: index.html plus the modules under game/src. This file only hands those files in.
// It copies game/ and screenshots/ into the output folder the grader names, then writes
// dossier.json there — the judge's view of the entry (its screenshots and a list of its
// source files) — using the make.fun library vendored under vendor/.

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

// The scorer's own caps (from the kit's gate): only text_max_bytes shapes the bytes; the
// others refuse an entry the scorer would refuse (more than 4 screenshots or one over 256 KiB;
// more than 993 files in game/ or 48 MiB of game files in all, or a path under game/ over
// 1000 bytes: game/ counts beside /output's own 1000-entry cap, its screenshots/ and
// dossier.json).
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
