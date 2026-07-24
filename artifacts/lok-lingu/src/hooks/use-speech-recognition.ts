import { useEffect, useRef, useCallback, useState } from 'react';
import { matchWord } from '../lib/speech-utils';

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

export type SpeechStatus = 'idle' | 'listening' | 'success' | 'error';

export interface SpeechCallbacks {
  onMatch: () => void;
  onMismatch: () => void;
}

const LANG_MAP: Record<string, string> = {
  es: 'es-ES', fr: 'fr-FR', it: 'it-IT', de: 'de-DE', ja: 'ja-JP',
  pt: 'pt-BR', zh: 'zh-CN', ko: 'ko-KR', ru: 'ru-RU', ar: 'ar-SA',
  hi: 'hi-IN', nl: 'nl-NL', pl: 'pl-PL', sv: 'sv-SE', tr: 'tr-TR',
  th: 'th-TH', vi: 'vi-VN',
};

interface SpeechRecognitionOptions {
  onResult?: (text: string) => void;
  lang?: string;
}

export function useSpeechRecognition(
  options: SpeechRecognitionOptions,
): {
  status: SpeechStatus;
  isListening: boolean;
  isUnsupported: boolean;
  spokenText: string;
  setSpokenText: (text: string) => void;
  startListening: () => void;
  stopListening: () => void;
  voiceMode: 'continuous' | 'push-to-talk';
  setVoiceMode: (mode: 'continuous' | 'push-to-talk') => void;
};

export function useSpeechRecognition(
  language: string,
  targetWord: string,
  callbacks: SpeechCallbacks,
  enabled: boolean,
): {
  status: SpeechStatus;
  isListening: boolean;
  isUnsupported: boolean;
  spokenText: string;
  setSpokenText: (text: string) => void;
  startListening: () => void;
  stopListening: () => void;
  voiceMode: 'continuous' | 'push-to-talk';
  setVoiceMode: (mode: 'continuous' | 'push-to-talk') => void;
};

export function useSpeechRecognition(
  ...args: [SpeechRecognitionOptions] | [string, string, SpeechCallbacks, boolean]
) {
  return typeof args[0] === 'object'
    ? useSpeechRecognitionObject(args[0])
    : useSpeechRecognitionPos(...args);
}

function useSpeechRecognitionObject({ onResult, lang }: SpeechRecognitionOptions) {
  const hook = useSpeechRecognitionInternal({ lang });

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!hook.isListening || !onResultRef.current) return;
    const origOnresult = hook.recognitionRef.current?.onresult;
    if (!origOnresult) return;
    const wrapped = (e: SpeechRecognitionResultEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript.toLowerCase().trim();
        if (!transcript) continue;
        onResultRef.current?.(transcript);
      }
    };
    hook.recognitionRef.current!.onresult = wrapped;
  }, [hook.isListening]);

  return hook;
}

function useSpeechRecognitionPos(
  language: string,
  targetWord: string,
  callbacks: SpeechCallbacks,
  enabled: boolean,
) {
  const hook = useSpeechRecognitionInternal({ lang: language });

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const targetRef = useRef(targetWord);
  targetRef.current = targetWord;

  useEffect(() => {
    if (!enabled) {
      hook.stopListening();
      return;
    }
    hook.setSpokenText('');
    const rec = hook.createRecognition(false);
    if (rec) {
      hook.recognitionRef.current = rec;
      rec.onresult = (event: SpeechRecognitionResultEvent) => {
        if (hook.statusRef.current !== 'idle') return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim();
          if (!transcript) continue;
          hook.setSpokenText(transcript);
          const target = targetRef.current;
          if (!target) continue;
          if (matchWord(transcript, target)) {
            callbacksRef.current.onMatch();
            return;
          }
          if (event.results[i].isFinal) {
            callbacksRef.current.onMismatch();
            return;
          }
        }
      };
      try { rec.start(); } catch { /* handled by health check */ }
    }

    if (hook.voiceMode === 'push-to-talk') {
      try { if (hook.recognitionRef.current) hook.recognitionRef.current.stop(); } catch {}
      hook.recognitionRef.current = null;
      hook.setIsListening(false);
      return;
    }

    hook.startHealthCheck();
    return () => { hook.activeRef.current = false; hook.clearHealthCheck(); };
  }, [language, enabled]);

  return hook;
}

function useSpeechRecognitionInternal({ lang }: { lang?: string }) {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [spokenText, setSpokenText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isUnsupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.SpeechRecognition && !window.webkitSpeechRecognition;
  });
  const [voiceMode, setVoiceMode] = useState<'continuous' | 'push-to-talk'>(
    () => (localStorage.getItem('lok-lingu-voice-mode') as 'continuous' | 'push-to-talk') || 'push-to-talk',
  );

  const statusRef = useRef<SpeechStatus>('idle');
  const setStatusSync = useCallback((s: SpeechStatus) => { statusRef.current = s; setStatus(s); }, []);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(true);
  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const effectiveLang = LANG_MAP[lang ?? ''] ?? lang ?? 'es-ES';

  const createRecognition = useCallback((userInitiated: boolean) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = effectiveLang;

    recognition.onstart = () => { lastActivityRef.current = Date.now(); setIsListening(true); };
    recognition.onend = () => {
      if (activeRef.current) {
        setTimeout(() => {
          if (activeRef.current) {
            try { const n = createRecognition(false); if (n) { recognitionRef.current = n; n.start(); } } catch {}
          } else { setIsListening(false); }
        }, 100);
      } else { setIsListening(false); }
    };
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      lastActivityRef.current = Date.now();
      if ((e.error === 'not-allowed' || e.error === 'service-not-allowed') && userInitiated) {
        activeRef.current = false;
        if (healthCheckRef.current) { clearInterval(healthCheckRef.current); healthCheckRef.current = null; }
        setIsListening(false);
      }
    };
    return recognition;
  }, [effectiveLang]);

  const startListening = useCallback(() => {
    if (!activeRef.current) return;
    try {
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
      const n = createRecognition(true);
      if (n) { recognitionRef.current = n; n.start(); }
    } catch {}
  }, [createRecognition]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    try { if (recognitionRef.current) recognitionRef.current.stop(); } catch {}
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startHealthCheck = useCallback(() => {
    healthCheckRef.current = setInterval(() => {
      if (!activeRef.current) return;
      if (Date.now() - lastActivityRef.current > 6000) {
        try { if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {} } catch {}
        const n = createRecognition(false);
        if (n) { recognitionRef.current = n; n.start(); }
        lastActivityRef.current = Date.now();
      }
    }, 2000);
  }, [createRecognition]);

  const clearHealthCheck = useCallback(() => {
    if (healthCheckRef.current) { clearInterval(healthCheckRef.current); healthCheckRef.current = null; }
  }, []);

  return {
    status, isListening, isUnsupported, spokenText,
    setSpokenText, setStatusSync, startListening, stopListening, voiceMode, setVoiceMode,
    recognitionRef, statusRef, activeRef, createRecognition, startHealthCheck, clearHealthCheck,
    setIsListening,
  };
}
