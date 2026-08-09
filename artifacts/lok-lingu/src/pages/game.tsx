import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Volume2, Mic, Home, AlertTriangle, SkipForward, Keyboard } from 'lucide-react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useSubmitScore } from '@workspace/api-client-react';
import { FALLBACK_WORDS, saveLocalScore, incrementLifetimeWords } from '@/lib/offline-data';
import { generateNumber, supportsInfiniteCounting } from '@/lib/number-words';
import { useUser } from '@/hooks/use-user';
import { useSpeechEngine } from '@/hooks/use-speech-engine';
import { useSettings } from '@/hooks/use-settings';
import { useDevMode } from '@/hooks/use-dev-mode';
import { useEconomy } from '@/hooks/use-economy';
import { consumeSkip, FREE_SKIPS_PER_MATCH } from '@/lib/economy';
import { currentLevel, freeSkipsForLevel } from '@/lib/levels';
import { gameWordFontSize } from '@/lib/word-sizing';
import { getSelectedEmblem, earnedEmblems } from '@/lib/emblems';
import { speakWord, matchWord, primeVoices, toLocale } from '@/lib/speech-utils';
import { useTheme } from '@/hooks/use-theme';
import { useCelebration } from '@/hooks/use-celebration';
import { useCelebrationSound } from '@/hooks/use-celebration-sound';
import { CelebrationEffect } from '@/components/celebration-effect';
import { TokenEarnedLabel } from '@/components/token-earned-label';
import { TokenVaultLayer } from '@/components/token-vault-layer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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

/** Platform-aware timing per response speed setting. */
const IS_IOS_GAME = /iphone|ipad|ipod/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : '',
);
const SPEED_TIMING = {
  fast:    { hitMs: 150, restartMs: IS_IOS_GAME ? 250 : 150 },
  normal:  { hitMs: 400, restartMs: IS_IOS_GAME ? 500 : 300 },
  relaxed: { hitMs: 700, restartMs: IS_IOS_GAME ? 800 : 500 },
} as const;

