#!/usr/bin/env node
/**
 * Downloads Vosk speech models and repacks them for the browser.
 *
 *   node scripts/fetch-vosk-models.mjs es fr ja
 *   node scripts/fetch-vosk-models.mjs --all
 *   node scripts/fetch-vosk-models.mjs --list
 *
 * Why repacking is necessary:
 *   alphacephei publishes models as .zip archives whose top-level folder is
 *   version-stamped (vosk-model-small-es-0.42/). vosk-browser instead loads
 *   a GZIPPED TAR whose top-level folder is literally "model". So we fetch
 *   the zip, extract it, and rewrite it as <lang>.tar.gz with the folder
 *   renamed. Pointing the app straight at the published .zip does not work.
 *
 * Output lands in public/models/, served at /models on the same origin —
 * no CORS setup, no environment variable. Models are 40-90 MB each and are
 * gitignored; download only the languages you ship.
 *
 * Runs on Windows, macOS and Linux — no unzip/tar binaries required.
 * Model licence: Apache-2.0. https://alphacephei.com/vosk/models
 */
import { createWriteStream } from 'node:fs';
import { mkdir, rm, stat, writeFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import AdmZip from 'adm-zip';
import * as tar from 'tar';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'public', 'models');
const TMP_DIR = join(HERE, '..', '.vosk-tmp');
const REMOTE = 'https://alphacephei.com/vosk/models';

/** Published .zip name per language. Keep in sync with src/lib/speech/vosk-models.ts */
const MODELS = {
  en: 'vosk-model-small-en-us-0.15',
  es: 'vosk-model-small-es-0.42',
  fr: 'vosk-model-small-fr-0.22',
  de: 'vosk-model-small-de-0.15',
  it: 'vosk-model-small-it-0.22',
  pt: 'vosk-model-small-pt-0.3',
  nl: 'vosk-model-small-nl-0.22',
  ru: 'vosk-model-small-ru-0.22',
  tr: 'vosk-model-small-tr-0.3',
  vi: 'vosk-model-small-vn-0.4',
  hi: 'vosk-model-small-hi-0.22',
  ja: 'vosk-model-small-ja-0.22',
  ko: 'vosk-model-small-ko-0.22',
  zh: 'vosk-model-small-cn-0.22',
  pl: 'vosk-model-small-pl-0.22',
  sv: 'vosk-model-small-sv-rhasspy-0.15',
  ar: 'vosk-model-ar-mgb2-0.4',
};

const args = process.argv.slice(2);

if (args.includes('--list')) {
  console.log('Available languages:\n');
  for (const [lang, name] of Object.entries(MODELS)) console.log(`  ${lang}  ${name}`);
  process.exit(0);
}

const wanted = args.includes('--all')
  ? Object.keys(MODELS)
  : args.filter((a) => !a.startsWith('-'));

if (wanted.length === 0) {
  console.error('Usage: node scripts/fetch-vosk-models.mjs <lang...> | --all | --list');
  console.error('Available: ' + Object.keys(MODELS).join(' '));
  process.exit(1);
}

const unknown = wanted.filter((l) => !MODELS[l]);
if (unknown.length) {
  console.error('Unknown language code(s): ' + unknown.join(', '));
  console.error('Run with --list to see what is available.');
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

const done = [];

for (const lang of wanted) {
  const base = MODELS[lang];
  const outName = `${lang}.tar.gz`;
  const outPath = join(OUT_DIR, outName);

  try {
    const s = await stat(outPath);
    if (s.size > 0) {
      console.log(`✓ ${lang}: already built (${(s.size / 1e6).toFixed(1)} MB)`);
      done.push(lang);
      continue;
    }
  } catch {
    /* not built yet */
  }

  const url = `${REMOTE}/${base}.zip`;
  const work = join(TMP_DIR, lang);
  const zipPath = join(TMP_DIR, `${lang}.zip`);

  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });

  process.stdout.write(`↓ ${lang}: downloading ${base}.zip … `);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    console.log(`FAILED (HTTP ${res.status})`);
    console.log(`   tried: ${url}`);
    continue;
  }
  await pipeline(res.body, createWriteStream(zipPath));
  const zs = await stat(zipPath);
  console.log(`${(zs.size / 1e6).toFixed(1)} MB`);

  process.stdout.write(`  repacking as ${outName} … `);
  new AdmZip(zipPath).extractAllTo(work, true);

  // The zip contains one version-stamped folder; vosk-browser wants "model".
  const entries = await readdir(work, { withFileTypes: true });
  const root = entries.find((e) => e.isDirectory());
  if (!root) {
    console.log('FAILED (no folder inside archive)');
    continue;
  }

  // cwd into the version-stamped folder and re-root every entry under
  // "model/", which is the layout vosk-browser's loader expects.
  await tar.create(
    {
      gzip: true,
      file: outPath,
      cwd: join(work, root.name),
      portable: true,
      prefix: 'model',
    },
    await readdir(join(work, root.name)),
  );

  const os_ = await stat(outPath);
  console.log(`${(os_.size / 1e6).toFixed(1)} MB`);

  await rm(work, { recursive: true, force: true });
  await rm(zipPath, { force: true });
  done.push(lang);
}

await rm(TMP_DIR, { recursive: true, force: true });

// The app reads this to know which languages can run offline, so it never
// attempts a large download that is not there.
await writeFile(
  join(OUT_DIR, 'manifest.json'),
  JSON.stringify({ languages: done.sort() }, null, 2) + '\n',
);

console.log(`\nReady: ${done.join(', ') || '(none)'}`);
if (done.length) {
  console.log('These now work offline in Safari, Firefox and desktop builds.');
  console.log('Commit nothing — public/models/ is gitignored. Deploy to publish.');
}
