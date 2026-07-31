import { useCallback, useEffect, useRef, useState } from 'react';
import {
  detectCapabilities,
  readEnginePreference,
  resolveEngine,
  type EnginePreference,
} from '@/lib/speech/capabilities';
import { createWebSpeechProvider } from '@/lib/speech/web-speech-provider';
import { createVoskProvider } from '@/lib/speech/vosk-provider';
import { voskModelConfigured } from '@/lib/speech/vosk-models';
import type { EngineId, SpeechErrorCode, SpeechProvider } from '@/lib/speech/types';

/* ------------------------------------------------------------------
   The listening loop, independent of engine.

   Rules that keep it alive:
     1. One provider instance per mount. Rebuilding mid-release is what
        throws InvalidStateError.
     2. start() failures retry with backoff. A swallowed throw kills the
        loop forever.
     3. Only a permission failure is fatal. Silence and aborted sessions
        are normal and must not stop anything.
     4. If the chosen engine cannot start at all, fall back to the other
        one rather than leaving a dead mic button.
------------------------------------------------------------------ */

const RESTART_DELAY_MS = 300;
const MAX_RESTART_DELAY_MS = 2000;

const LANG_MAP: Record<string, string> = {
  es: 'es-ES', fr: 'fr-FR', it: 'it-IT', de: 'de-DE', ja: 'ja-JP', pt: 'pt-BR',
  zh: 'zh-CN', ko: 'ko-KR', ru: 'ru-RU', ar: 'ar-SA', hi: 'hi-IN', nl: 'nl-NL',
  pl: 'pl-PL', sv: 'sv-SE', tr: 'tr-TR', th: 'th-TH', vi: 'vi-VN', en: 'en-US',
};

export interface SpeechEngineOptions {
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (code: SpeechErrorCode) => void;
  lang?: string;
  /** Words the player is likely to say — becomes a hard grammar under Vosk. */
  expected?: string[];
  enabled?: boolean;
}

