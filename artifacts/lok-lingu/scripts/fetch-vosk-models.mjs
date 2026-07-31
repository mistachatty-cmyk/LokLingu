#!/usr/bin/env node
/**
 * Downloads Vosk speech models into public/models so the app can run
 * speech recognition offline — which is the only way Safari, Firefox and
 * the desktop/Steam build get working voice.
 *
 *   node scripts/fetch-vosk-models.mjs es fr ja
 *   node scripts/fetch-vosk-models.mjs --all
 *
 * Models are ~15-50 MB each and are NOT committed to git. Download only
 * the languages you actually ship: every one lands in the deployment.
 * Source: https://alphacephei.com/vosk/models (Apache-2.0)
 */
import { createWriteStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'public', 'models');
const REMOTE = 'https://alphacephei.com/vosk/models';

/** Keep in sync with src/lib/speech/vosk-models.ts */
const MODELS = {
  en: 'vosk-model-small-en-us-0.15.tar.gz',
  es: 'vosk-model-small-es-0.42.tar.gz',
  fr: 'vosk-model-small-fr-0.22.tar.gz',
  de: 'vosk-model-small-de-0.15.tar.gz',
  it: 'vosk-model-small-it-0.22.tar.gz',
  pt: 'vosk-model-small-pt-0.3.tar.gz',
  nl: 'vosk-model-small-nl-0.22.tar.gz',
  ru: 'vosk-model-small-ru-0.22.tar.gz',
  tr: 'vosk-model-small-tr-0.3.tar.gz',
  vi: 'vosk-model-small-vn-0.4.tar.gz',
  hi: 'vosk-model-small-hi-0.22.tar.gz',
  ja: 'vosk-model-small-ja-0.22.tar.gz',
  ko: 'vosk-model-small-ko-0.22.tar.gz',
  zh: 'vosk-model-small-cn-0.22.tar.gz',
  ar: 'vosk-model-ar-mgb2-0.4.tar.gz',
  pl: 'vosk-model-small-pl-0.22.tar.gz',
  sv: 'vosk-model-small-sv-rhasspy-0.15.tar.gz',
};

const args = process.argv.slice(2);
const wanted = args.includes('--all')
  ? Object.keys(MODELS)
  : args.filter((a) => !a.startsWith('-'));

if (wanted.length === 0) {
  console.error('Usage: node scripts/fetch-vosk-models.mjs <lang...> | --all');
  console.error('Available: ' + Object.keys(MODELS).join(' '));
  process.exit(1);
}

const unknown = wanted.filter((l) => !MODELS[l]);
if (unknown.length) {
  console.error('Unknown language code(s): ' + unknown.join(', '));
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

const present = [];
for (const lang of wanted) {
  const file = MODELS[lang];
  const dest = join(OUT_DIR, file);

  try {
    const s = await stat(dest);
    if (s.size > 0) {
      console.log(`✓ ${lang}: ${file} already present (${(s.size / 1e6).toFixed(1)} MB)`);
      present.push(lang);
      continue;
    }
  } catch {
    /* not downloaded yet */
  }

  const url = `${REMOTE}/${file}`;
  process.stdout.write(`↓ ${lang}: ${file} … `);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    console.log(`FAILED (${res.status})`);
    continue;
  }
  await pipeline(res.body, createWriteStream(dest));
  const s = await stat(dest);
  console.log(`done (${(s.size / 1e6).toFixed(1)} MB)`);
  present.push(lang);
}

// The app reads this to know which languages can run offline without
// having to attempt (and fail) a large download first.
await writeFile(
  join(OUT_DIR, 'manifest.json'),
  JSON.stringify({ languages: present, files: Object.fromEntries(present.map((l) => [l, MODELS[l]])) }, null, 2),
);
console.log(`\nmanifest.json written with: ${present.join(', ') || '(none)'}`);
