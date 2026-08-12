import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useGetWords, useSubmitScore } from '@workspace/api-client-react';
import { recognizeDrawingLocal, primeRecognizer } from '@/lib/draw-recognition-local';
import { useUser } from '../hooks/use-user';
import { useToast } from '../hooks/use-toast';
import {
  Heart, RotateCcw, Home, Check, Eraser, Eye, EyeOff,
  Timer, Sparkles, Volume2, Mic, MicOff, Loader2, ScanText,
} from 'lucide-react';
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
import { TokenEarnedLabel } from '@/components/token-earned-label';
import { FALLBACK_WORDS, saveLocalScore } from '@/lib/offline-data';
import { speakWord, matchWord } from '@/lib/speech-utils';
import { useSpeechEngine } from '@/hooks/use-speech-engine';

const INK_COLORS = [
  { label: 'Primary', value: 'hsl(var(--primary))' },
  { label: 'Rose', value: 'hsl(330 100% 60%)' },
  { label: 'Amber', value: 'hsl(38 100% 55%)' },
  { label: 'Violet', value: 'hsl(270 70% 60%)' },
  { label: 'White', value: '#ffffff' },
  { label: 'Charcoal', value: 'hsl(220 10% 30%)' },
];

const VOICE_CONFIRM_KEY = 'lok-lingu-draw-voice-confirm';

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

  // Pre-warm the Tesseract worker as soon as the page mounts so the first
  // recognition call doesn't have to wait for WASM + language pack loading.
  useEffect(() => { primeRecognizer(language); }, [language]);

  // ── game state ─────────────────────────────────────────────────────────────
  const [wordIndex, setWordIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [inkColor, setInkColor] = useState(INK_COLORS[0].value);
  const [showGuide, setShowGuide] = useState(true);
  const [wordPopActive, setWordPopActive] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  /** Visual recognition in-flight */
  const [isRecognizing, setIsRecognizing] = useState(false);
  /** Shown only in voice-confirm mode after Done is pressed */
  const [awaitingVoice, setAwaitingVoice] = useState(false);
  /** Whether voice confirmation is enabled (opt-in, default off) */
  const [voiceConfirmEnabled, setVoiceConfirmEnabled] = useState(
    () => localStorage.getItem(VOICE_CONFIRM_KEY) === 'true',
  );

  const celebration = useCelebration();
  useCelebrationSound(); // keeps audio context alive
  const { theme } = useTheme();

  // Token earned label — shown briefly near the streak counter after each hit.
  const [tokenLabel, setTokenLabel] = useState<{ key: number; text: string }>({ key: 0, text: '' });

  const canvasRef = useRef<DrawCanvasHandle>(null);
  const lifetimeBase = useRef(parseInt(localStorage.getItem('lok-lingu-lifetime-tokens') || '0'));

  // Refs for stale-closure safety inside the speech onResult callback
  const statusRef = useRef(status);
  statusRef.current = status;
  const gameOverRef = useRef(gameOver);
  gameOverRef.current = gameOver;
  const voiceConfirmRef = useRef(voiceConfirmEnabled);
  voiceConfirmRef.current = voiceConfirmEnabled;

  // Must be declared before the effects below to avoid TDZ errors.
  const currentWord = words?.[wordIndex];
  const currentWordRef = useRef(currentWord);
  currentWordRef.current = currentWord;

  // ── success / failure handlers ─────────────────────────────────────────────
  const handleSuccess = useCallback(() => {
    if (status !== 'idle' || gameOver) return;
    setStatus('success');
    setAwaitingVoice(false);
    setIsRecognizing(false);
    setWordPopActive(true);
    setCount((prev) => prev + 1);
    const { milestoneHit, tokenBonus } = celebration.incrementMatch(language);
    const rate = celebration.boostActive ? 4 : 2;
    const labelText = milestoneHit && tokenBonus > 0 ? `+${tokenBonus} 🎁` : `+${rate}`;
    setTokenLabel((prev) => ({ key: prev.key + 1, text: labelText }));
    canvasRef.current?.fadeOut(900);
    setTimeout(() => {
      if (!words) return;
      setWordIndex((prev) => (prev + 1) % words.length);
      setStatus('idle');
    }, 1000);
  }, [status, gameOver, words, celebration, language]);

  const handleFailure = useCallback(() => {
    if (status !== 'idle' || gameOver) return;
    setStatus('error');
    setAwaitingVoice(false);
    setIsRecognizing(false);
    setShakeKey((k) => k + 1);
    navigator.vibrate?.([80, 40, 140]);
    const newLives = lives - 1;
    setLives(newLives);
    setTimeout(() => {
      if (newLives <= 0) {
        setGameOver(true);
        saveLocalScore({ userId: userId || 1, language, category, count });
        if (userId) {
          submitScore.mutate({ data: { userId, language, category, count } });
        }
      } else {
        canvasRef.current?.clear();
        setStatus('idle');
      }
    }, 600);
  }, [status, gameOver, lives, userId, language, category, count, submitScore]);

  const handleClear = useCallback(() => {
    canvasRef.current?.clear();
  }, []);

  // ── Done handler ───────────────────────────────────────────────────────────
  const handleDone = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || status !== 'idle' || gameOver || isRecognizing) return;

    if (canvas.getStrokes() < 1) {
      handleFailure();
      return;
    }

    // Voice-confirm mode: old behavior — prompt the player to speak.
    if (voiceConfirmEnabled) {
      setAwaitingVoice(true);
      return;
    }

    // Default: free local recognition via Tesseract.js (no API cost).
    // snapshotStrokes() strips the ghost guide from the image so the OCR
    // engine cannot read the watermark instead of the player's actual drawing.
    const imageDataUrl = canvas.snapshotStrokes();
    const word = currentWordRef.current?.word;
    if (!word) return;

    setIsRecognizing(true);
    try {
      const verdict = await recognizeDrawingLocal(imageDataUrl, word, language);
      if (verdict === 'ACCEPT' || verdict === 'CLOSE') {
        handleSuccess();
      } else {
        handleFailure();
      }
    } catch {
      setIsRecognizing(false);
      toast({
        title: 'Recognition unavailable',
        description: "Couldn't read your drawing — try again.",
      });
    }
  }, [
    status, gameOver, isRecognizing, voiceConfirmEnabled,
    handleFailure, handleSuccess, language, toast,
  ]);

  // ── voice engine (used only when voiceConfirmEnabled) ─────────────────────
  // Hooks must always be called — we just conditionally start/stop listening.
  const { isListening, startListening, stopListening } = useSpeechEngine({
    lang: language,
    expected: currentWord ? [currentWord.word] : [],
    onResult: useCallback(
      (spoken: string, isFinal: boolean) => {
        if (!isFinal) return;
        if (!voiceConfirmRef.current) return; // voice mode off — ignore
        if (statusRef.current !== 'idle' || gameOverRef.current) return;
        const target = currentWordRef.current?.word;
        if (!target) return;
        if ((canvasRef.current?.getStrokes() ?? 0) < 1) return;
        const pronunciation = currentWordRef.current?.pronunciation as string | undefined;
        if (matchWord(spoken, target, pronunciation ? [pronunciation] : [])) {
          handleSuccess();
        } else {
          handleFailure();
        }
      },
      [handleSuccess, handleFailure],
    ),
  });

  useEffect(() => {
    if (!voiceConfirmEnabled) return undefined;
    startListening();
    return () => stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceConfirmEnabled]);

  // Toggle voice confirm, persist preference, start/stop mic accordingly
  const toggleVoiceConfirm = useCallback(() => {
    setVoiceConfirmEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(VOICE_CONFIRM_KEY, String(next));
      if (!next) {
        stopListening();
        setAwaitingVoice(false);
      }
      return next;
    });
  }, [stopListening]);

  // ── body scroll lock (from Task #31) ──────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prev;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  // ── TTS on word change ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentWord) return undefined;
    const timer = setTimeout(() => speakWord(currentWord.word, language), 400);
    return () => clearTimeout(timer);
  }, [wordIndex, currentWord, language]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative min-h-screen w-full bg-background overflow-hidden flex flex-col select-none"
      style={{ touchAction: 'none', overscrollBehavior: 'none' } as React.CSSProperties}
    >
      {wordPopActive && <WordPop onComplete={() => setWordPopActive(false)} />}

      {celebration.milestone && (
        <CelebrationEffect
          celebration={celebration.milestone.celebration}
          intensity={celebration.milestone.intensity}
          onComplete={() => celebration.clearMilestone()}
        />
      )}

      {/* ── Header bar ───────────────────────────────────────────────────── */}
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
          {/* Voice confirm toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleVoiceConfirm}
                className={`mt-1 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest transition-all ${
                  voiceConfirmEnabled
                    ? 'bg-primary/15 text-primary border border-primary/40'
                    : 'bg-muted/30 text-muted-foreground border border-border/40'
                }`}
                aria-label={voiceConfirmEnabled ? 'Voice confirm on — tap to disable' : 'Voice confirm off — tap to enable'}
              >
                {voiceConfirmEnabled ? <Mic className="w-3 h-3" /> : <ScanText className="w-3 h-3" />}
                {voiceConfirmEnabled ? 'Voice' : 'Vision'}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[180px] text-center">
              <p className="text-xs">
                {voiceConfirmEnabled
                  ? 'Voice mode: draw then say the word. Tap to switch to AI vision.'
                  : 'Vision mode: draw the word and tap Done — AI checks it. Tap to switch to voice.'}
              </p>
            </TooltipContent>
          </Tooltip>

          <div className="relative text-right">
            <TokenEarnedLabel animKey={tokenLabel.key} label={tokenLabel.text} />
            <span className="text-[10px] font-mono tracking-widest opacity-50 mb-0.5 select-none block">
              🪙 {(lifetimeBase.current + celebration.tokensEarnedRef.current).toLocaleString()}
            </span>
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

      {/* ── Main game area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-24 pb-3 overflow-hidden">
        <AnimatePresence mode="wait">
          {!gameOver ? (
            <motion.div
              key={wordIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm space-y-4"
            >
              {/* Word display */}
              <div
                className={`text-center space-y-1 transition-all duration-300 ${
                  status === 'error' ? 'animate-[shake_0.3s_ease-in-out]' : ''
                }`}
              >
                {theme === 'theme-ultimate' && status === 'idle' ? (
                  <GlitchText
                    text={currentWord.word}
                    as="h1"
                    className="game-word text-4xl font-black capitalize word-glow"
                    delay={0}
                    interval={50}
                    glitchDuration={80}
                  />
                ) : (
                  <h1
                    className={`game-word text-4xl font-black capitalize ${
                      status === 'error' ? 'neon-text-glow-destructive text-destructive' : 'word-glow'
                    }`}
                    style={{ color: status === 'error' ? undefined : 'var(--word-color)' }}
                  >
                    {currentWord.word}
                  </h1>
                )}
                <p className="text-sm text-muted-foreground font-serif italic">{currentWord.translation}</p>
              </div>

              {/* Canvas */}
              <motion.div
                key={shakeKey}
                animate={shakeKey > 0 ? { x: [-14, 14, -10, 10, -6, 6, 0] } : { x: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                style={{ maxHeight: 'clamp(200px, calc(100dvh - 310px), 430px)' }}
                className={`relative rounded-xl border-2 overflow-hidden transition-colors duration-300 ${
                  status === 'error'
                    ? 'border-destructive'
                    : status === 'success'
                      ? 'border-primary'
                      : isRecognizing
                        ? 'border-primary/60'
                        : 'border-border'
                }`}
              >
                <DrawCanvas
                  ref={canvasRef}
                  color={inkColor}
                  bg="hsl(var(--card))"
                  ghostText={showGuide ? currentWord.word : undefined}
                />
                {isRecognizing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-xs font-black uppercase tracking-widest text-primary">
                      Checking…
                    </span>
                  </div>
                )}
                {status === 'error' && !isRecognizing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black text-destructive uppercase tracking-widest opacity-80 drop-shadow-lg select-none">
                      WRONG!
                    </span>
                  </div>
                )}
              </motion.div>

              {/* Ink color picker */}
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

              {/* Action buttons */}
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
                  onClick={() => void handleDone()}
                  className="gap-2"
                  disabled={status === 'success' || status === 'error' || isRecognizing}
                >
                  {isRecognizing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isRecognizing ? 'Checking…' : 'Done'}
                </Button>
              </div>

              {/* Status area */}
              <AnimatePresence>
                {/* Voice confirm banner (voice mode only) */}
                {voiceConfirmEnabled && awaitingVoice && (
                  <motion.div
                    key="awaiting-voice"
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/8 px-5 py-3"
                  >
                    <span className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary animate-pulse">
                      <Mic className="w-4 h-4" />
                      Now say the word!
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      Speak to confirm your drawing
                    </span>
                  </motion.div>
                )}

                {/* Mic status (voice mode only, when not awaiting) */}
                {voiceConfirmEnabled && !awaitingVoice && (
                  <motion.div
                    key="mic-status"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 pt-1"
                  >
                    {isListening ? (
                      <span className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
                        <Mic className="w-3.5 h-3.5" />
                        <span className="font-mono uppercase tracking-widest">Listening…</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                        <MicOff className="w-3.5 h-3.5" />
                        <span className="font-mono uppercase tracking-widest">Say the word</span>
                      </span>
                    )}
                  </motion.div>
                )}

                {/* Vision mode hint */}
                {!voiceConfirmEnabled && !isRecognizing && status === 'idle' && (
                  <motion.div
                    key="vision-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-1.5 pt-1"
                  >
                    <ScanText className="w-3.5 h-3.5 text-muted-foreground/40" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">
                      AI checks your drawing
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {status === 'success' && (
                <p className="text-center text-sm text-primary font-bold animate-pulse">Correct! ✨</p>
              )}
              {status === 'error' && (
                <p className="text-center text-sm text-destructive font-bold">Not quite, try again!</p>
              )}
            </motion.div>
          ) : (
            /* ── Game over screen ──────────────────────────────────────── */
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
              {!userId && (
                <p className="text-sm text-muted-foreground text-center">
                  <span className="font-semibold text-foreground">Sign in</span> to save your score to the leaderboard.
                </p>
              )}
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
                    canvasRef.current?.clear();
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

      {/* ── 2x boost timer ───────────────────────────────────────────────── */}
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