export function useSpeechEngine({
  onResult,
  onError,
  lang,
  expected,
}: SpeechEngineOptions) {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [engine, setEngine] = useState<EngineId | null>(null);
  const [engineNote, setEngineNote] = useState<string>('');

  const capsRef = useRef(detectCapabilities());
  const prefRef = useRef<EnginePreference>(readEnginePreference());

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  const effectiveLang = LANG_MAP[lang ?? ''] ?? lang ?? 'es-ES';
  const langRef = useRef(effectiveLang);
  langRef.current = effectiveLang;

  const expectedRef = useRef<string[]>(expected ?? []);
  expectedRef.current = expected ?? [];

  const providerRef = useRef<SpeechProvider | null>(null);
  const wantListeningRef = useRef(false);
  const pendingStartRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartDelayRef = useRef(RESTART_DELAY_MS);
  const unmountedRef = useRef(false);
  const triedFallbackRef = useRef(false);
  const scheduleStartRef = useRef<() => void>(() => {});

  const clearTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  /** Which engine can we actually use for this language right now? */
  const chooseEngine = useCallback((): { id: EngineId | null; note: string } => {
    const caps = capsRef.current;
    const { engine: picked, reason } = resolveEngine(prefRef.current, caps);
    if (picked !== 'vosk') return { id: picked, note: reason };

    const base = langRef.current.split('-')[0].toLowerCase();
    if (!voskModelConfigured(base)) {
      // No offline model host configured. Web Speech is better than nothing.
      if (caps.hasWebSpeech) {
        return { id: 'web-speech', note: 'browser engine (no offline model configured)' };
      }
      return { id: null, note: 'no offline model configured for this language' };
    }
    return { id: 'vosk', note: reason };
  }, []);

  const disposeProvider = useCallback(() => {
    providerRef.current?.destroy();
    providerRef.current = null;
  }, []);

  const buildProvider = useCallback(
    (id: EngineId): SpeechProvider => {
      const callbacks = {
        onUpdate: ({ transcript, isFinal }: { transcript: string; isFinal: boolean }) => {
          setSpokenText(transcript);
          onResultRef.current?.(transcript, isFinal);
        },
        onListening: () => {
          pendingStartRef.current = false;
          restartDelayRef.current = RESTART_DELAY_MS;
          triedFallbackRef.current = false;
          setIsListening(true);
        },
        onSessionEnd: () => {
          pendingStartRef.current = false;
          setIsListening(false);
          if (wantListeningRef.current) scheduleStartRef.current();
        },
        onError: (code: SpeechErrorCode) => {
          pendingStartRef.current = false;
          if (code === 'no-speech' || code === 'aborted') return;

          if (code === 'not-allowed') {
            wantListeningRef.current = false;
            clearTimer();
            setIsListening(false);
            onErrorRef.current?.(code);
            return;
          }

          if (code === 'engine-unavailable' && !triedFallbackRef.current) {
            // Swap engines once before giving up.
            triedFallbackRef.current = true;
            const other: EngineId = id === 'web-speech' ? 'vosk' : 'web-speech';
            disposeProvider();
            setEngine(other);
            setEngineNote(`fell back to ${other}`);
            providerRef.current = buildProvider(other);
            scheduleStartRef.current();
            return;
          }

          onErrorRef.current?.(code);
        },
      };

      const init = { lang: langRef.current, callbacks };
      return id === 'vosk' ? createVoskProvider(init) : createWebSpeechProvider(init);
    },
    [clearTimer, disposeProvider],
  );

  const ensureProvider = useCallback((): SpeechProvider | null => {
    if (providerRef.current) return providerRef.current;
    const { id, note } = chooseEngine();
    setEngine(id);
    setEngineNote(note);
    if (!id) {
      onErrorRef.current?.('engine-unavailable');
      return null;
    }
    providerRef.current = buildProvider(id);
    return providerRef.current;
  }, [buildProvider, chooseEngine]);

  const attemptStart = useCallback(() => {
    if (unmountedRef.current || !wantListeningRef.current || pendingStartRef.current) return;
    const provider = ensureProvider();
    if (!provider) return;

    provider.setLanguage(langRef.current);
    provider.setExpected(expectedRef.current);
    pendingStartRef.current = true;

    provider.start().catch(() => {
      // Busy microphone or a still-closing session: back off and retry.
      pendingStartRef.current = false;
      restartDelayRef.current = Math.min(restartDelayRef.current * 2, MAX_RESTART_DELAY_MS);
      scheduleStartRef.current();
    });
  }, [ensureProvider]);

  const scheduleStart = useCallback(() => {
    if (unmountedRef.current || !wantListeningRef.current) return;
    // A self-sustaining engine keeps streaming; nothing to restart.
    if (providerRef.current?.selfSustaining && isListening) return;
    clearTimer();
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      attemptStart();
    }, restartDelayRef.current);
  }, [attemptStart, clearTimer, isListening]);

  scheduleStartRef.current = scheduleStart;

  const startListening = useCallback(() => {
    wantListeningRef.current = true;
    restartDelayRef.current = RESTART_DELAY_MS;
    triedFallbackRef.current = false;
    setSpokenText('');
    clearTimer();
    attemptStart();
  }, [attemptStart, clearTimer]);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    clearTimer();
    providerRef.current?.stop();
    setIsListening(false);
  }, [clearTimer]);

  // Keep the grammar in step with the current target word.
  useEffect(() => {
    providerRef.current?.setExpected(expectedRef.current);
  }, [expected]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      wantListeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
      providerRef.current?.destroy();
      providerRef.current = null;
    };
  }, []);

  const caps = capsRef.current;
  const isUnsupported = !caps.hasWebSpeech && !caps.hasWasm;

  return {
    isListening,
    isUnsupported,
    spokenText,
    engine,
    engineNote,
    startListening,
    stopListening,
  };
}
