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
};

export function useSpeechRecognition(
  language: string,
  targetWord: string,
  callbacks: SpeechCallbacks,
  enabled: boolean,
) {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [spokenText, setSpokenText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isUnsupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.SpeechRecognition && !window.webkitSpeechRecognition;
  });
  const [voiceMode, setVoiceMode] = useState<'continuous' | 'push-to-talk'>(
    () => (localStorage.getItem('lok-lingu-voice-mode') as 'continuous' | 'push-to-talk') || 'continuous',
  );

  const statusRef = useRef<SpeechStatus>('idle');
  const setStatusSync = useCallback((s: SpeechStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const targetRef = useRef(targetWord);
  targetRef.current = targetWord;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(true);
  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const createRecognition = useCallback((userInitiated: boolean) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANG_MAP[language] || 'es-ES';

    recognition.onstart = () => {
      lastActivityRef.current = Date.now();
      setIsListening(true);
    };

    recognition.onend = () => {
      if (activeRef.current) {
        setTimeout(() => {
          if (activeRef.current) {
            try {
              const newRec = createRecognition(false);
              if (newRec) {
                recognitionRef.current = newRec;
                newRec.start();
              }
            } catch {
              /* recovery will happen via health check */
            }
          } else {
            setIsListening(false);
          }
        }, 100);
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      lastActivityRef.current = Date.now();
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        if (userInitiated) {
          activeRef.current = false;
          if (healthCheckRef.current) {
            clearInterval(healthCheckRef.current);
            healthCheckRef.current = null;
          }
        }
        setIsListening(false);
      }
    };

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      lastActivityRef.current = Date.now();
      if (statusRef.current !== 'idle') return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (!transcript) continue;

        setSpokenText(transcript);

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

    return recognition;
  }, [language]);

  const startListening = useCallback(() => {
    if (!activeRef.current) return;
    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
      const newRec = createRecognition(true);
      if (newRec) {
        recognitionRef.current = newRec;
        newRec.start();
      }
    } catch {
      /* health check will recover */
    }
  }, [createRecognition]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch { /* ignore */ }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopListening();
      return;
    }

    activeRef.current = true;
    setSpokenText('');
    setStatusSync('idle');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = createRecognition(false);
    if (rec) {
      recognitionRef.current = rec;
      try {
        rec.start();
      } catch { /* will be handled by health check */ }
    }

    if (voiceMode === 'push-to-talk') return;

    healthCheckRef.current = setInterval(() => {
      if (!activeRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > 6000) {
        try {
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
          }
          const newRec = createRecognition(false);
          if (newRec) {
            recognitionRef.current = newRec;
            newRec.start();
          }
          lastActivityRef.current = Date.now();
        } catch { /* ignore */ }
      }
    }, 2000);

    return () => {
      activeRef.current = false;
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current);
        healthCheckRef.current = null;
      }
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch { /* ignore */ }
      recognitionRef.current = null;
      setIsListening(false);
    };
  }, [language, enabled, voiceMode, createRecognition, stopListening, setStatusSync]);

  return {
    status,
    isListening,
    isUnsupported,
    spokenText,
    setSpokenText,
    setStatusSync,
    startListening,
    stopListening,
    voiceMode,
    setVoiceMode,
  };
}
