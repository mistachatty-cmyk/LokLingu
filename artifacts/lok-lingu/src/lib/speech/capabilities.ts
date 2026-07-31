import type { EngineId } from './types';

/* ------------------------------------------------------------------
   Which engine should we use here?

   Web Speech is not the safe default people assume:
     - Chrome / Edge desktop + Android: works, streams to Google.
     - Safari 14.1+: the API exists but `continuous` is unreliable and
       sessions end after a single phrase; usable, not preferred.
     - Firefox: not implemented (no flag ships it enabled).
     - Electron / Steam wrappers: the constructor may exist but the
       speech backend is absent, so it fails silently at start().
   Vosk runs locally through WebAssembly and therefore works in all of
   the above, at the cost of a one-time model download.
------------------------------------------------------------------ */

export interface Capabilities {
  hasWebSpeech: boolean;
  isElectron: boolean;
  isSafari: boolean;
  isFirefox: boolean;
  hasWasm: boolean;
  hasMicrophone: boolean;
}

function ua(): string {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent || '';
}

export function detectCapabilities(): Capabilities {
  const agent = ua();
  const w = typeof window === 'undefined' ? undefined : (window as unknown as Record<string, unknown>);
  const hasWebSpeech = !!w && (!!w.SpeechRecognition || !!w.webkitSpeechRecognition);
  const isElectron = /electron/i.test(agent);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(agent);
  const isFirefox = /firefox|fxios/i.test(agent);
  const hasWasm = typeof WebAssembly === 'object';
  const hasMicrophone =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  return { hasWebSpeech, isElectron, isSafari, isFirefox, hasWasm, hasMicrophone };
}

/**
 * Web Speech is only *preferred* where it is known to hold a continuous
 * loop. Everywhere else we would rather pay the model download than ship
 * a mic button that does nothing.
 */
export function webSpeechIsTrustworthy(c: Capabilities): boolean {
  if (!c.hasWebSpeech) return false;
  // The constructor is present in Electron but there is no backend behind it.
  if (c.isElectron) return false;
  // Safari exposes it but drops the session constantly; Vosk is steadier.
  if (c.isSafari) return false;
  return true;
}

export type EnginePreference = 'auto' | EngineId;

export function resolveEngine(
  preference: EnginePreference,
  c: Capabilities,
): { engine: EngineId | null; reason: string } {
  if (preference === 'web-speech') {
    return c.hasWebSpeech
      ? { engine: 'web-speech', reason: 'forced by preference' }
      : { engine: null, reason: 'Web Speech is not available in this browser' };
  }
  if (preference === 'vosk') {
    return c.hasWasm
      ? { engine: 'vosk', reason: 'forced by preference' }
      : { engine: null, reason: 'WebAssembly is unavailable' };
  }

  if (webSpeechIsTrustworthy(c)) {
    return { engine: 'web-speech', reason: 'browser speech engine' };
  }
  if (c.hasWasm) {
    const why = c.isElectron
      ? 'desktop build'
      : c.isSafari
        ? 'Safari'
        : c.isFirefox
          ? 'Firefox'
          : 'no browser speech engine';
    return { engine: 'vosk', reason: `offline engine (${why})` };
  }
  return { engine: null, reason: 'no speech engine available on this device' };
}

const PREF_KEY = 'lok-lingu-speech-engine';

export function readEnginePreference(): EnginePreference {
  if (typeof localStorage === 'undefined') return 'auto';
  const v = localStorage.getItem(PREF_KEY);
  return v === 'web-speech' || v === 'vosk' ? v : 'auto';
}

export function writeEnginePreference(p: EnginePreference): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PREF_KEY, p);
}
