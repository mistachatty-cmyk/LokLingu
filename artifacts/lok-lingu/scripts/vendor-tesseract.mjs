#!/usr/bin/env node
/**
 * Vendors the Tesseract.js worker, WASM cores, and the English trained-data
 * pack into public/vendor/tesseract/, so draw mode's OCR never depends on
 * jsdelivr or projectnaptha.com being reachable.
 *
 * Before this script, `createWorker()` used its library defaults: the
 * worker script and WASM core loaded from cdn.jsdelivr.net, and the
 * language pack from tessdata.projectnaptha.com. Any one of those being
 * blocked — a locked-down network, a country where jsdelivr is filtered,
 * this very sandbox — threw `Failed to execute 'importScripts'` and killed
 * Draw mode outright, with no fallback.
 *
 * The worker and WASM cores are copied straight out of the already-
 * installed npm packages (tesseract.js, tesseract.js-core) — no network
 * needed for those, so this step can never 404 the way the old runtime
 * CDN fetch could. Only the trained-data file is downloaded, once, from
 * the same CDN the library already trusted; after this script runs it is
 * a local build asset like any other, not a per-request dependency.
 *
 * Run after `pnpm install`, before `pnpm build` or `pnpm dev`:
 *   node scripts/vendor-tesseract.mjs
 *
 * public/vendor/ is gitignored — this is a fetched asset, not source.
 */

import { mkdir, copyFile, access } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'vendor', 'tesseract');

const TRAINEDDATA_URL = 'https://tessdata.projectnaptha.com/4.0.0_best/eng.traineddata.gz';

async function resolvePackageDir(pkg) {
  // Prefer normal resolution — works whenever the package is hoisted or
  // is a direct dependency.
  try {
    return path.dirname(require.resolve(`${pkg}/package.json`, { paths: [path.join(__dirname, '..')] }));
  } catch {
    /* fall through — pnpm keeps indirect deps out of reach of require.resolve */
  }

  // tesseract.js-core is a dependency *of* tesseract.js, not of this
  // package, so under pnpm's strict node_modules it is only reachable
  // through tesseract.js's own resolution scope, not this script's.
  const viaParent = path.dirname(
    require.resolve(`tesseract.js/package.json`, { paths: [path.join(__dirname, '..')] }),
  );
  return path.dirname(require.resolve(`${pkg}/package.json`, { paths: [viaParent] }));
}

async function copyIfPresent(from, to) {
  try {
    await copyFile(from, to);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const workerDir = path.join(await resolvePackageDir('tesseract.js'), 'dist');
  const coreDir = await resolvePackageDir('tesseract.js-core');

  console.log('Vendoring Tesseract.js runtime (from installed packages, no network)…');
  const worker = await copyIfPresent(
    path.join(workerDir, 'worker.min.js'),
    path.join(OUT, 'worker.min.js'),
  );
  if (!worker) {
    console.error('  ✗ worker.min.js not found — is tesseract.js installed?');
    process.exitCode = 1;
    return;
  }
  console.log('  ✓ worker.min.js');

  // The LSTM-only build is what tesseract.js requests by default; ship the
  // plain, SIMD, and relaxed-SIMD variants so getCore.js's own feature
  // detection can pick the fastest one the browser actually supports.
  const CORE_VARIANTS = ['lstm', 'simd-lstm', 'relaxedsimd-lstm'];
  for (const variant of CORE_VARIANTS) {
    const base = `tesseract-core-${variant}`;
    const js = await copyIfPresent(path.join(coreDir, `${base}.wasm.js`), path.join(OUT, `${base}.wasm.js`));
    const wasm = await copyIfPresent(path.join(coreDir, `${base}.wasm`), path.join(OUT, `${base}.wasm`));
    console.log(`  ${js && wasm ? '✓' : '✗'} ${base}.wasm{,.js}`);
  }

  const dest = path.join(OUT, 'eng.traineddata.gz');
  if (await access(dest).then(() => true, () => false)) {
    console.log('  ✓ eng.traineddata.gz already present, skipping download');
  } else {
    console.log(`Downloading eng.traineddata.gz (~13 MB, one time)…`);
    try {
      const res = await fetch(TRAINEDDATA_URL);
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      await pipeline(res.body, createWriteStream(dest));
      console.log('  ✓ eng.traineddata.gz');
    } catch (err) {
      // Not fatal — draw-recognition-local.ts falls back to the CDN for
      // this pack when it is not vendored, same as before this script
      // existed. Only the worker/core (copied above, no network needed)
      // are load-bearing for the fix this script exists to make.
      console.warn(`  ⚠ eng.traineddata.gz not downloaded (${err.message}) — will use CDN fallback at runtime`);
    }
  }

  console.log('\nDone. Latin-script languages (es/fr/de/it/pt/nl/pl/sv/tr/vi/en) are now fully');
  console.log('local. Non-Latin scripts (ja/ko/zh/ru/ar/hi/th) still fetch their own trained-');
  console.log('data pack from the CDN on first use in Draw mode for that language — those');
  console.log('packs are 10-40 MB each and shipping all seven by default would bloat every');
  console.log('deploy for languages most players never pick.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
