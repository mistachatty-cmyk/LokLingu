import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useGetWords, useSubmitScore } from '@workspace/api-client-react';
import { useUser } from '../hooks/use-user';
import { useToast } from '../hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, RotateCcw, Home, Check, Eraser, Eye, EyeOff, AlertCircle, Timer, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DrawCanvas, type DrawCanvasHandle } from '@/components/draw-canvas';
import { useCelebration } from '@/hooks/use-celebration';
import { useCelebrationSound } from '@/hooks/use-celebration-sound';
import { CelebrationEffect } from '@/components/celebration-effect';
import { WordPop } from '@/components/word-pop';
import { GlitchText } from '@/components/glitch-text';
import { useTheme } from '@/hooks/use-theme';

const INK_COLORS = [
  { label: 'Primary', value: 'hsl(var(--primary))' },
  { label: 'Rose', value: 'hsl(330 100% 60%)' },
  { label: 'Amber', value: 'hsl(38 100% 55%)' },
  { label: 'Violet', value: 'hsl(270 70% 60%)' },
  { label: 'White', value: '#ffffff' },
  { label: 'Charcoal', value: 'hsl(220 10% 30%)' },
];

import { FALLBACK_WORDS, saveLocalScore } from '@/lib/offline-data';
import { speakWord } from '@/lib/speech-utils';

