import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useGetWords, useSubmitScore } from '@workspace/api-client-react';
import { useUser } from '../hooks/use-user';
import { useSpeechRecognition } from '../hooks/use-speech-recognition';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Heart, X, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Game() {
  const [, setLocation] = useLocation();
  const { userId } = useUser();

  const language = localStorage.getItem('lok-lingu-lang') || 'es';
  const category = localStorage.getItem('lok-lingu-cat') || 'numbers';

  const { data: words, isLoading: isLoadingWords } = useGetWords(language, category, {
    query: { enabled: true, queryKey: ['words', language, category] },
  });
  const submitScore = useSubmitScore();

  const [wordIndex, setWordIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const wordsRef = useRef(words);
  const wordIndexRef = useRef(0);
  const livesRef = useRef(3);
  const countRef = useRef(0);
  const statusRef = useRef<'idle' | 'success' | 'error'>('idle');
  const gameOverRef = useRef(false);
  const userIdRef = useRef(userId);
  const submitRef = useRef(submitScore);

  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { submitRef.current = submitScore; }, [submitScore]);

  const setStatusSync = useCallback((s: 'idle' | 'success' | 'error') => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const setSpokenTextRef = useRef<(text: string) => void>(() => {});

  const handleSuccess = useCallback(() => {
    if (statusRef.current !== 'idle') return;
    setStatusSync('success');
    const newCount = countRef.current + 1;
    countRef.current = newCount;
    setCount(newCount);

    setTimeout(() => {
      if (!wordsRef.current) return;
      const next = (wordIndexRef.current + 1) % wordsRef.current.length;
      wordIndexRef.current = next;
      setWordIndex(next);
      setSpokenTextRef.current('');
      setStatusSync('idle');
    }, 400);
  }, [setStatusSync]);

  const handleFailure = useCallback(() => {
    if (statusRef.current !== 'idle') return;
    setStatusSync('error');
    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);

    setTimeout(() => {
      if (newLives <= 0) {
        gameOverRef.current = true;
        setGameOver(true);
        if (userIdRef.current) {
          submitRef.current.mutate({
            data: { userId: userIdRef.current, language, category, count: countRef.current },
          });
        }
      } else {
        setSpokenTextRef.current('');
        setStatusSync('idle');
      }
    }, 600);
  }, [setStatusSync, language, category]);

  const currentWord = words![wordIndex];
  const targetWord = currentWord?.word ?? '';

  const { isListening, spokenText, setSpokenText, startListening } = useSpeechRecognition(
    language,
    targetWord,
    { onMatch: handleSuccess, onMismatch: handleFailure },
    !gameOver && !!currentWord,
  );

  useEffect(() => { setSpokenTextRef.current = setSpokenText; }, [setSpokenText]);

  useEffect(() => {
    if (!userId) setLocation('/');
  }, [userId, setLocation]);

  if (!userId) return null;

  if (isLoadingWords || !words) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Mic className="w-12 h-12 text-primary" />
        </motion.div>
        <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest">Loading words…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden flex flex-col select-none">
      <div className="absolute top-0 left-0 w-full px-6 pt-6 flex justify-between items-start z-10">
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <Heart
              key={i}
              className={`w-8 h-8 transition-all duration-300 ${
                i < lives ? 'text-destructive fill-destructive' : 'opacity-20 text-muted-foreground'
              }`}
            />
          ))}
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Streak</div>
          <div className="game-word text-5xl font-black leading-none word-glow" style={{ color: 'var(--word-color)' }}>
            {count}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center z-0 px-6">
        <AnimatePresence mode="wait">
          {!gameOver ? (
            <motion.div
              key={wordIndex}
              initial={{ scale: 0.8, opacity: 0, filter: 'blur(12px)' }}
              animate={
                status === 'error'
                  ? { x: [-12, 12, -10, 10, 0], scale: 1.05 }
                  : status === 'success'
                    ? { scale: 1.4, opacity: 0, filter: 'blur(20px)' }
                    : { scale: 1, opacity: 1, filter: 'blur(0px)' }
              }
              exit={{ opacity: 0, scale: 1.15, filter: 'blur(8px)' }}
              transition={{ duration: status === 'error' ? 0.35 : 0.2 }}
              className="text-center w-full"
            >
              {currentWord ? (
                <>
                  <h1
                    className={`game-word text-7xl md:text-8xl font-black mb-5 capitalize leading-tight ${
                      status === 'idle' ? 'word-glow' : ''
                    } ${status === 'error' ? 'neon-text-glow-destructive' : ''} ${
                      status === 'success' ? 'neon-text-glow' : ''
                    }`}
                    style={{
                      color:
                        status === 'idle'
                          ? 'var(--word-color)'
                          : status === 'error'
                            ? 'hsl(var(--destructive))'
                            : 'hsl(var(--primary))',
                    }}
                  >
                    {currentWord.word}
                  </h1>
                  <p className="text-xl md:text-2xl text-muted-foreground font-serif italic">
                    {currentWord.translation}
                  </p>
                </>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center w-full max-w-sm space-y-8 px-4"
            >
              <div>
                <h2 className="text-4xl font-black text-destructive uppercase tracking-widest">Game Over</h2>
                <p className="text-muted-foreground mt-1">
                  You pronounced {count} word{count !== 1 ? 's' : ''}.
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-8">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Final Score</div>
                <div className="game-word text-7xl font-black word-glow" style={{ color: 'var(--word-color)' }}>
                  {count}
                </div>
              </div>
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full h-14 text-lg font-bold uppercase tracking-widest"
                  onClick={() => {
                    setCount(0);
                    setLives(3);
                    setWordIndex(0);
                    setStatusSync('idle');
                    gameOverRef.current = false;
                    setGameOver(false);
                  }}
                >
                  <RotateCcw className="w-5 h-5 mr-2" /> Play Again
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-14 text-lg font-bold uppercase tracking-widest bg-transparent"
                  onClick={() => setLocation('/')}
                >
                  <Home className="w-5 h-5 mr-2" /> Main Menu
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!gameOver && (
        <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col items-center z-10">
          <div className="h-8 mb-5 flex items-center justify-center pointer-events-none">
            <AnimatePresence>
              {spokenText && (
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-base text-muted-foreground font-mono bg-background/80 px-4 py-1 rounded-full backdrop-blur"
                >
                  "{spokenText}"
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            onClick={startListening}
            aria-label={isListening ? 'Microphone active' : 'Tap to activate microphone'}
            animate={
              status === 'success'
                ? { scale: [1, 1.25, 1] }
                : status === 'error'
                  ? { scale: [1, 0.75, 1] }
                  : isListening
                    ? { scale: [1, 1.08, 1] }
                    : { scale: 1 }
            }
            transition={{
              repeat: status === 'idle' && isListening ? Infinity : 0,
              duration: 1.4,
            }}
            className={`p-6 rounded-full shadow-xl backdrop-blur cursor-pointer active:scale-95 transition-transform ${
              status === 'success'
                ? 'bg-primary/20 text-primary'
                : status === 'error'
                  ? 'bg-destructive/20 text-destructive'
                  : isListening
                    ? 'bg-card border-2 border-primary/50 text-primary'
                    : 'bg-card border-2 border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {status === 'error' ? <X className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </motion.button>

          <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 pointer-events-none">
            {isListening ? 'Listening…' : 'Tap mic to start'}
          </p>
        </div>
      )}
    </div>
  );
}
