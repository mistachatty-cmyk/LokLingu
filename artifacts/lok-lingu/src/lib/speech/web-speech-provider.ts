import type { ProviderInit, SpeechErrorCode, SpeechProvider } from './types';

/* ------------------------------------------------------------------
   Web Speech provider.

   One recognition instance for the provider's life. Rebuilding it while
   the microphone is still being released is what throws InvalidStateError,
   and a swallowed throw is what used to kill the loop permanently.
------------------------------------------------------------------ */

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: SpeechResultEvent) => void) | null;
}

interface SpeechResultEvent {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; length: number; [j: number]: { transcript: string } };
  };
}

function mapError(code: string): SpeechErrorCode {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not-allowed';
    case 'no-speech':
      return 'no-speech';
    case 'aborted':
      return 'aborted';
    case 'network':
      return 'network';
    default:
      return 'unknown';
  }
}

export function createWebSpeechProvider(init: ProviderInit): SpeechProvider {
  const { callbacks } = init;
  let lang = init.lang;
  let rec: ISpeechRecognition | null = null;
  let destroyed = false;

  const build = (): ISpeechRecognition | null => {
    if (rec) return rec;
    const w = window as unknown as {
      SpeechRecognition?: new () => ISpeechRecognition;
      webkitSpeechRecognition?: new () => ISpeechRecognition;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return null;

    const r = new Ctor();
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 5;
    r.lang = lang;

    r.onstart = () => callbacks.onListening();

    r.onresult = (event: SpeechResultEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const isFinal = !!result.isFinal;
        // Every alternative is offered to the matcher, not just the top
        // one — the engine's second guess is often the right word.
        for (let j = 0; j < (result.length ?? 1); j++) {
          const transcript = result[j]?.transcript?.trim();
          if (transcript) callbacks.onUpdate({ transcript, isFinal });
        }
      }
    };

    r.onerror = (e) => callbacks.onError(mapError(e?.error ?? 'unknown'), e?.error);
    r.onend = () => callbacks.onSessionEnd();

    rec = r;
    return r;
  };

  return {
    id: 'web-speech',
    selfSustaining: false,

    async start() {
      if (destroyed) return;
      const r = build();
      if (!r) {
        callbacks.onError('engine-unavailable', 'SpeechRecognition constructor missing');
        throw new Error('web-speech unavailable');
      }
      r.lang = lang;
      // Throws InvalidStateError if the previous session is still closing.
      // The caller backs off and retries rather than treating it as fatal.
      r.start();
    },

    stop() {
      try {
        rec?.stop();
      } catch {
        /* already stopped */
      }
    },

    destroy() {
      destroyed = true;
      const r = rec;
      rec = null;
      if (!r) return;
      r.onresult = null;
      r.onend = null;
      r.onerror = null;
      r.onstart = null;
      try {
        r.abort();
      } catch {
        /* already dead */
      }
    },

    setLanguage(next: string) {
      lang = next;
      if (rec) rec.lang = next;
    },

    setExpected() {
      // The Web Speech grammar list is a no-op in every shipping browser.
      // Accuracy for expected words is handled by the fuzzy matcher.
    },
  };
}
