/**
 * draw-recognition-local.ts
 *
 * Free, browser-side handwriting recognition via Tesseract.js (no API costs).
 * The worker is created lazily and cached between calls so the WASM only
 * loads once per session.
 */

import { createWorker, type Worker } from 'tesseract.js';

export type DrawVerdict = 'ACCEPT' | 'CLOSE' | 'REJECT';

// ── Language mapping ─────────────────────────────────────────────────────────
// Latin-script languages share the `eng` pack (smallest, ~4 MB) since they
// use the same alphabet. Non-Latin languages load their own pack from the
// Tesseract CDN on first use.
const TESSERACT_LANG: Record<string, string> = {
  es: 'eng', fr: 'eng', de: 'eng', it: 'eng', pt: 'eng',
  nl: 'eng', pl: 'eng', sv: 'eng', tr: 'eng', vi: 'eng',
  en: 'eng',
  ja: 'jpn',
  ko: 'kor',
  zh: 'chi_sim',
  ru: 'rus',
  ar: 'ara',
  hi: 'hin',
  th: 'tha',
};

function getTesseractLang(language: string): string {
  return TESSERACT_LANG[language] ?? 'eng';
}

/**
 * The languages `scripts/vendor-tesseract.mjs` *attempts* to mirror
 * locally. Its own download step can fail (no network at build time) and
 * is deliberately non-fatal there, so this is confirmed with a real
 * HEAD request rather than assumed — a stale assumption would silently
 * 404 langPath instead of falling back to the CDN.
 */
const VENDORED_LANGS = new Set(['eng']);
const vendoredPresence = new Map<string, Promise<boolean>>();

function isVendored(lang: string, base: string): Promise<boolean> {
  if (!VENDORED_LANGS.has(lang)) return Promise.resolve(false);
  const cached = vendoredPresence.get(lang);
  if (cached) return cached;
  const check = fetch(`${base}/${lang}.traineddata.gz`, { method: 'HEAD' })
    .then((res) => res.ok)
    .catch(() => false);
  vendoredPresence.set(lang, check);
  return check;
}

/**
 * Vendored under /vendor/tesseract (see scripts/vendor-tesseract.mjs).
 * Before this, `createWorker()` used its library defaults — the worker
 * script from cdn.jsdelivr.net and the WASM core from the same host —
 * so any network that blocked jsdelivr (a locked-down environment, or
 * this project's own sandbox) threw `Failed to execute 'importScripts'`
 * and killed Draw mode outright, with no fallback path.
 */
const VENDOR_BASE = `${import.meta.env.BASE_URL ?? '/'}vendor/tesseract`.replace(/\/+/g, '/');

// ── Worker cache ─────────────────────────────────────────────────────────────
let cachedWorker: Worker | null = null;
let cachedLang = '';
let workerReady: Promise<Worker> | null = null;

async function getWorker(lang: string): Promise<Worker> {
  if (cachedWorker && cachedLang === lang) {
    return cachedWorker;
  }
  // New language — reset
  if (workerReady && cachedLang !== lang) {
    workerReady = null;
    cachedWorker?.terminate().catch(() => undefined);
    cachedWorker = null;
  }
  if (!workerReady) {
    workerReady = isVendored(lang, VENDOR_BASE).then((vendored) =>
      createWorker(lang, 1, {
        workerPath: `${VENDOR_BASE}/worker.min.js`,
        corePath: VENDOR_BASE,
        // The trained-data pack is the one piece too large to vendor for
        // every script. English (which covers every Latin-script language
        // we ship) is mirrored locally when the fetch step succeeded;
        // everything else asks the CDN for its own pack on first use.
        langPath: vendored ? VENDOR_BASE : 'https://tessdata.projectnaptha.com/4.0.0_best',
        logger: () => undefined, // silence progress logs
      }),
    ).then((w) => {
      cachedWorker = w;
      cachedLang = lang;
      return w;
    });
  }
  return workerReady;
}

// ── Image preprocessing ───────────────────────────────────────────────────────
// The canvas uses a dark background with bright ink. Tesseract expects dark
// text on a light background, so we threshold-invert the image.
function preprocessForOCR(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 400;
      const h = img.naturalHeight || 500;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no canvas ctx')); return; }

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;

      for (let i = 0; i < d.length; i += 4) {
        // Perceived lightness of the pixel
        const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // Bright pixels = ink (on dark bg) → render black
        // Dark pixels = background → render white
        const out = luma > 80 ? 0 : 255;
        d[i] = out; d[i + 1] = out; d[i + 2] = out; d[i + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ── Levenshtein distance ─────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ── Main recognizer ──────────────────────────────────────────────────────────
/**
 * Recognise handwritten text in a canvas snapshot and compare it against
 * the target word.
 *
 * @param imageDataUrl WebP/PNG data URL from DrawCanvas.snapshot()
 * @param targetWord   The word the player was supposed to write
 * @param language     BCP-47 language code stored in localStorage
 * @returns 'ACCEPT' | 'CLOSE' | 'REJECT'
 */
export async function recognizeDrawingLocal(
  imageDataUrl: string,
  targetWord: string,
  language: string,
): Promise<DrawVerdict> {
  const lang = getTesseractLang(language);
  const [worker, processedCanvas] = await Promise.all([
    getWorker(lang),
    preprocessForOCR(imageDataUrl),
  ]);

  const { data } = await worker.recognize(processedCanvas);
  const recognized = data.text.trim().toLowerCase().replace(/[\s\n\r]+/g, '');
  const target = targetWord.trim().toLowerCase();

  if (!recognized) return 'REJECT';
  if (recognized === target) return 'ACCEPT';

  // Allow up to 30% edit distance (min 1 char) for "close enough"
  const tolerance = Math.max(1, Math.floor(target.length * 0.3));
  if (levenshtein(recognized, target) <= tolerance) return 'CLOSE';

  // Also check if the target is contained within the OCR output (extra chars
  // are common when Tesseract picks up ghost artifacts)
  if (recognized.includes(target) || target.includes(recognized)) return 'CLOSE';

  return 'REJECT';
}

/**
 * Pre-warm the Tesseract worker for a given language so the first in-game
 * recognition is fast. Call this once when the draw page mounts.
 */
export function primeRecognizer(language: string): void {
  const lang = getTesseractLang(language);
  getWorker(lang).catch(() => undefined); // fire and forget
}
