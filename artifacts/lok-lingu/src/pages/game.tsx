import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Volume2, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubmitScore } from '@workspace/api-client-react';
import { FALLBACK_WORDS, saveLocalScore } from '@/lib/offline-data';
import { generateNumber, supportsInfiniteCounting } from '@/lib/number-words';
import { useUser } from '@/hooks/use-user';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { speakWord, matchWord, primeVoices, toLocale } from '@/lib/speech-utils';

type NormalWord = { word: string; translation: string; pronunciation?: string };

function normalizeWord(raw: any): NormalWord | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw.trim() ? { word: raw.trim(), translation: '' } : null;
  if (Array.isArray(raw)) {
    const [a, b] = raw;
    return a ? { word: String(a), translation: b ? String(b) : '' } : null;
  }
  if (typeof raw === 'object') {
    const word =
      raw.word ?? raw.text ?? raw.term ?? raw.foreign ?? raw.target ?? raw.native ?? raw.value;
    const translation =
      raw.translation ?? raw.meaning ?? raw.english ?? raw.en ?? raw.definition ?? raw.gloss ?? '';
    if (word == null || String(word).trim() === '') return null;
    const pronunciation = raw.pronunciation ?? raw.romaji ?? raw.pinyin ?? raw.transliteration;
    return {
      word: String(word),
      translation: String(translation ?? ''),
      pronunciation: pronunciation ? String(pronunciation) : undefined,
    };
  }
  return null;
}

interface Resolved {
  words: NormalWord[];
  /** True when we had to substitute another language's list. */
  substituted: boolean;
}

/**
 * Only ever falls back within the requested language. Substituting Spanish
 * for a missing Japanese list used to leave the player speaking Japanese at
 * Spanish targets with no way to score, so a substitution is now surfaced.
 */
function resolveWords(language: string, category: string): Resolved {
  const clean = (c: unknown): NormalWord[] =>
    Array.isArray(c) ? (c.map(normalizeWord).filter(Boolean) as NormalWord[]) : [];

  const exact = clean(FALLBACK_WORDS?.[language]?.[category]);
  if (exact.length) return { words: exact, substituted: false };

  const sameLanguage = clean(FALLBACK_WORDS?.[language]?.numbers);
  if (sameLanguage.length) return { words: sameLanguage, substituted: true };

  return { words: [], substituted: false };
}

