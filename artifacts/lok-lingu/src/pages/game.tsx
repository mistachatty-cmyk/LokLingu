import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useGetWords, useSubmitScore } from '@workspace/api-client-react';
import { useUser } from '../hooks/use-user';
import { Heart, Volume2, Mic, RotateCcw } from 'lucide-react';
import { FALLBACK_WORDS, saveLocalScore } from '@/lib/offline-data';
import { speakWord } from '@/lib/speech-utils';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

export default function Game() {
  const [, setLocation] = useLocation();
  const { userId } = useUser();

  const language = localStorage.getItem('lok-lingu-lang') || 'es';
  const category = localStorage.getItem('lok-lingu-cat') || 'numbers';

  const { data: apiWords } = useGetWords(language, category, {
    query: { enabled: true, queryKey: ['words', language, category] },
  });

  const submitScore = useSubmitScore({ mutation: { onError: () => {} } });

  const [wordIndex, setWordIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const words = useMemo(
    () => {
      if (apiWords && apiWords.length > 0) return apiWords;
      return FALLBACK_WORDS[language]?.[category] || FALLBACK_WORDS['es']['numbers'];
    },
    [apiWords, language, category],
  );

  const currentWord = words[wordIndex];
  const targetWord = currentWord?.word ?? '';

  const handleMatch = useCallback(() => {
    setStreak((s) => s + 1);
    const next = (wordIndex + 1) % words.length;
    setWordIndex(next);
  }, [wordIndex, words.length]);

  const handleMismatch = useCallback(() => {
    const newLives = lives - 1;
    setLives(newLives);
    if (newLives <= 0) {
      setGameOver(true);
      const uid = userId || 1;
      saveLocalScore({ userId: uid, language, category, count: streak });
      if (userId) {
        submitScore.mutate({ data: { userId, language, category, count: streak, tokensEarned: 0 } });
      }
    }
  }, [lives, userId, language, category, streak, submitScore]);

  const { isListening, startListening, stopListening } = useSpeechRecognition(
    language,
    targetWord,
    { onMatch: handleMatch, onMismatch: handleMismatch },
    !gameOver && !!currentWord,
  );

  useEffect(() => {
    if (currentWord) {
      speakWord(currentWord.word, language);
    }
  }, [wordIndex, currentWord, language]);

  useEffect(() => {
    if (!userId) setLocation('/');
  }, [userId, setLocation]);

  const handleInteraction = () => {
    if (!isListening) {
      if (currentWord) speakWord(currentWord.word, language);
      startListening();
    }
  };

  if (!userId || !currentWord) {
    return <div className="h-screen flex items-center justify-center bg-background text-muted-foreground text-sm font-mono">Loading...</div>;
  }

  if (gameOver || lives <= 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground gap-6 p-6">
        <h1 className="text-6xl font-black text-destructive uppercase tracking-tighter">Game Over</h1>
        <p className="text-2xl font-mono font-bold">Streak: {streak}</p>
        <p className="text-sm text-muted-foreground font-mono italic">You pronounced {streak} word{streak !== 1 ? 's' : ''}</p>
        <button
          onClick={() => {
            setLives(3);
            setWordIndex(0);
            setStreak(0);
            setGameOver(false);
          }}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full text-lg font-bold uppercase tracking-widest hover:brightness-110 transition-all"
        >
          <RotateCcw size={20} /> Play Again
        </button>
        <button
          onClick={() => setLocation('/')}
          className="text-sm text-muted-foreground font-mono underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Main Menu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden select-none">
      {/* Top bar: Lives + Streak */}
      <div className="flex justify-between items-center px-6 pt-6 w-full absolute top-0 left-0 right-0 z-10">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <Heart
              key={i}
              size={32}
              className={`transition-all duration-300 ${
                i < lives ? 'text-destructive fill-destructive' : 'text-muted-foreground/20'
              }`}
            />
          ))}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Streak</span>
          <span className="text-4xl font-black tabular-nums leading-none" style={{ color: 'var(--word-color)' }}>
            {streak}
          </span>
        </div>
      </div>

      {/* Center: Word + Translation */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <h1
          className="text-7xl md:text-9xl font-black tracking-tighter capitalize text-center leading-none word-glow"
          style={{ color: 'var(--word-color)' }}
        >
          {currentWord.word}
        </h1>
        <p className="text-xl md:text-3xl italic text-muted-foreground/70 mt-5 text-center">
          {currentWord.translation}
        </p>
        {currentWord.pronunciation && (
          <p className="text-sm text-muted-foreground/40 font-mono mt-2">
            ({currentWord.pronunciation})
          </p>
        )}
      </div>

      {/* Bottom: One Button */}
      <div className="pb-14 px-6 flex justify-center w-full">
        <button
          onClick={handleInteraction}
          className={`
            flex items-center justify-center gap-3 w-full max-w-sm py-4 rounded-full text-lg font-bold uppercase tracking-widest transition-all duration-300
            ${isListening
              ? 'bg-transparent border-2 border-primary text-primary animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.15)]'
              : 'bg-primary text-primary-foreground hover:brightness-110 hover:scale-[1.02] active:scale-95 shadow-xl'
            }
          `}
        >
          {isListening ? (
            <>
              <Mic size={22} className="animate-pulse" /> Listening...
            </>
          ) : (
            <>
              <Volume2 size={22} /> Tap to Pronounce
            </>
          )}
        </button>
      </div>
    </div>
  );
}