export default function Draw() {
  const [, setLocation] = useLocation();
  const { userId } = useUser();
  const { toast } = useToast();

  const language = localStorage.getItem('lok-lingu-lang') || 'es';
  const category = localStorage.getItem('lok-lingu-cat') || 'numbers';

  const { data: apiWords } = useGetWords(language, category, {
    query: { enabled: true, queryKey: ['words', language, category] },
  });

  const words = useMemo(
    () => apiWords || FALLBACK_WORDS[language]?.[category] || FALLBACK_WORDS['es']['numbers'],
    [apiWords, language, category],
  );

  const submitScore = useSubmitScore({
    mutation: {
      onError: () => {
        // Silently handled by local score saving
      },
    },
  });

  const [wordIndex, setWordIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [inkColor, setInkColor] = useState(INK_COLORS[0].value);
  const [showGuide, setShowGuide] = useState(true);
  const [wordPopActive, setWordPopActive] = useState(false);

  const celebration = useCelebration();
  const sound = useCelebrationSound();
  const { theme } = useTheme();

  const canvasRef = useRef<DrawCanvasHandle>(null);

  const handleSuccess = useCallback(() => {
    if (status !== 'idle' || gameOver) return;
    setStatus('success');
    setWordPopActive(true);

    setCount((prevCount) => prevCount + 1);

    celebration.incrementMatch(language);

    if (canvasRef.current) {
      canvasRef.current.fadeOut(900);
    }

    setTimeout(() => {
      if (!words) return;
      const next = (wordIndex + 1) % words.length;
      setWordIndex(next);
      setStatus('idle');
    }, 1000);
  }, [status, gameOver, wordIndex, words, celebration, language]);

  const handleFailure = useCallback(() => {
    if (status !== 'idle' || gameOver) return;
    setStatus('error');
    const newLives = lives - 1;
    setLives(newLives);

    setTimeout(() => {
      if (newLives <= 0) {
        setGameOver(true);
        const currentUserId = userId || 1;
        saveLocalScore({
          userId: currentUserId,
          language,
          category,
          count,
        });
        if (userId) {
          submitScore.mutate({ data: { userId, language, category, count, tokensEarned: celebration.tokensEarnedRef.current } });
        }
      } else {
        if (canvasRef.current) canvasRef.current.clear();
        setStatus('idle');
      }
    }, 600);
  }, [status, gameOver, lives, userId, language, category, count, submitScore, celebration.tokensEarnedRef]);

  const handleClear = useCallback(() => {
    if (canvasRef.current) canvasRef.current.clear();
  }, []);

  const handleDone = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.getStrokes() < 1) {
      handleFailure();
      return;
    }

    handleSuccess();
  }, [handleSuccess, handleFailure]);

  useEffect(() => {
    if (!userId) setLocation('/');
  }, [userId, setLocation]);

  useEffect(() => {
    if (currentWord) {
      const timer = setTimeout(() => speakWord(currentWord.word, language), 400);
      return () => clearTimeout(timer);
    }
  }, [wordIndex, currentWord, language]);

  if (!userId) return null;

  const currentWord = words?.[wordIndex];

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden flex flex-col select-none">
      {wordPopActive && (
        <WordPop onComplete={() => setWordPopActive(false)} />
      )}

      {celebration.milestone && (
        <CelebrationEffect
          celebration={celebration.milestone.celebration}
          intensity={celebration.milestone.intensity}
          onComplete={() => celebration.clearMilestone()}
        />
      )}

      <div className="absolute top-0 left-0 w-full px-6 pt-6 flex justify-between items-start z-10">
        <div className="flex flex-col gap-1">
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
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">
            {language.toUpperCase()} · {celebration.lifetimeWords(language).toLocaleString()}
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Streak</span>
              {celebration.boostActive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 text-[10px] font-black text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full animate-pulse">
                      <Sparkles className="w-3 h-3" /> 2x
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">2x Tokens Active! Congratulations on 100 streak!</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div
              className="game-word text-5xl font-black leading-none word-glow"
              style={{ color: 'var(--word-color)' }}
            >
              {count}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <AnimatePresence mode="wait">
          {!gameOver ? (
            <motion.div
              key={wordIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm space-y-4"
            >
              <div
                className={`text-center space-y-1 transition-all duration-300 ${
                  status === 'error' ? 'animate-[shake_0.3s_ease-in-out]' : ''
                }`}
              >
                {theme === 'theme-ultimate' && status === 'idle' ? (
                  <GlitchText
                    text={currentWord.word}
                    as="h1"
                    className="game-word text-3xl font-black capitalize word-glow"
                    delay={0}
                    interval={50}
                    glitchDuration={80}
                  />
                ) : (
                  <h1
                    className={`game-word text-3xl font-black capitalize ${
                      status === 'error' ? 'neon-text-glow-destructive text-destructive' : 'word-glow'
                    }`}
                    style={{ color: status === 'error' ? undefined : 'var(--word-color)' }}
                  >
                    {currentWord.word}
                  </h1>
                )}
                <p className="text-sm text-muted-foreground font-serif italic">{currentWord.translation}</p>
              </div>

              <div
                className={`relative rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                  status === 'error' ? 'border-destructive' : status === 'success' ? 'border-primary' : 'border-border'
                }`}
              >
                <DrawCanvas
                  ref={canvasRef}
                  color={inkColor}
                  bg="hsl(var(--card))"
                  ghostText={showGuide ? currentWord.word : undefined}
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {INK_COLORS.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => setInkColor(c.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      inkColor === c.value ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ background: c.value }}
                    aria-label={c.label}
                  />
                ))}
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => currentWord && speakWord(currentWord.word, language)}
                  className="gap-2"
                >
                  <Volume2 className="w-4 h-4" /> Listen
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowGuide(!showGuide)} className="gap-2">
                  {showGuide ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  Guide
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear} className="gap-2">
                  <Eraser className="w-4 h-4" /> Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleDone}
                  className="gap-2"
                  disabled={status === 'success' || status === 'error'}
                >
                  <Check className="w-4 h-4" /> Done
                </Button>
              </div>

              {status === 'success' && (
                <p className="text-center text-sm text-primary font-bold animate-pulse">Correct! ✨</p>
              )}
              {status === 'error' && (
                <p className="text-center text-sm text-destructive font-bold">Not quite, try again!</p>
              )}
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
                  You drew {count} word{count !== 1 ? 's' : ''}.
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
                    celebration.resetMatch();
                    setCount(0);
                    setLives(3);
                    setWordIndex(0);
                    setStatus('idle');
                    setGameOver(false);
                    if (canvasRef.current) canvasRef.current.clear();
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

      {celebration.boostActive && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-orange-400/15 border border-orange-400/30 rounded-full px-3 py-1.5 backdrop-blur-sm cursor-help">
              <Timer className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-mono font-bold text-orange-400 tabular-nums">
                {Math.floor(celebration.boostTimeLeft / 60)}:{(celebration.boostTimeLeft % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">2x</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">2x Token Boost! 4 tokens per word. Keep going!</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