export default function Game() {
  const [, setLocation] = useLocation();
  // Ensure the active theme's CSS class is applied to :root when the game
  // screen mounts — without this call the class can lag if the player
  // navigates directly to /game without visiting a page that calls useTheme.
  useTheme();
  const language = localStorage.getItem('lok-lingu-lang') || 'es';
  const category = localStorage.getItem('lok-lingu-cat') || 'numbers';

  const [wordIndex, setWordIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'hit' | 'miss'>('idle');
  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const [micError, setMicError] = useState<string | null>(null);
  const devMode = useDevMode();
  // Level is derived from lifetime words, which only change on a correct
  // answer, so recomputing it per word is exact and costs nothing.
  const playerLevel = useMemo(() => currentLevel(), [wordIndex]);
  // Falls back to the highest emblem earned when none is explicitly picked.
  const playerEmblem = useMemo(
    () => getSelectedEmblem(playerLevel) ?? earnedEmblems(playerLevel).slice(-1)[0] ?? null,
    [playerLevel],
  );
  const { responseSpeed } = useSettings();
  const timing = SPEED_TIMING[responseSpeed];

  // Stable ref so handleResult can call abortSession without it being in
  // the dependency array. abortSession is declared after useSpeechEngine,
  // so referencing it directly in useCallback's deps causes a TDZ crash.
  const abortSessionRef = useRef<() => void>(() => {});

  // Celebration system — same hooks as draw mode.
  const prefersReducedMotion = useReducedMotion();
  const celebration = useCelebration();
  const { play: playSound } = useCelebrationSound();
  // Stable ref so handleResult (empty deps) can call incrementMatch without
  // pulling the whole celebration object into its closure.
  const celebrationRef = useRef(celebration);
  celebrationRef.current = celebration;

  // Token earned label — shown briefly near the streak counter after each hit.
  const [tokenLabel, setTokenLabel] = useState<{ key: number; text: string }>({ key: 0, text: '' });
  // Ref so handleResult (empty deps) can read boostActive without a stale closure.
  const boostActiveRef = useRef(celebration.boostActive);
  boostActiveRef.current = celebration.boostActive;

  // Play milestone sound whenever a new milestone fires.
  useEffect(() => {
    if (celebration.milestone) {
      playSound(celebration.milestone.sound, celebration.milestone.intensity);
    }
  }, [celebration.milestone, playSound]);

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

  const wordFontSize = useMemo(
    () => gameWordFontSize(currentWord?.word ?? ''),
    [currentWord],
  );

  const currentWordRef = useRef(currentWord);
  currentWordRef.current = currentWord;
  const languageRef = useRef(language);
  languageRef.current = language;
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

  // True while "pronounce slowly" is playing back. Belt-and-braces on top
  // of actually stopping the mic below — a transcript event already in
  // flight when playback starts must still be dropped, not scored.
  const speechMutedRef = useRef(false);

  // Typed-answer fallback — the mic is unusable while the OS hands it to a
  // phone call (or on any device with no working mic). There is no API to
  // detect "on a call" directly, so this is offered when the engine keeps
  // producing empty/failed sessions, and always available as a manual
  // toggle for anyone who just prefers typing.
  const [showTypedInput, setShowTypedInput] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');

  const handleResult = useCallback((spoken: string, isFinal: boolean) => {
    if (lockedRef.current || speechMutedRef.current) return;
    const target = currentWordRef.current?.word;
    if (!target || !spoken) return;

    const alternates = currentWordRef.current?.pronunciation
      ? [currentWordRef.current.pronunciation]
      : [];

    if (matchWord(spoken, target, alternates)) {
      lockedRef.current = true;
      // Close the current recognition session immediately so the restart timer
      // starts in parallel with the hit animation rather than after it.
      // wantListeningRef stays true, so the loop reopens automatically.
      abortSessionRef.current();
      setFeedback('hit');
      setStreak((s) => s + 1);
      // incrementMatch handles lifetime tracking internally, so a separate
      // incrementLifetimeWords call is not needed here (it would double-count).
      const { milestoneHit, tokenBonus } = celebrationRef.current.incrementMatch(languageRef.current);
      const rate = boostActiveRef.current ? 4 : 2;
      const labelText = milestoneHit && tokenBonus > 0 ? `+${tokenBonus} 🎁` : `+${rate}`;
      setTokenLabel((prev) => ({ key: prev.key + 1, text: labelText }));
      setTimeout(() => {
        setWordIndex((i) => i + 1);
        setFeedback('idle');
        lockedRef.current = false;
      }, timing.hitMs);
      return;
    }

    if (isFinal) {
      setFeedback('miss');
      setTimeout(() => setFeedback('idle'), 500);
    }
  }, []);

  // Words the player could plausibly say next. Under Vosk this becomes a hard
  // grammar, which is the single biggest accuracy win available: while counting
  // it is impossible to mishear "siete" as an unrelated word.
  const expectedWords = useMemo(() => {
    const pool = new Set<string>();
    const add = (w?: NormalWord) => {
      if (!w) return;
      w.word.split(/\s+/).forEach((part) => part && pool.add(part.toLowerCase()));
      w.pronunciation?.split(/\s+/).forEach((part) => part && pool.add(part.toLowerCase()));
    };
    if (infinite) {
      // The current number plus a small look-ahead, so an eager player who
      // counts on ahead is still recognised.
      for (let n = wordIndex + 1; n <= wordIndex + 4; n++) {
        add(generateNumber(n, language) ?? undefined);
      }
    } else {
      words.forEach(add);
    }
    return [...pool];
  }, [infinite, wordIndex, language, words]);

  const {
    isListening,
    isReconnecting,
    isUnsupported,
    spokenText,
    engine,
    engineNote,
    lastError,
    emptySessions,
    startListening,
    stopListening,
    abortSession,
  } = useSpeechEngine({
      onResult: handleResult,
      onError: (code) => {
        console.error('Speech error:', code);
        if (code === 'not-allowed') {
          setIsActive(false);
          commitRun();
          setStreak(0);
          setMicError('Microphone blocked. Allow mic access and try again.');
        } else if (code === 'engine-unavailable') {
          setIsActive(false);
          setMicError('No speech engine available on this device or browser.');
        }
      },
      lang: toLocale(language),
      expected: expectedWords,
      restartDelay: timing.restartMs,
    });
  // Keep the ref in sync so handleResult can call abortSession without it
  // being in the useCallback dependency array (which would cause a TDZ crash
  // since abortSession is declared after handleResult in the component body).
  abortSessionRef.current = abortSession;

  // Repeated empty sessions or repeated not-allowed/network errors are the
  // exact shape a call-stolen mic produces — sessions open and close with
  // nothing, over and over. Auto-surface the typed fallback rather than
  // leaving the player stuck with a mic button that does nothing visible.
  const micLikelyBlocked =
    isActive && (emptySessions >= 3 || lastError === 'not-allowed' || lastError === 'network');

  useEffect(() => {
    if (micLikelyBlocked) setShowTypedInput(true);
  }, [micLikelyBlocked]);

  const submitTypedAnswer = () => {
    const value = typedAnswer.trim();
    if (!value) return;
    handleResult(value, true);
    setTypedAnswer('');
  };

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

  /**
   * "Pronounce slowly" used to fire the TTS and leave the mic hot. On any
   * device without headphones or real echo cancellation, the speaker
   * saying the exact target word bled straight back into the mic, the
   * recognizer heard it, and it registered as if the player had spoken —
   * which is exactly the "clicking the audio skips the next word" report.
   * The fix is to actually stop listening for the duration of playback
   * and only resume once speakWord's promise resolves — not on a timer,
   * because that promise already accounts for real playback length.
   */
  const handleSlowSpeak = () => {
    const word = currentWord?.word ?? '';
    if (!word) return;
    const wasActive = isActiveRef.current;
    if (wasActive) {
      speechMutedRef.current = true;
      stopListening();
    }
    speakWord(word, language, { slow: true }).finally(() => {
      speechMutedRef.current = false;
      // Only resume if the player hasn't turned the mic off themselves
      // while playback was running.
      if (wasActive && isActiveRef.current) startListening();
    });
  };

  /* -------------------------- skips --------------------------
     A stuck word — a mispronunciation the engine will never accept, or
     someone talking over you — used to be a dead end: the only way past
     it was to stop the mic, which committed the run and reset the
     streak. Every match therefore carries one free skip, plus whatever
     the player has banked from the shop.
  ------------------------------------------------------------- */
  // Free skips scale with level (1 → 2 at L20 → 3 at L50), so the number
  // is decided in levels.ts rather than hard-coded here.
  const [freeSkipsLeft, setFreeSkipsLeft] = useState(() =>
    Math.max(FREE_SKIPS_PER_MATCH, freeSkipsForLevel(currentLevel())),
  );
  const [skipFlash, setSkipFlash] = useState(0);
  const { skips: bankedSkips } = useEconomy();
  const skipsLeft = freeSkipsLeft + bankedSkips;

  const handleSkip = () => {
    if (skipsLeft <= 0 || lockedRef.current) return;
    // Spend the free skip first — banked ones cost tokens, so they should
    // be the last thing consumed.
    if (freeSkipsLeft > 0) setFreeSkipsLeft((n) => n - 1);
    else if (!consumeSkip()) return;

    lockedRef.current = true;
    abortSessionRef.current();
    setSkipFlash((n) => n + 1);
    // A skip advances the word but deliberately does not touch the streak
    // or lifetime counts — it is a way past a word, not a way to score.
    setWordIndex((i) => i + 1);
    setFeedback('idle');
    lockedRef.current = false;
  };

  if (!currentWord) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 bg-background px-8 text-center">
        <AlertTriangle className="w-12 h-12 text-muted-foreground opacity-60" />
        <div className="space-y-2">
          <p className="text-lg font-black uppercase tracking-widest text-foreground">No words found</p>
          <p className="text-sm text-muted-foreground font-mono">
            No word list for <span className="text-foreground font-bold">{language}</span> /{' '}
            <span className="text-foreground font-bold">{category}</span>.
            <br />Try a different language or category.
          </p>
        </div>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 active:scale-95"
        >
          <Home size={16} /> Home
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* The Vault skin draws across the whole screen and outlives any one
          coin pop, so it sits at the page root behind everything (z-0)
          rather than inside the streak counter. Renders nothing unless
          that skin is equipped. */}
      <TokenVaultLayer animKey={tokenLabel.key} />

      <div className="flex justify-between items-start p-6 w-full absolute top-0 z-10">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase opacity-70">
            {/* Emblems are a single small element running a transform-only
                CSS animation, so they are safe to leave on during a match. */}
            {playerEmblem && (
              <span
                className={`${playerEmblem.animation ?? ''} text-sm leading-none`}
                title={`${playerEmblem.name} — Lv ${playerEmblem.level}`}
              >
                {playerEmblem.glyph}
              </span>
            )}
            <span>Lv {playerLevel}</span>
            <span aria-hidden>·</span>
            <span>
              {language} ·{' '}
              {infinite
                ? `#${wordIndex + 1} · ∞`
                : `${(wordIndex % words.length) + 1}/${words.length}`}
            </span>
          </span>
          {substituted && (
            <span className="text-[10px] tracking-widest uppercase text-destructive opacity-80">
              No {category} list — using numbers
            </span>
          )}
        </div>
        <div className="relative flex flex-col items-end">
          <TokenEarnedLabel animKey={tokenLabel.key} label={tokenLabel.text} />
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
            <motion.h1
              className={`game-word font-black tracking-tighter capitalize leading-none transition-colors duration-200 ${
                feedback === 'hit'
                  ? 'text-primary'
                  : feedback === 'miss'
                    ? 'text-destructive'
                    : 'word-glow'
              }`}
              style={{
                color: feedback === 'idle' ? 'var(--word-color)' : undefined,
                // A fixed text-7xl/9xl had no way to fit both "sí" and a
                // multi-word phrase like "buenas noches" in the same box
                // across 30+ themes at very different letter widths.
                // These two vars scale the ceiling down for longer content;
                // see .game-word's breakpoint rule in index.css and
                // src/lib/word-sizing.ts for the reasoning.
                ['--word-size-mobile' as string]: wordFontSize.mobile,
                ['--word-size-desktop' as string]: wordFontSize.desktop,
              }}
              animate={
                prefersReducedMotion
                  ? {}
                  : feedback === 'hit'
                    ? { scale: [1, 1.12, 1], filter: ['brightness(1)', 'brightness(1.7)', 'brightness(1)'] }
                    : { scale: 1, filter: 'brightness(1)' }
              }
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {currentWord.word}
            </motion.h1>

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

      {/* What the engine actually heard. Empty-while-listening is the single
          most useful diagnostic there is, so it is always visible. */}
      <div className="h-6 text-center text-xs font-mono">
        {spokenText ? (
          <span className="opacity-70">"{spokenText}"</span>
        ) : isReconnecting ? (
          <span className="opacity-50 text-amber-400">reconnecting…</span>
        ) : isListening ? (
          <span className="opacity-30">listening…</span>
        ) : null}
      </div>

      <div className="pb-14 px-6 flex flex-col items-center gap-3 w-full">
        {showTypedInput && (
          <div className="w-full max-w-sm space-y-1.5">
            {micLikelyBlocked && (
              <p className="text-center text-[11px] font-mono text-amber-400 opacity-90">
                Mic seems unavailable (on a call?) — type your answer instead
              </p>
            )}
            <div className="flex gap-2">
              <Input
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitTypedAnswer()}
                placeholder="Type the word…"
                autoFocus={micLikelyBlocked}
                className="flex-1 font-mono"
              />
              <Button size="default" onClick={submitTypedAnswer} disabled={!typedAnswer.trim()}>
                Check
              </Button>
            </div>
          </div>
        )}
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
              <Mic size={22} />{' '}
              {isListening ? 'Listening...' : isReconnecting ? 'Reconnecting...' : 'Ready...'}
            </>
          ) : (
            <>
              <Mic size={22} /> Say the word
            </>
          )}
        </button>
        {devMode && isActive && engine && (
          <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">
            {engine === 'vosk' ? 'offline engine' : 'browser engine'} · {engineNote}
          </span>
        )}

        {/* A listening engine that returns nothing used to look identical to
            one that was working. Say so out loud. */}
        {devMode && isActive && lastError && lastError !== 'no-speech' && (
          <span className="text-[11px] font-mono text-destructive opacity-90">
            {lastError === 'network'
              ? 'Browser speech service unreachable — switching engines'
              : `Speech engine error: ${lastError}`}
          </span>
        )}
        {isActive && !lastError && emptySessions >= 2 && (
          <span className="text-[11px] font-mono text-destructive opacity-80">
            Heard nothing yet — check the mic input device, or try Chrome
          </span>
        )}
        {isUnsupported && (
          <span className="text-xs opacity-50">
            {/iphone|ipad|ipod/i.test(navigator.userAgent)
              ? 'Speech recognition needs Safari on iPhone'
              : 'Speech recognition needs Chrome or Edge'}
          </span>
        )}
        {micError && <span className="text-xs text-destructive opacity-80">{micError}</span>}
        {!showTypedInput && (
          <button
            type="button"
            onClick={() => setShowTypedInput(true)}
            className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground opacity-60 hover:opacity-100 transition-opacity"
          >
            <Keyboard size={12} /> Type instead
          </button>
        )}
      </div>

      {/* Skip — bottom right, deliberately out of the thumb path of the mic
          button so it cannot be hit by accident mid-run. */}
      <div className="absolute bottom-6 right-5 z-20 flex flex-col items-center gap-1">
        <motion.button
          type="button"
          data-testid="skip-button"
          onClick={handleSkip}
          disabled={skipsLeft <= 0}
          aria-label={skipsLeft > 0 ? `Skip this word, ${skipsLeft} left` : 'No skips left'}
          title={
            skipsLeft > 0
              ? `Skip this word (${skipsLeft} left)`
              : 'Out of skips — buy more in the shop'
          }
          animate={prefersReducedMotion ? {} : { scale: skipFlash ? [1, 0.88, 1] : 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full border border-foreground/15 bg-background/70 text-foreground/70 backdrop-blur transition-all duration-300 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:pointer-events-none disabled:opacity-30"
        >
          <SkipForward size={20} />
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black tabular-nums text-primary-foreground"
            aria-hidden="true"
          >
            {skipsLeft}
          </span>
        </motion.button>
        {/* 0.4 opacity measured 3.25:1 against the game ground — below AA
            for 9px text. 0.75 clears it without shouting. */}
        <span className="text-[9px] uppercase tracking-[0.2em] opacity-75">Skip</span>
      </div>

      {/* Milestone celebration burst — suppressed when prefers-reduced-motion. */}
      {celebration.milestone && !prefersReducedMotion && (
        <CelebrationEffect
          celebration={celebration.milestone.celebration}
          intensity={celebration.milestone.intensity}
          onComplete={() => celebration.clearMilestone()}
        />
      )}
    </div>
  );
}
