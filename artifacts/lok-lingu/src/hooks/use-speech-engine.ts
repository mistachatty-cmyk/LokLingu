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

// iOS WebKit needs ~500 ms after onend before it accepts a new r.start().
// 300 ms is enough on desktop/Android Chrome but causes InvalidStateError
// on iOS, which the caller retries with exponential backoff — wasting ~1s.
const IS_IOS_ENGINE = /iphone|ipad|ipod/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : '',
);
const RESTART_DELAY_MS = IS_IOS_ENGINE ? 500 : 300;
const MAX_RESTART_DELAY_MS = 2000;
/**
 * How many start/end cycles with zero transcripts before we conclude the
 * engine is not really working and try the other one. Chrome ends sessions
 * silently when it cannot reach its speech backend, which looks exactly
 * like "Listening..." forever.
 */
const EMPTY_SESSIONS_BEFORE_FALLBACK = 3;

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
  /**
   * Override the base restart delay (ms between onend and the next r.start()).
   * A safe floor of 150ms is enforced on iOS regardless of this value.
   * When omitted, defaults to RESTART_DELAY_MS (platform-appropriate baseline).
   */
  restartDelay?: number;
}

export function useSpeechEngine({
  onResult,
  onError,
  lang,
  expected,
  restartDelay: restartDelayProp,
}: SpeechEngineOptions) {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [engine, setEngine] = useState<EngineId | null>(null);
  const [engineNote, setEngineNote] = useState<string>('');
  /** Last non-fatal problem, surfaced so a silent engine is never invisible. */
  const [lastError, setLastError] = useState<SpeechErrorCode | null>(null);
  /** Sessions that started and ended without producing a single transcript. */
  const [emptySessions, setEmptySessions] = useState(0);

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

  // Preferred base restart delay — caller can override for accessibility speed modes.
  // iOS floor (150ms) is enforced to prevent InvalidStateError on rapid restarts.
  const baseDelayMs = restartDelayProp !== undefined
    ? Math.max(restartDelayProp, IS_IOS_ENGINE ? 150 : 80)
    : RESTART_DELAY_MS;
  const baseDelayRef = useRef(baseDelayMs);
  baseDelayRef.current = baseDelayMs;

  const providerRef = useRef<SpeechProvider | null>(null);
  const wantListeningRef = useRef(false);
  const pendingStartRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartDelayRef = useRef(baseDelayMs);
  const unmountedRef = useRef(false);
  const triedFallbackRef = useRef(false);
  const gotResultThisSessionRef = useRef(false);
  const emptyStreakRef = useRef(0);
  const scheduleStartRef = useRef<() => void>(() => {});
  /** Forward handle so handlers built early can swap the engine. */
  const switchEngineRef = useRef<(from: EngineId) => void>(() => {});

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
          gotResultThisSessionRef.current = true;
          emptyStreakRef.current = 0;
          setEmptySessions(0);
          setLastError(null);
          setSpokenText(transcript);
          onResultRef.current?.(transcript, isFinal);
        },
        onListening: () => {
          pendingStartRef.current = false;
          restartDelayRef.current = baseDelayRef.current;
          gotResultThisSessionRef.current = false;
          setIsListening(true);
        },
        onSessionEnd: () => {
          pendingStartRef.current = false;
          setIsListening(false);

          // An engine that starts, ends, and never returns a word is broken
          // even though nothing threw. Chrome does this when it cannot reach
          // its speech backend. Count it and switch engines rather than
          // sitting on "Listening..." forever.
          if (!gotResultThisSessionRef.current) {
            emptyStreakRef.current += 1;
            setEmptySessions(emptyStreakRef.current);
            if (emptyStreakRef.current >= EMPTY_SESSIONS_BEFORE_FALLBACK && !triedFallbackRef.current) {
              triedFallbackRef.current = true;
              emptyStreakRef.current = 0;
              switchEngineRef.current(id);
              return;
            }
          }

          if (wantListeningRef.current) scheduleStartRef.current();
        },
        onError: (code: SpeechErrorCode) => {
          pendingStartRef.current = false;
          if (code === 'no-speech' || code === 'aborted') return;

          setLastError(code);

          // 'network' means the browser engine cannot reach its speech
          // service. Retrying it forever is pointless — switch engines.
          if (code === 'network' && !triedFallbackRef.current) {
            triedFallbackRef.current = true;
            switchEngineRef.current(id);
            return;
          }

          if (code === 'not-allowed') {
            wantListeningRef.current = false;
            clearTimer();
            setIsListening(false);
            onErrorRef.current?.(code);
            return;
          }

          if (code === 'engine-unavailable' && !triedFallbackRef.current) {
            triedFallbackRef.current = true;
            switchEngineRef.current(id);
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

  /** Tear down the current engine and bring the other one up in its place. */
  const switchEngine = useCallback(
    (from: EngineId) => {
      const other: EngineId = from === 'web-speech' ? 'vosk' : 'web-speech';
      const caps = capsRef.current;

      // Only switch to something that can actually run here.
      const otherViable =
        other === 'vosk'
          ? caps.hasWasm && voskModelConfigured(langRef.current.split('-')[0].toLowerCase())
          : caps.hasWebSpeech;

      if (!otherViable) {
        // No fallback engine is available. Instead of going permanently
        // silent, reset the empty-session counter and keep retrying the
        // current engine. This keeps voice alive on devices where Vosk
        // is not configured — the mic stays active through intermittent
        // Chrome speech-backend blips rather than dying after 3 misses.
        emptyStreakRef.current = 0;
        triedFallbackRef.current = false;
        setEngineNote(`${from} retrying — no fallback available`);
        if (wantListeningRef.current) scheduleStartRef.current();
        return;
      }

      disposeProvider();
      setEngine(other);
      setEngineNote(`switched from ${from} — it returned nothing`);
      providerRef.current = buildProvider(other);
      scheduleStartRef.current();
    },
    [buildProvider, disposeProvider],
  );

  switchEngineRef.current = switchEngine;

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
    restartDelayRef.current = baseDelayRef.current;
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

  /**
   * Abort the current session early without stopping the listening loop.
   * Call this immediately after a word match so onend fires right away and
   * the restart timer starts in parallel with the hit animation, rather than
   * waiting for the engine to close the session naturally (~200–500ms later).
   * Unlike stopListening(), wantListeningRef stays true so the loop restarts.
   */
  const abortSession = useCallback(() => {
    providerRef.current?.stop();
  }, []);

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
    lastError,
    emptySessions,
    startListening,
    stopListening,
    abortSession,
  };
}