export default function Game() {
  const language = localStorage.getItem('lok-lingu-lang') || 'es';
  const category = localStorage.getItem('lok-lingu-cat') || 'numbers';

  const [wordIndex, setWordIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'hit' | 'miss'>('idle');
  const [isActive, setIsActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Numbers are a sequence, not a list: when the language has a generator the
  // player can keep counting past the end of any table, forever.
  const infinite = category === 'numbers' && supportsInfiniteCounting(language);

  const { words, substituted } = useMemo(
    () => resolveWords(language, category),
    [language, category],
  );

  const currentWord: NormalWord | undefined = useMemo(() => {
    if (infinite) {
      const generated = generateNumber(wordIndex + 1, language);
      if (generated) return generated;
    }
    return words[wordIndex % Math.max(words.length, 1)];
  }, [infinite, wordIndex, language, words]);

  const currentWordRef = useRef(currentWord);
  currentWordRef.current = currentWord;
  const lockedRef = useRef(false);

  const { userId } = useUser();
  const submitScore = useSubmitScore({
    mutation: {
      // Local save below is the source of truth for the offline leaderboard.
      onError: () => {},
    },
  });

  // A "run" is everything between starting and stopping the mic. The speech
  // game has no game-over, so the run is committed when the user stops it
  // (or leaves the page) — otherwise nothing ever reaches the leaderboard.
  const streakRef = useRef(streak);
  streakRef.current = streak;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const submitRef = useRef(submitScore);
  submitRef.current = submitScore;

  const commitRun = useCallback(() => {
    const count = streakRef.current;
    if (count <= 0) return;
    streakRef.current = 0;
    const uid = userIdRef.current;
    saveLocalScore({ userId: uid ?? 1, language, category, count });
    if (uid) {
      submitRef.current.mutate({ data: { userId: uid, language, category, count } });
    }
  }, [language, category]);

  useEffect(() => primeVoices(), []);

  // Commit an in-progress run if the player navigates away mid-session.
  useEffect(() => () => commitRun(), [commitRun]);

  const handleResult = useCallback((spoken: string, isFinal: boolean) => {
    if (lockedRef.current) return;
    const target = currentWordRef.current?.word;
    if (!target || !spoken) return;

    const alternates = currentWordRef.current?.pronunciation
      ? [currentWordRef.current.pronunciation]
      : [];

    if (matchWord(spoken, target, alternates)) {
      lockedRef.current = true;
      setFeedback('hit');
      setStreak((s) => s + 1);
      setTimeout(() => {
        setWordIndex((i) => i + 1);
        setFeedback('idle');
        lockedRef.current = false;
      }, 400);
      return;
    }

    if (isFinal) {
      setFeedback('miss');
      setTimeout(() => setFeedback('idle'), 500);
    }
  }, []);

  const { isListening, isUnsupported, spokenText, startListening, stopListening } =
    useSpeechRecognition({
      // The hook owns the restart loop now. game.tsx just starts and stops.
      continuous: true,
      onResult: handleResult,
      onError: (err) => {
        console.error('Speech error:', err);
        // Permission failures stop the hook's loop; reflect that in the UI
        // instead of leaving the button stuck on "Ready...".
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setIsActive(false);
          commitRun();
          setStreak(0);
          setMicError('Microphone blocked. Allow mic access and try again.');
        }
      },
      lang: toLocale(language),
    });

  const handleMic = () => {
    if (isActive) {
      setIsActive(false);
      stopListening();
      commitRun();
      setStreak(0);
      return;
    }
    setMicError(null);
    setIsActive(true);
    startListening();
  };

  const handleSlowSpeak = () => speakWord(currentWord?.word ?? '', language, { slow: true });

  if (!currentWord) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-muted-foreground text-sm font-mono">
        No words loaded for {language} / {category}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <div className="flex justify-between items-start p-6 w-full absolute top-0 z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase opacity-40">
            {language} ·{' '}
            {infinite ? `#${wordIndex + 1} · ∞` : `${(wordIndex % words.length) + 1}/${words.length}`}
          </span>
          {substituted && (
            <span className="text-[10px] tracking-widest uppercase text-destructive opacity-80">
              No {category} list — using numbers
            </span>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm tracking-widest uppercase opacity-70">Streak</span>
          <span className="text-4xl font-bold tabular-nums" style={{ color: 'var(--word-color)' }}>
            {streak}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={wordIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col items-center"
          >
            <h1
              className={`text-7xl md:text-9xl font-black tracking-tighter capitalize leading-none transition-colors duration-200 ${
                feedback === 'hit'
                  ? 'text-primary'
                  : feedback === 'miss'
                    ? 'text-destructive'
                    : 'word-glow'
              }`}
              style={{ color: feedback === 'idle' ? 'var(--word-color)' : undefined }}
            >
              {currentWord.word}
            </h1>

            <p className="text-xl md:text-3xl italic opacity-50 mt-5">
              {infinite ? `${wordIndex + 1} · ${currentWord.translation}` : currentWord.translation || '—'}
            </p>

            {currentWord.pronunciation && (
              <p className="text-sm md:text-base font-mono opacity-40 mt-2 tracking-wide">
                {currentWord.pronunciation}
              </p>
            )}

            <div className="group relative mt-10 flex flex-col items-center">
              <button
                type="button"
                onClick={handleSlowSpeak}
                aria-label="Pronounce slowly"
                className="flex h-14 w-14 items-center justify-center rounded-full border border-foreground/15 text-foreground/70 transition-all duration-300 hover:border-primary hover:text-primary hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
              >
                <Volume2 size={24} />
              </button>
              <span className="pointer-events-none mt-3 text-[11px] uppercase tracking-[0.2em] opacity-0 translate-y-1 transition-all duration-500 ease-out group-hover:opacity-60 group-hover:translate-y-0 group-focus-within:opacity-60 group-focus-within:translate-y-0 motion-reduce:transition-none">
                Tap to pronounce slowly
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="h-6 text-center text-xs font-mono opacity-60">
        {spokenText || ''}
      </div>

      <div className="pb-14 px-6 flex flex-col items-center gap-3 w-full">
        <button
          onClick={handleMic}
          disabled={isUnsupported}
          className={`flex items-center justify-center gap-3 w-full max-w-sm py-4 rounded-full text-lg font-bold uppercase tracking-widest transition-all duration-300 ${
            isListening
              ? 'bg-transparent border-2 border-primary text-primary animate-pulse'
              : 'bg-primary text-primary-foreground hover:brightness-110 hover:scale-[1.02] active:scale-95 shadow-xl'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isActive ? (
            <>
              <Mic size={22} /> {isListening ? 'Listening...' : 'Ready...'}
            </>
          ) : (
            <>
              <Mic size={22} /> Say the word
            </>
          )}
        </button>
        {isUnsupported && (
          <span className="text-xs opacity-50">Speech recognition needs Chrome or Edge</span>
        )}
        {micError && <span className="text-xs text-destructive opacity-80">{micError}</span>}
      </div>
    </div>
  );
}
