import { useEffect, useRef, useCallback, useState } from 'react';

/* ------------------------------------------------------------------
   LOK Lingu — useSpeechRecognition

   Owns the continuous listen loop. Rules that keep it alive:
     1. ONE recognition instance for the life of the component. We never
        rebuild per utterance — rebuilding while the mic is still being
        released is what throws InvalidStateError.
     2. start() failures RETRY with backoff. A swallowed throw used to
        kill the loop permanently.
     3. Only a real permission failure stops the loop. no-speech and
        aborted are normal and must not be treated as fatal.
     4. Callbacks live in refs, refreshed every render, so handlers
        always see the current target word.
------------------------------------------------------------------ */

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

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

const LANG_MAP: Record<string, string> = {
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
  ja: 'ja-JP',
  pt: 'pt-BR',
  zh: 'zh-CN',
  ko: 'ko-KR',
  ru: 'ru-RU',
  ar: 'ar-SA',
  hi: 'hi-IN',
  nl: 'nl-NL',
  pl: 'pl-PL',
  sv: 'sv-SE',
  tr: 'tr-TR',
  th: 'th-TH',
  vi: 'vi-VN',
  en: 'en-US',
};

/** Base gap before a restart. Chrome needs breathing room after onend. */
const RESTART_DELAY_MS = 350;
/** Backoff ceiling when start() keeps throwing. */
const MAX_RESTART_DELAY_MS = 2000;

export interface SpeechRecognitionOptions {
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  lang?: string;
  /** When true, the hook auto-restarts after every utterance until stopListening(). */
  continuous?: boolean;
}

export function useSpeechRecognition({
  onResult,
  onError,
  onEnd,
  lang,
  continuous = true,
}: SpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [isUnsupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.SpeechRecognition && !window.webkitSpeechRecognition;
  });

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onEndRef = useRef(onEnd);
  onResultRef.current = onResult;
  onErrorRef.current = onError;
  onEndRef.current = onEnd;

  const continuousRef = useRef(continuous);
  continuousRef.current = continuous;

  const effectiveLang = LANG_MAP[lang ?? ''] ?? lang ?? 'es-ES';
  const langRef = useRef(effectiveLang);
  langRef.current = effectiveLang;

  /** User intent: true between startListening() and stopListening(). */
  const wantListeningRef = useRef(false);
  /** True between start() and onstart/onend — blocks double starts. */
  const pendingStartRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartDelayRef = useRef(RESTART_DELAY_MS);
  const unmountedRef = useRef(false);

  /** Forward handle so handlers built early can call the scheduler safely. */
  const scheduleStartRef = useRef<() => void>(() => {});

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  /** Lazily build the single instance. Handlers read from refs only. */
  const ensureRecognition = useCallback((): ISpeechRecognition | null => {
    if (recognitionRef.current) return recognitionRef.current;

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      onErrorRef.current?.('unsupported');
      return null;
    }

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.lang = langRef.current;

    rec.onstart = () => {
      pendingStartRef.current = false;
      restartDelayRef.current = RESTART_DELAY_MS; // healthy start resets backoff
      setIsListening(true);
    };

    rec.onresult = (event: SpeechResultEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const isFinal = !!result.isFinal;
        for (let j = 0; j < (result.length ?? 1); j++) {
          const transcript = result[j]?.transcript?.trim();
          if (!transcript) continue;
          if (j === 0) setSpokenText(transcript);
          onResultRef.current?.(transcript, isFinal);
        }
      }
    };

    rec.onerror = (e) => {
      pendingStartRef.current = false;
      const code = e?.error ?? 'unknown';

      // Normal in a continuous loop. Do not surface, do not stop.
      if (code === 'no-speech' || code === 'aborted') return;

      // Real failures: stop the loop so we don't hammer the mic forever.
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        wantListeningRef.current = false;
        clearRestartTimer();
        setIsListening(false);
      }

      onErrorRef.current?.(code);
    };

    rec.onend = () => {
      pendingStartRef.current = false;
      setIsListening(false);
      onEndRef.current?.();
      if (wantListeningRef.current && continuousRef.current) {
        scheduleStartRef.current();
      }
    };

    recognitionRef.current = rec;
    return rec;
  }, [clearRestartTimer]);

  /**
   * Attempt a start. If the engine is not ready it throws; we back off and
   * try again rather than silently dying. This is the loop's lifeline.
   */
  const attemptStart = useCallback(() => {
    if (unmountedRef.current) return;
    if (!wantListeningRef.current) return;
    if (pendingStartRef.current) return;

    const rec = ensureRecognition();
    if (!rec) return;

    rec.lang = langRef.current;
    pendingStartRef.current = true;

    try {
      rec.start();
    } catch {
      // InvalidStateError: previous session still releasing the mic.
      pendingStartRef.current = false;
      restartDelayRef.current = Math.min(
        restartDelayRef.current * 2,
        MAX_RESTART_DELAY_MS,
      );
      scheduleStartRef.current();
    }
  }, [ensureRecognition]);

  const scheduleStart = useCallback(() => {
    if (unmountedRef.current) return;
    if (!wantListeningRef.current) return;
    clearRestartTimer();
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      attemptStart();
    }, restartDelayRef.current);
  }, [attemptStart, clearRestartTimer]);

  scheduleStartRef.current = scheduleStart;

  const startListening = useCallback(() => {
    wantListeningRef.current = true;
    restartDelayRef.current = RESTART_DELAY_MS;
    setSpokenText('');
    clearRestartTimer();
    attemptStart();
  }, [attemptStart, clearRestartTimer]);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    clearRestartTimer();
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    setIsListening(false);
  }, [clearRestartTimer]);

  // Tear down only on real unmount — never per word.
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      wantListeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      if (!rec) return;
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      rec.onstart = null;
      try {
        rec.abort();
      } catch {
        /* already dead */
      }
    };
  }, []);

  return {
    isListening,
    isUnsupported,
    spokenText,
    startListening,
    stopListening,
  };
}
