import type { ProviderInit, SpeechProvider } from './types';

/* ------------------------------------------------------------------
   Vosk provider — offline speech through WebAssembly.

   Vosk requires the `vosk-browser` npm package which is not available
   in this build (blocked by the package registry). The provider is kept
   as a stub so the capabilities detection still works correctly, and the
   engine manager falls back to Web Speech immediately when Vosk is
   unavailable.
------------------------------------------------------------------ */

export function voskSupportsLanguage(_lang: string): boolean {
  // No Vosk model is configured in this build.
  return false;
}

export function voskModelConfigured(_lang: string): boolean {
  return false;
}

export function createVoskProvider(_init: ProviderInit): SpeechProvider {
  throw new Error('vosk-browser is not available in this build — use Web Speech');
}
