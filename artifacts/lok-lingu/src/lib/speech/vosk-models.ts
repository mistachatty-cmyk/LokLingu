/* ------------------------------------------------------------------
   Offline model registry.

   Model archives are NOT bundled — they are far too large for the app
   bundle. They are fetched at runtime from a host you control and then
   cached by the browser. Set VITE_VOSK_MODEL_BASE to that host, e.g.

     VITE_VOSK_MODEL_BASE=https://models.example.com/vosk

   and place the archives there under the file names below. The small
   models are 15-50 MB each; ship only the languages you care about.
   Sources: https://alphacephei.com/vosk/models (Apache-2.0).
------------------------------------------------------------------ */

/**
 * Languages with a repack recipe in scripts/fetch-vosk-models.mjs. The
 * built archive is always `<lang>.tar.gz`, because the published .zip
 * names are version-stamped and change between releases.
 */
export const VOSK_MODELS: Record<string, string> = Object.fromEntries(
  ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'tr', 'vi', 'hi', 'ja', 'ko', 'zh', 'pl', 'sv', 'ar'].map(
    (l) => [l, `${l}.tar.gz`],
  ),
);

/**
 * Where the model archives live.
 *
 * Defaults to `/models` — the app's own `public/models/` folder — so the
 * common case needs no configuration at all and has no CORS problems.
 * Point VITE_VOSK_MODEL_BASE at a CDN instead if you would rather not
 * ship the archives with the site.
 */
const BASE = (
  (import.meta.env?.VITE_VOSK_MODEL_BASE as string | undefined) || '/models'
).replace(/\/$/, '');

/**
 * Which languages are actually present, read once from the manifest the
 * fetch script writes. Without this we would happily start a 40 MB request
 * for a file that was never downloaded.
 */
let availablePromise: Promise<Set<string>> | null = null;

export function loadAvailableModels(): Promise<Set<string>> {
  if (!availablePromise) {
    availablePromise = fetch(`${BASE}/manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : { languages: [] }))
      .then((j: { languages?: string[] }) => new Set(j.languages ?? []))
      .catch(() => new Set<string>());
  }
  return availablePromise;
}

export function voskModelUrl(baseLanguage: string): string | null {
  const file = VOSK_MODELS[baseLanguage];
  if (!file) return null;
  return `${BASE}/${file}`;
}

/** True when an offline model is both known and reachable. */
export function voskModelConfigured(baseLanguage: string): boolean {
  return voskModelUrl(baseLanguage) !== null;
}

export const VOSK_MODEL_BASE = BASE;
