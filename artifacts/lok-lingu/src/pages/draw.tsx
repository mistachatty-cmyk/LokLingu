import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useGetWords, useSubmitScore } from '@workspace/api-client-react';
import { recognizeDrawingLocal, primeRecognizer } from '@/lib/draw-recognition-local';
import { useUser } from '../hooks/use-user';
import { useToast } from '../hooks/use-toast';
import {
  Heart, RotateCcw, Home, Check, Eraser, Eye, EyeOff,
  Timer, Sparkles, Volume2, VolumeX, Mic, MicOff, Loader2, ScanText, Keyboard,
  Maximize2, Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DrawCanvas, type DrawCanvasHandle } from '@/components/draw-canvas';
import { useCelebration, incrementCategoryLifetime } from '@/hooks/use-celebration';
import { useSettings } from '@/hooks/use-settings';
import { useCelebrationSound } from '@/hooks/use-celebration-sound';
import { CelebrationEffect } from '@/components/celebration-effect';
import { WordPop } from '@/components/word-pop';
import { useTheme } from '@/hooks/use-theme';
import { GameWord, type WordFeedback } from '@/components/game-word';
import { TokenEarnedLabel } from '@/components/token-earned-label';
import { TokenVaultLayer } from '@/components/token-vault-layer';
import { TokenPhysicsLayer, spawnTokenAt } from '@/components/token-physics-layer';
import { FALLBACK_WORDS, saveLocalScore } from '@/lib/offline-data';
import { speakWord, matchWord } from '@/lib/speech-utils';
import { useSpeechEngine } from '@/hooks/use-speech-engine';
import {
  recordAttempt,
  pickNextIndex,
  shouldSchedule,
  summarise,
  type SessionEntry,
} from '@/lib/review';

const INK_COLORS = [
  { label: 'Primary', value: 'hsl(var(--primary))' },
  { label: 'Rose', value: 'hsl(330 100% 60%)' },
  { label: 'Amber', value: 'hsl(38 100% 55%)' },
  { label: 'Violet', value: 'hsl(270 70% 60%)' },
  { label: 'White', value: '#ffffff' },
  { label: 'Charcoal', value: 'hsl(220 10% 30%)' },
];

const VOICE_CONFIRM_KEY = 'lok-lingu-draw-voice-confirm';
const WORD_DISPLAY_KEY = 'lok-lingu-draw-word-display';

const TRACE_GUIDE_KEY = 'lok-lingu-draw-trace-guide';

