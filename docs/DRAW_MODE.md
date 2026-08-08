# Draw mode — OCR, and keeping it off the CDN

**If draw mode breaks with `Failed to execute 'importScripts'`, read this
file first.**

## What was broken

`draw-recognition-local.ts` used Tesseract.js's library defaults: the
worker script and WASM core loaded from `cdn.jsdelivr.net`, and the
English trained-data pack from `tessdata.projectnaptha.com`. Any network
that blocks jsdelivr — a locked-down corporate network, certain
countries, or this project's own development sandbox — threw
`Failed to execute 'importScripts' on 'WorkerGlobalScope'` and killed
draw mode outright, with no fallback.

## The fix

`scripts/vendor-tesseract.mjs` mirrors the worker, WASM cores, and the
English trained-data pack into `public/vendor/tesseract/`, all served
same-origin. It runs automatically via `predev`/`prebuild` in
`package.json` — you do not need to remember to run it, but you can:

```bash
cd artifacts/lok-lingu
node scripts/vendor-tesseract.mjs
```

### Why the worker/core copy can never fail

The worker script and the three WASM core variants (plain, SIMD,
relaxed-SIMD — `getCore.js`'s own feature detection picks the fastest one
the browser actually supports) are copied straight out of the
**already-installed** `tesseract.js` / `tesseract.js-core` npm packages.
No network call is involved, so this step cannot 404 the way the old
runtime CDN fetch could. If it fails, something is genuinely wrong with
the install (`pnpm install` did not complete), and the script exits
non-zero rather than shipping a broken build silently.

### Why the trained-data download is allowed to fail softly

`eng.traineddata.gz` (~13 MB) is the one piece that must come from the
network — trained-data files are not part of the npm package. Latin-
script languages (es/fr/de/it/pt/nl/pl/sv/tr/vi/en) share this one pack,
so vendoring it locally covers 11 of 17 languages by default.

If that download fails (no network at build time), the script warns and
continues — `draw-recognition-local.ts` checks for the vendored file with
a real `HEAD` request (`isVendored()`) before trusting it, and falls back
to the CDN path exactly like before this change if it is missing. This is
deliberately non-fatal: losing the one-time download convenience is a far
smaller problem than a build that silently ships a `langPath` pointing at
a file that was never fetched.

### Non-Latin scripts still use the CDN

Japanese, Korean, Chinese, Russian, Arabic, Hindi, and Thai each need
their own trained-data pack (10–40 MB apiece). Bundling all seven by
default would bloat every deployment for languages most players never
pick, so those still fetch from `tessdata.projectnaptha.com` on first use
in that language — same as before this fix, just no longer the *only*
path for the common case.

## `public/vendor/` is gitignored

It is a fetched/copied build asset, not source — same treatment as
`public/models/` for the Vosk speech models. Do not commit it.

## The other draw-mode bug: TTS/mic echo

See **docs/SPEECH.md → "The TTS echo bug"**. It affects draw mode's
"Listen" button the same way it affected the voice game's "pronounce
slowly" button, and both are fixed by the same pattern
(`speechMutedRef` + awaiting `speakWord()`'s promise before resuming
voice-confirm listening).
