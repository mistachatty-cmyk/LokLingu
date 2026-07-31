import { useEffect, useRef, useCallback, useState } from 'react';

/* ------------------------------------------------------------------
   LokLingu — useSpeechRecognition
   Push-to-talk only. One recognition instance per tap, torn down on
   end. The handler is attached at creation time, never patched later.
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

export interface SpeechRecognitionOptions {
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  lang?: string;
}

export function useSpeechRecognition({ onResult, onError, onEnd, lang }: SpeechRecognitionOptions) {
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

  const effectiveLang = LANG_MAP[lang ?? ''] ?? lang ?? 'es-ES';
  const langRef = useRef(effectiveLang);
  langRef.current = effectiveLang;

  const teardown = useCallback(() => {
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
  }, []);

  const stopListening = useCallback(() => {
    teardown();
    setIsListening(false);
  }, [teardown]);

  const startListening = useCallback(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      onErrorRef.current?.('unsupported');
      return;
    }

    teardown();

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.lang = langRef.current;

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

    rec.onstart = () => setIsListening(true);

    rec.onend = () => {
      if (recognitionRef.current === rec) recognitionRef.current = null;
      setIsListening(false);
      onEndRef.current?.();
    };

    rec.onerror = (e) => {
      onErrorRef.current?.(e.error);
      if (recognitionRef.current === rec) recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = rec;
    setSpokenText('');
    try {
      rec.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [teardown]);

  useEffect(() => teardown, [teardown]);

  return {
    isListening,
    isUnsupported,
    spokenText,
    startListening,
    stopListening,
  };
}