export default function Draw() {
  const [, setLocation] = useLocation();
  const { userId } = useUser();
  const { toast } = useToast();

  const language = localStorage.getItem('lok-lingu-lang') || 'es';
  const category = localStorage.getItem('lok-lingu-cat') || 'numbers';

  const { data: apiWords } = useGetWords(language, category, {
    query: { enabled: true, queryKey: ['words', language, category] },
  });

  /**
   * THE bug that made the word invisible, and it was never about layout.
   *
   * vercel.json rewrites `/(.*)` to `/index.html`, which also swallows API
   * paths. So in production `GET /words/es/numbers` returns 200 with
   * `text/html` — the app's own shell. custom-fetch infers "text" from that
   * content-type and hands back the raw HTML *string*; `response.ok` is true
   * so nothing throws and react-query records a success.
   *
   * The old `apiWords || FALLBACK_WORDS[...]` then did the damage: a
   * non-empty string is truthy, so the fallback never ran. Indexing a string
   * yields a single character, `"<".word` is undefined, and GameWord
   * rendered an empty <h1> — zero height, no crash, no word. Voice mode was
   * unaffected because it never calls this API at all.
   *
   * Note `[] || fallback` is broken for the same family of reason (an empty
   * array is also truthy), so this checks shape *and* content rather than
   * truthiness.
   */
  const words = useMemo(() => {
    const fromApi = Array.isArray(apiWords) && apiWords.length > 0 ? apiWords : null;
    return fromApi ?? FALLBACK_WORDS[language]?.[category] ?? FALLBACK_WORDS['es']['numbers'];
  }, [apiWords, language, category]);

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
  /* Mirrors voice mode's word feedback so both modes react identically. */
  const [feedback, setFeedback] = useState<WordFeedback>('idle');
  const [inkColor, setInkColor] = useState(INK_COLORS[0].value);
  /**
   * The word above the canvas is NOT optional any more.
   *
   * It used to be one setting of three ('above' | 'canvas' | 'both'), and
   * landing on 'canvas' hid the heading entirely — which is exactly how
   * players ended up staring at a canvas with no word anywhere, since the
   * on-canvas trace guide is a faint watermark and easy to miss. Knowing
   * what you're being asked to draw is not a preference.
   *
   * Only the trace-guide watermark toggles now.
   */
  const [showGhost, setShowGhost] = useState(() => {
    const explicit = localStorage.getItem(TRACE_GUIDE_KEY);
    if (explicit !== null) return explicit === 'true';
    // Migrate the old three-way key: anyone previously on 'above' had the
    // guide off; every other value had it on.
    return localStorage.getItem(WORD_DISPLAY_KEY) !== 'above';
  });
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

  const prefersReducedMotion = useReducedMotion();
  const celebration = useCelebration();
  // On by default (see hooks/use-settings.ts). Previously this setting was
  // declared but nothing read it, so draw mode's three lives were always
  // on with no way to turn them off.
  const { heartsMode } = useSettings();
  useCelebrationSound(); // keeps audio context alive
  const { theme } = useTheme();

  // Token earned label — shown briefly near the streak counter after each hit.
  const [tokenLabel, setTokenLabel] = useState<{ key: number; text: string }>({ key: 0, text: '' });

  const canvasRef = useRef<DrawCanvasHandle>(null);

  // Refs for stale-closure safety inside the speech onResult callback
  const statusRef = useRef(status);
  statusRef.current = status;
  const gameOverRef = useRef(gameOver);
  gameOverRef.current = gameOver;
  const voiceConfirmRef = useRef(voiceConfirmEnabled);
  voiceConfirmRef.current = voiceConfirmEnabled;

  // Must be declared before the effects below to avoid TDZ errors.
  // Bounded the way game.tsx does — pickNextIndex's result is not clamped to
  // the list length, so a raw lookup could fall off the end and hand back
  // undefined, which this file then dereferences unguarded.
  const currentWord = words?.length ? words[wordIndex % words.length] : undefined;
  const currentWordRef = useRef(currentWord);
  /* Review scheduling: what was attempted this run, and the last few
     indices served so the scheduler doesn't repeat the word on screen. */
  const sessionLogRef = useRef<SessionEntry[]>([]);
  const recentRef = useRef<number[]>([]);
  /* The HUD element physics tokens launch from. */
  const tokenAnchorRef = useRef<HTMLDivElement>(null);
  // Optional larger canvas — collapses the ink-color row to give the
  // canvas more room, since it already scales via w-full + aspect-ratio.
  const [expanded, setExpanded] = useState(false);
  currentWordRef.current = currentWord;

  // ── success / failure handlers ─────────────────────────────────────────────
  const handleSuccess = useCallback(() => {
    if (status !== 'idle' || gameOver) return;
    setStatus('success');
    setFeedback('hit');
    setAwaitingVoice(false);
    setIsRecognizing(false);
    setWordPopActive(true);
    setCount((prev) => prev + 1);
    const { milestoneHit, tokenBonus } = celebration.incrementMatch(language);
    incrementCategoryLifetime(language, category);
    const rate = celebration.boostActive ? 4 : 2;
    const labelText = milestoneHit && tokenBonus > 0 ? `+${tokenBonus} 🎁` : `+${rate}`;
    setTokenLabel((prev) => ({ key: prev.key + 1, text: labelText }));
    spawnTokenAt(tokenAnchorRef.current);
    // Promote this word up a Leitner box before advancing.
    const drawn = currentWordRef.current?.word;
    if (drawn) {
      recordAttempt(language, drawn, true);
      sessionLogRef.current.push({ word: drawn, correct: true });
    }
    canvasRef.current?.fadeOut(900);
    setTimeout(() => {
      if (!words) return;
      // Round-robin taught position, not vocabulary. Outside of ordinal
      // categories the next word is now drawn by the review scheduler.
      if (shouldSchedule(category) && words.length > 1) {
        const next = pickNextIndex(language, words.map((w: any) => w.word ?? String(w)), recentRef.current);
        recentRef.current = [...recentRef.current, next].slice(-4);
        setWordIndex(next);
      } else {
        setWordIndex((prev) => (prev + 1) % words.length);
      }
      setStatus('idle');
      setFeedback('idle');
    }, 1000);
  }, [status, gameOver, words, celebration, language, category]);

  const handleFailure = useCallback(() => {
    if (status !== 'idle' || gameOver) return;
    setStatus('error');
    setFeedback('miss');
    // Voice mode clears a miss at a flat 500ms regardless of the response
    // speed preset; matched here so the two feel the same.
    setTimeout(() => setFeedback('idle'), 500);
    setAwaitingVoice(false);
    setIsRecognizing(false);
    setShakeKey((k) => k + 1);
    navigator.vibrate?.([80, 40, 140]);
    // Drops the word to box 0 so it resurfaces soon rather than waiting
    // for the round-robin to come all the way back around.
    const drawn = currentWordRef.current?.word;
    if (drawn) {
      recordAttempt(language, drawn, false);
      sessionLogRef.current.push({ word: drawn, correct: false });
    }
    // With hearts off this is endless practice — a miss still shakes and
    // clears the canvas, it just never ends the run.
    const newLives = heartsMode ? lives - 1 : lives;
    setLives(newLives);
    setTimeout(() => {
      if (heartsMode && newLives <= 0) {
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
  }, [status, gameOver, lives, heartsMode, userId, language, category, count, submitScore]);

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

  // True while speakWord() is playing back. Without this, tapping "Listen"
  // (or the word appearing while speech confirm is still armed) let the
  // TTS saying the exact target word bleed into a hot mic on any device
  // without headphones or real echo cancellation — the recognizer heard
  // its own playback and registered it as the player's answer, which is
  // "I click the audio and it lets the word pass" from the outside.
  const speechMutedRef = useRef(false);

  // ── voice engine (used only when voiceConfirmEnabled) ─────────────────────
  // Hooks must always be called — we just conditionally start/stop listening.
  const { isListening, emptySessions, lastError, startListening, stopListening } = useSpeechEngine({
    lang: language,
    expected: currentWord ? [currentWord.word] : [],
    onResult: useCallback(
      (spoken: string, isFinal: boolean) => {
        if (!isFinal) return;
        if (speechMutedRef.current) return;
        if (!voiceConfirmRef.current) return; // voice answering off — ignore
        if (statusRef.current !== 'idle' || gameOverRef.current) return;
        const target = currentWordRef.current?.word;
        if (!target) return;
        // No strokes gate. Voice is an *alternative* answer, not a second
        // step after drawing — previously you had to draw something before
        // speech counted at all, which made "answer by voice" impossible.
        const pronunciation = currentWordRef.current?.pronunciation as string | undefined;
        if (matchWord(spoken, target, pronunciation ? [pronunciation] : [])) {
          handleSuccess();
        } else {
          // A wrong *spoken* answer shouldn't cost a life the way a wrong
          // drawing does — recognition mishears often enough that it would
          // punish the microphone rather than the player. Let them retry.
          setFeedback('miss');
          setTimeout(() => setFeedback('idle'), 500);
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

  // Typed-answer fallback for "say the word" — same reasoning as game.tsx:
  // no API tells us the mic is being held by a phone call, so repeated
  // empty/failed sessions are treated as the signal instead.
  const [showTypedConfirm, setShowTypedConfirm] = useState(false);
  const [typedConfirm, setTypedConfirm] = useState('');
  const micLikelyBlockedDraw =
    voiceConfirmEnabled && (emptySessions >= 3 || lastError === 'not-allowed' || lastError === 'network');

  useEffect(() => {
    if (micLikelyBlockedDraw) setShowTypedConfirm(true);
  }, [micLikelyBlockedDraw]);

  const submitTypedConfirm = useCallback(() => {
    const value = typedConfirm.trim();
    if (!value) return;
    if (statusRef.current !== 'idle' || gameOverRef.current) return;
    const target = currentWordRef.current?.word;
    if (!target) return;
    const pronunciation = currentWordRef.current?.pronunciation as string | undefined;
    if (matchWord(value, target, pronunciation ? [pronunciation] : [])) {
      handleSuccess();
    } else {
      handleFailure();
    }
    setTypedConfirm('');
  }, [typedConfirm, handleSuccess, handleFailure]);

  // Toggle voice confirm, persist preference, start/stop mic accordingly
  const toggleVoiceConfirm = useCallback(() => {
    setVoiceConfirmEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(VOICE_CONFIRM_KEY, String(next));
      if (!next) {
        stopListening();
        setAwaitingVoice(false);
        setShowTypedConfirm(false);
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

  // Plays a word and mutes voice-confirm matching for the real duration of
  // playback — speakWord's promise already accounts for actual playback
  // length, so this is not a guessed timer.
  const speakMuted = useCallback((word: string) => {
    speechMutedRef.current = true;
    speakWord(word, language).finally(() => {
      speechMutedRef.current = false;
    });
  }, [language]);

  // ── TTS on word change ("voice quip", toggleable) ──────────────────────────
  const [autoSpeak, setAutoSpeak] = useState(
    () => localStorage.getItem('lok-lingu-draw-autospeak') !== 'false',
  );
  useEffect(() => {
    localStorage.setItem('lok-lingu-draw-autospeak', String(autoSpeak));
  }, [autoSpeak]);
  useEffect(() => {
    if (!autoSpeak || !currentWord) return undefined;
    const timer = setTimeout(() => speakMuted(currentWord.word), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordIndex, currentWord, language, autoSpeak]);

  // ── render ─────────────────────────────────────────────────────────────────
  // Mirrors game.tsx. Without it, an empty word list white-screens the page,
  // because everything below dereferences currentWord.word unguarded.
  if (!currentWord) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 bg-background px-8 text-center">
        <Sparkles className="w-12 h-12 text-muted-foreground opacity-60" />
        <div className="space-y-2">
          <p className="text-lg font-black uppercase tracking-widest text-foreground">No words found</p>
          <p className="text-sm text-muted-foreground font-mono">
            No word list for <span className="text-foreground font-bold">{language}</span> /{' '}
            <span className="text-foreground font-bold">{category}</span>.
            <br />Try a different language or category.
          </p>
        </div>
        <Button size="lg" onClick={() => setLocation('/')} className="gap-2">
          <Home className="w-5 h-5" /> Home
        </Button>
      </div>
    );
  }

  return (
    <div
      className="relative draw-screen w-full bg-background overflow-hidden flex flex-col select-none"
      /*
       * `pan-y`, not `none`. Effective touch-action is the intersection across
       * all ancestors, so `none` here silently disabled finger scrolling for
       * the entire subtree — which made the `overflow-y-auto` column below
       * inert and left the Clear/Done row unreachable whenever the layout ran
       * taller than the screen. `pan-y` keeps vertical scrolling available
       * while still blocking pinch-zoom and double-tap-zoom; the canvas itself
       * sets `touch-action: none` locally, so drawing is unaffected.
       */
      style={{ touchAction: 'pan-y', overscrollBehavior: 'none' } as React.CSSProperties}
    >
      {/* Draw mode never mounted this, so equipping a Vault skin here
          silently rendered nothing at all. */}
      <TokenVaultLayer animKey={tokenLabel.key} />
      <TokenPhysicsLayer />

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
          {heartsMode && (
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
          )}
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">
            {language.toUpperCase()} · {celebration.lifetimeWords(language).toLocaleString()}
          </span>
        </div>

        <div className="flex items-start gap-3">
          {/* Voice answering. Off by default; when on, saying the word is a
              valid answer on its own — you don't have to draw first. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mt-1 flex items-center gap-1.5">
                <motion.span
                  className={voiceConfirmEnabled ? 'text-primary' : 'text-muted-foreground/60'}
                  // A slow breathing pulse while the mic is live, so it's
                  // obvious the app is listening. Framer respects the
                  // reduced-motion check below by simply not animating.
                  animate={
                    voiceConfirmEnabled && !prefersReducedMotion
                      ? { scale: [1, 1.18, 1], opacity: [0.75, 1, 0.75] }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={
                    voiceConfirmEnabled && !prefersReducedMotion
                      ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.2 }
                  }
                >
                  {voiceConfirmEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                </motion.span>
                <Switch
                  checked={voiceConfirmEnabled}
                  onCheckedChange={toggleVoiceConfirm}
                  aria-label="Answer by voice"
                  className="scale-75 origin-left"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[190px] text-center">
              <p className="text-xs">
                {voiceConfirmEnabled
                  ? 'Voice answering on — say the word or draw it, whichever you prefer.'
                  : 'Voice answering off — draw the word and tap Done.'}
              </p>
            </TooltipContent>
          </Tooltip>

          <div ref={tokenAnchorRef} className="relative text-right">
            <TokenEarnedLabel animKey={tokenLabel.key} label={tokenLabel.text} />
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
            {/* Deliberately NOT `.game-word`. That class sets its font-size
                from --word-size-* with a 4.5rem/8rem fallback, and it lives
                in @layer utilities *after* Tailwind's — so `text-5xl` lost
                and this counter rendered at up to 128px, inflating the
                absolute header to ~150px tall and covering the word below. */}
            <div
              className="text-4xl md:text-5xl font-black leading-none word-glow"
              style={{ color: 'var(--word-color)', fontFamily: 'var(--word-font)' }}
            >
              {count}
            </div>
          </div>
        </div>
      </div>

      {/* ── Top rod indicator ─────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary to-primary/50 opacity-30" />

      {/* ── Main game area ─────────────────────────────────────────────────
          `justify-start` and scrollable, NOT `justify-center`. Centering a
          column that overflows splits the excess evenly and the root's
          `overflow-hidden` then discards the top half — which is where the
          word lives. That is why the word kept disappearing. Padding-top
          reserves the absolutely-positioned header's height so nothing
          renders underneath it. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-start px-4 pt-20 pb-2">
        <AnimatePresence mode="wait">
          {!gameOver ? (
            // NOT keyed by wordIndex. It was, which meant every word change
            // remounted this whole subtree — including GameWord below,
            // which runs its own AnimatePresence internally keyed on the
            // same wordIndex value. Two AnimatePresence controllers nested
            // one inside the other, both firing on the identical key change
            // at the identical moment, is exactly the kind of conflict that
            // leaves a child stuck at its `initial` (opacity: 0) state
            // instead of ever animating in — which is why the word was
            // rendering completely invisible rather than just mis-sized or
            // clipped. The canvas doesn't need this remount either; it's
            // cleared explicitly via canvasRef, not by keying. This only
            // needs to swap for the gameOver screen below, so it keys on
            // that instead.
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`w-full flex flex-col gap-3 transition-all duration-300 ${expanded ? 'max-w-2xl' : 'max-w-md'}`}
            >
              {/* The same component voice mode uses, so the hit/miss
                  reactions are identical by construction. Always rendered —
                  never behind a condition. Only the ceiling is pulled in,
                  because here the word shares the screen with a canvas. */}
              <div className="shrink-0 text-center">
                <GameWord
                  word={currentWord.word}
                  translation={currentWord.translation}
                  pronunciation={(currentWord as any).pronunciation}
                  feedback={feedback}
                  animKey={wordIndex}
                  scale={0.65}
                />
              </div>

              {/* Canvas */}
              <motion.div
                key={shakeKey}
                animate={shakeKey > 0 ? {
                  x: [-20, 20, -18, 18, -12, 12, -8, 8, -4, 4, 0],
                  rotate: [-2, 2, -1.5, 1.5, -1, 1, 0]
                } : { x: 0, rotate: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                // `w-fit`, not `w-full`: the canvas now sizes itself from
                // viewport height, so the frame shrinks to whatever it needs.
                // The previous `maxWidth: min(100%, 60vh)` here was inert on
                // phones — it capped *width*, and 60vh never binds on a column
                // only ~400px wide, so it constrained nothing at all.
                className={`relative rounded-xl border-2 overflow-hidden transition-colors duration-300 mx-auto w-fit ${
                  status === 'error'
                    ? 'border-destructive shadow-lg shadow-destructive/50'
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
                  ghostText={showGhost ? currentWord.word : undefined}
                  ghostOpacity={0.14}
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

              {/* Ink color picker — collapsed in expanded mode to give the canvas more room */}
              {!expanded && (
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
              )}

              {/* Primary actions FIRST and in their own row.
                  These used to sit last in a single flex-wrap row, so on a
                  phone the three secondary buttons filled row one and Clear
                  and Done wrapped to row two — straight off the bottom of the
                  screen, with `touch-action: none` on the root meaning they
                  could not even be scrolled to. The two controls the game
                  cannot be played without now come first and never wrap. */}
              {/* `sticky bottom-0` inside the scrolling column: Done is the
                  one control the game cannot proceed without, so it stays on
                  screen no matter how tall the rest of the layout runs or how
                  much browser chrome a mobile in-app webview steals. The
                  backdrop keeps the canvas from showing through as content
                  scrolls underneath. */}
              <div className="sticky bottom-0 z-20 -mx-4 px-4 py-3 flex items-center justify-center gap-3 bg-gradient-to-t from-background via-background to-transparent">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="gap-2 flex-1 max-w-[8rem]"
                >
                  <Eraser className="w-4 h-4" /> Clear
                </Button>
                {/* Visually dominant: it is the primary action on the screen. */}
                <Button
                  size="lg"
                  onClick={() => void handleDone()}
                  className="gap-2 flex-[2] max-w-[14rem] text-base font-black shadow-lg shadow-primary/30"
                  disabled={status === 'success' || status === 'error' || isRecognizing}
                >
                  {isRecognizing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  {isRecognizing ? 'Checking…' : 'Done'}
                </Button>
              </div>

              {/* Secondary controls — safe to wrap or be scrolled past. */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => currentWord && speakMuted(currentWord.word)}
                  className="gap-2"
                >
                  <Volume2 className="w-4 h-4" /> Listen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const next = !showGhost;
                    setShowGhost(next);
                    localStorage.setItem(TRACE_GUIDE_KEY, String(next));
                  }}
                  className="gap-2"
                  title="Faint outline of the word on the canvas"
                >
                  {showGhost ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  Trace guide
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoSpeak((v) => !v)}
                  className="gap-2"
                  title="Auto-speak the word when it loads"
                >
                  {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  Quip
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded((v) => !v)}
                  className="gap-2"
                  title="Expand the canvas"
                >
                  {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  {expanded ? 'Collapse' : 'Expand'}
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

                {/* Typed fallback for "say the word" — auto-shown after repeated
                    empty/failed sessions (mic likely stolen by a phone call),
                    also reachable manually via the "Type instead" link below. */}
                {voiceConfirmEnabled && showTypedConfirm && (
                  <motion.div
                    key="typed-confirm"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col items-center gap-1.5 w-full max-w-xs mx-auto"
                  >
                    {micLikelyBlockedDraw && (
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest text-center">
                        Mic seems unavailable (on a call?) — type instead
                      </span>
                    )}
                    <div className="flex gap-2 w-full">
                      <Input
                        value={typedConfirm}
                        onChange={(e) => setTypedConfirm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitTypedConfirm()}
                        placeholder="Type the word…"
                        className="flex-1 font-mono"
                      />
                      <Button size="default" onClick={submitTypedConfirm} disabled={!typedConfirm.trim()}>
                        Check
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Mic status (voice mode only, when not awaiting) */}
                {voiceConfirmEnabled && !awaitingVoice && !showTypedConfirm && (
                  <motion.div
                    key="mic-status"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-1 pt-1"
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
                    <button
                      type="button"
                      onClick={() => setShowTypedConfirm(true)}
                      className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <Keyboard className="w-3 h-3" /> Type instead
                    </button>
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

              {/* The words that cost lives, so the run ends with something
                  actionable rather than just a number. */}
              {(() => {
                const s = summarise(sessionLogRef.current);
                if (s.missed.length === 0) return null;
                return (
                  <div className="bg-card border border-border rounded-xl p-4 text-left space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Worth another look
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.missed.slice(0, 10).map((w) => (
                        <span key={w} className="px-2 py-1 rounded-md bg-muted text-xs font-medium">
                          {w}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      These will come back sooner than words you already know.
                    </p>
                  </div>
                );
              })()}
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
                    sessionLogRef.current = [];
                    recentRef.current = [];
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
