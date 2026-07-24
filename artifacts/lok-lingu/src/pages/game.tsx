import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Volume2, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FALLBACK_WORDS } from '@/lib/offline-data';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

type NormalWord = { word: string; translation: string };

function normalizeWord(raw: any): NormalWord | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw.trim() ? { word: raw.trim(), translation: '' } : null;
  if (Array.isArray(raw)) {
    const [a, b] = raw;
    return a ? { word: String(a), translation: b ? String(b) : '' } : null;
  }
  if (typeof raw === 'object') {
    const word = raw.word ?? raw.text ?? raw.term ?? raw.foreign ?? raw.target ?? raw.native ?? raw.value;
    const translation = raw.translation ?? raw.meaning ?? raw.english ?? raw.en ?? raw.definition ?? raw.gloss ?? '';
    if (word == null || String(word).trim() === '') return null;
    return { word: String(word), translation: String(translation ?? '') };
  }
  return null;
}

function resolveWords(apiWords: any, language: string, category: string): NormalWord[] {
  const candidates = [
    apiWords,
    (FALLBACK_WORDS as any)?.[language]?.[category],
    (FALLBACK_WORDS as any)?.[language]?.numbers,
    (FALLBACK_WORDS as any)?.es?.numbers,
    [
      { word: 'uno', translation: 'one' },
      { word: 'dos', translation: 'two' },
      { word: 'tres', translation: 'three' },
    ],
  ];
  for (const c of candidates) {
    if (!Array.isArray(c) || c.length === 0) continue;
    const cleaned = c.map(normalizeWord).filter(Boolean) as NormalWord[];
    if (cleaned.length > 0) return cleaned;
  }
  return [];
}

const LOCALES: Record<string, string> = {
  es: 'es-ES', ja: 'ja-JP', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
  pt: 'pt-BR', ko: 'ko-KR', zh: 'zh-CN', ru: 'ru-RU', ar: 'ar-SA',
  hi: 'hi-IN', nl: 'nl-NL', sv: 'sv-SE', pl: 'pl-PL', tr: 'tr-TR',
  vi: 'vi-VN', en: 'en-US',
};

const LISTEN_TIMEOUT_MS = 6000;

export default function Game() {
  const language = localStorage.getItem('lok-lingu-lang') || 'es';
  const category = localStorage.getItem('lok-lingu-cat') || 'numbers';
  const showTranslation = localStorage.getItem('lok-lingu-show-translation') !== 'false';

  const [wordIndex, setWordIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'hit' | 'miss'>('idle');

  const words = useMemo(
    () => resolveWords(undefined, language, category),
    [language, category],
  );

  const currentWord = words[wordIndex % Math.max(words.length, 1)];
  const locale = LOCALES[language] ?? language;
  const currentWordRef = useRef(currentWord);
  currentWordRef.current = currentWord;

  const playAudio = useCallback((text: string) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale;
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }, [locale]);

  const handleResult = useCallback((spoken: string) => {
    const target = currentWordRef.current?.word;
    if (!target || !spoken) return;
    const clean = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
    const hit = clean(spoken).includes(clean(target));

    if (hit) {
      setFeedback('hit');
      setStreak(s => s + 1);
      setWordIndex(i => i + 1);
    } else {
      setFeedback('miss');
    }
    setTimeout(() => setFeedback('idle'), 500);
  }, []);

  const { isListening, startListening, stopListening } = useSpeechRecognition({
    onResult: handleResult,
    lang: locale,
  });

  useEffect(() => {
    if (!isListening) return;
    const t = setTimeout(() => stopListening?.(), LISTEN_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isListening, stopListening]);

  useEffect(() => {
    if (currentWord?.word) {
      const t = setTimeout(() => playAudio(currentWord.word), 200);
      return () => clearTimeout(t);
    }
  }, [wordIndex, currentWord?.word, playAudio]);

  const handleWordClick = () => {
    if (currentWord?.word) playAudio(currentWord.word);
  };

  const handleInteraction = () => {
    if (isListening) { stopListening?.(); return; }
    playAudio(currentWord?.word ?? '');
    startListening?.();
  };

  if (words.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-muted-foreground text-sm font-mono">
        No words loaded
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Top bar — minimal */}
      <div className="flex justify-between items-start p-6 w-full absolute top-0 z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase opacity-40">
            {language} · {wordIndex + 1}/{words.length}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm tracking-widest uppercase opacity-70">Streak</span>
          <span className="text-4xl font-bold tabular-nums" style={{ color: 'var(--word-color)' }}>
            {streak}
          </span>
        </div>
      </div>

      {/* Word — clickable to hear pronunciation */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={wordIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={handleWordClick}
            className="cursor-pointer"
          >
            <h1
              className={`text-7xl md:text-9xl font-black tracking-tighter capitalize leading-none transition-colors duration-200 ${
                feedback === 'hit' ? 'text-primary' : feedback === 'miss' ? 'text-destructive' : 'word-glow'
              }`}
              style={{ color: feedback === 'idle' ? 'var(--word-color)' : undefined }}
            >
              {currentWord.word}
            </h1>
            {showTranslation && currentWord.translation && (
              <p className="text-xl md:text-3xl italic opacity-50 mt-5">{currentWord.translation}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* One button */}
      <div className="pb-14 px-6 flex justify-center w-full">
        <button
          onClick={handleInteraction}
          className={`flex items-center justify-center gap-3 w-full max-w-sm py-4 rounded-full text-lg font-bold uppercase tracking-widest transition-all duration-300 ${
            isListening
              ? 'bg-transparent border-2 border-primary text-primary animate-pulse'
              : 'bg-primary text-primary-foreground hover:brightness-110 hover:scale-[1.02] active:scale-95 shadow-xl'
          }`}
        >
          {isListening ? <><Mic size={22} className="animate-pulse" /> Listening...</> : <><Volume2 size={22} /> Tap to Pronounce</>}
        </button>
      </div>
    </div>
  );
}
