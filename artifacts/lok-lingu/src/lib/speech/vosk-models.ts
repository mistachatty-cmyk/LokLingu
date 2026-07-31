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

/** Archive file name per base language code. */
export const VOSK_MODELS: Record<string, string> = {
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

const BASE = (import.meta.env?.VITE_VOSK_MODEL_BASE as string | undefined)?.replace(/\/$/, '');

export function voskModelUrl(baseLanguage: string): string | null {
  const file = VOSK_MODELS[baseLanguage];
  if (!file) return null;
  if (!BASE) return null;
  return `${BASE}/${file}`;
}

/** True when an offline model is both known and reachable. */
export function voskModelConfigured(baseLanguage: string): boolean {
  return voskModelUrl(baseLanguage) !== null;
}

export const VOSK_MODEL_BASE_CONFIGURED = !!BASE;
