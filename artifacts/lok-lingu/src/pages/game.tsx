/**
 * Game page — voice recognition engine v3
 *
 * Key design decisions vs previous versions:
 * - continuous = FALSE  →  one clean attempt per cycle; isFinal is always true
 * - interimResults = FALSE  →  only process confirmed speech
 * - maxAlternatives = 5  →  check every interpretation the engine offers
 * - restart in onend (not onresult)  →  no "already started" race
 * - watchdog timer  →  if onstart never fires within 3 s, retry
 * - recognition only starts AFTER words are loaded
 * - all errors shown in-UI instead of silent swallowing
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useGetWords, useSubmitScore } from "@workspace/api-client-react";
import { useUser } from "../hooks/use-user";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Heart, X, RotateCcw, Home,
  Volume2, Infinity as InfinityIcon, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  de: "de-DE",
  ja: "ja-JP",
};

const MAX_LIVES         = 3;
const SUCCESS_DELAY_MS  = 420;
const FAIL_DELAY_MS     = 750;
const RESTART_DELAY_MS  = 80;   // gap before recognition.start() after onend
const WATCHDOG_MS       = 4000; // if onstart never fires, retry

// ─── Matching ────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip diacritics
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev.splice(0, n + 1, ...curr);
  }
  return curr[n];
}

/**
 * Returns true if any word in `spoken` matches `target`.
 * Tolerance: "strict" = exact, "normal" = ±1 edit per 4 chars,
 *            "loose"  = ±1 edit per 2.5 chars
 */
function anyAlternativeMatches(
  alternatives: string[],
  target: string,
  tolerance: string,
): boolean {
  const tg = normalize(target);
  if (!tg) return false;

  const maxEdits =
    tolerance === "strict" ? 0 :
    tolerance === "loose"  ? Math.max(2, Math.floor(tg.length / 2.5)) :
    Math.max(1, Math.floor(tg.length / 4));

  for (const raw of alternatives) {
    const sp = normalize(raw);
    if (!sp) continue;

    // Exact or phrase contains target
    if (sp === tg || sp.includes(tg)) return true;

    // Every target word individually present
    const tgWords = tg.split(" ");
    if (tgWords.length > 1 && tgWords.every((w) => sp.includes(w))) return true;

    // Levenshtein per spoken word
    for (const sw of sp.split(" ")) {
      if (levenshtein(sw, tg) <= maxEdits) return true;
    }
    // Whole-phrase distance (short targets)
    if (tg.length <= 12 && levenshtein(sp, tg) <= maxEdits + 1) return true;
  }
  return false;
}

// ─── TTS ─────────────────────────────────────────────────────────────────────

function pronounce(text: string, lang: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang    = LANG_MAP[lang] ?? "es-ES";
  u.rate    = parseFloat(localStorage.getItem("lok-lingu-tts-rate")   ?? "0.82");
  u.volume  = parseFloat(localStorage.getItem("lok-lingu-tts-volume") ?? "1");
  u.pitch   = 1;
  window.speechSynthesis.speak(u);
}

// ─── Recognition state type ──────────────────────────────────────────────────

type RecState = "off" | "starting" | "listening" | "processing" | "error";

// ─── Component ───────────────────────────────────────────────────────────────

export default function Game() {
  const [, setLocation] = useLocation();
  const { userId }      = useUser();

  const language       = localStorage.getItem("lok-lingu-lang")      ?? "es";
  const category       = localStorage.getItem("lok-lingu-cat")       ?? "numbers";
  const heartsMode     = localStorage.getItem("lok-lingu-hearts")    !== "false";
  const autoSpeak      = localStorage.getItem("lok-lingu-auto-speak") === "true";
  const matchTolerance = localStorage.getItem("lok-lingu-tolerance") ?? "normal";

  const { data: words, isLoading: isLoadingWords } = useGetWords(language, category, {
    query: { enabled: true, queryKey: ["words", language, category] },
  });
  const submitScore = useSubmitScore();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [wordIndex,   setWordIndex]   = useState(0);
  const [count,       setCount]       = useState(0);
  const [lives,       setLives]       = useState(MAX_LIVES);
  const [gameOver,    setGameOver]    = useState(false);
  const [recState,    setRecState]    = useState<RecState>("off");
  const [spokenText,  setSpokenText]  = useState("");
  const [matchStatus, setMatchStatus] = useState<"idle" | "success" | "error">("idle");
  const [flashError,  setFlashError]  = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [micError,    setMicError]    = useState<string | null>(null);

  // ── Stable refs (safe to read inside callbacks) ──────────────────────────
  const wordsRef       = useRef(words);
  const wordIndexRef   = useRef(0);
  const livesRef       = useRef(MAX_LIVES);
  const countRef       = useRef(0);
  const matchStatusRef = useRef<"idle" | "success" | "error">("idle");
  const gameOverRef    = useRef(false);
  const userIdRef      = useRef(userId);
  const submitRef      = useRef(submitScore);
  const activeRef      = useRef(false);  // tracks whether this session is alive
  const watchdogRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { wordsRef.current    = words;       }, [words]);
  useEffect(() => { userIdRef.current   = userId;      }, [userId]);
  useEffect(() => { submitRef.current   = submitScore; }, [submitScore]);

  const setMatchStatusSync = useCallback((s: "idle" | "success" | "error") => {
    matchStatusRef.current = s;
    setMatchStatus(s);
  }, []);

  // ── Guard redirect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) setLocation("/");
  }, [userId, setLocation]);

  // ── Auto-speak on new word ────────────────────────────────────────────────
  useEffect(() => {
    if (autoSpeak && wordsRef.current?.[wordIndex] && !gameOver) {
      pronounce(wordsRef.current[wordIndex].word, language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordIndex]);

  // ── Game logic ────────────────────────────────────────────────────────────

  const doSuccess = useCallback(() => {
    if (matchStatusRef.current !== "idle") return;
    setMatchStatusSync("success");
    const n = countRef.current + 1;
    countRef.current = n;
    setCount(n);

    setTimeout(() => {
      if (!wordsRef.current) return;
      const ni = (wordIndexRef.current + 1) % wordsRef.current.length;
      wordIndexRef.current = ni;
      setWordIndex(ni);
      setSpokenText("");
      setMatchStatusSync("idle");
    }, SUCCESS_DELAY_MS);
  }, [setMatchStatusSync]);

  const doFailure = useCallback(() => {
    if (matchStatusRef.current !== "idle") return;
    setMatchStatusSync("error");

    if (navigator.vibrate) navigator.vibrate([80, 50, 130]);
    setFlashError(true);
    setTimeout(() => setFlashError(false), 500);

    if (!heartsMode) {
      setTimeout(() => {
        setSpokenText("");
        setMatchStatusSync("idle");
      }, FAIL_DELAY_MS);
      return;
    }

    const nl = livesRef.current - 1;
    livesRef.current = nl;
    setLives(nl);

    setTimeout(() => {
      if (nl <= 0) {
        gameOverRef.current = true;
        setGameOver(true);
        window.speechSynthesis?.cancel();
        if (userIdRef.current) {
          submitRef.current.mutate({
            data: { userId: userIdRef.current, language, category, count: countRef.current },
          });
        }
      } else {
        setSpokenText("");
        setMatchStatusSync("idle");
      }
    }, FAIL_DELAY_MS);
  }, [setMatchStatusSync, language, category, heartsMode]);

  // ── Recognition engine ────────────────────────────────────────────────────

  const recognitionRef = useRef<any>(null);

  /** Schedule one recognition attempt. Safe to call repeatedly. */
  const scheduleStart = useCallback((delayMs = 0) => {
    if (!activeRef.current || gameOverRef.current) return;

    setTimeout(() => {
      if (!activeRef.current || gameOverRef.current) return;

      const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (!SR) return;

      // Discard previous instance
      try { recognitionRef.current?.abort(); } catch (_) {}

      const rec = new SR();
      recognitionRef.current = rec;

      rec.continuous      = false;   // one clean shot
      rec.interimResults  = false;   // only final results
      rec.maxAlternatives = 5;       // check every interpretation
      rec.lang = LANG_MAP[language] ?? "es-ES";

      // Watchdog: if onstart doesn't fire, something is blocking → retry
      watchdogRef.current = setTimeout(() => {
        if (activeRef.current && !gameOverRef.current) {
          setRecState("error");
          setMicError("Mic not responding — tap to retry");
        }
      }, WATCHDOG_MS);

      rec.onstart = () => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        setRecState("listening");
        setMicError(null);
      };

      rec.onend = () => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        if (activeRef.current && !gameOverRef.current) {
          setRecState("starting");
          scheduleStart(RESTART_DELAY_MS);
        } else {
          setRecState("off");
        }
      };

      rec.onerror = (e: any) => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);

        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          activeRef.current = false;
          setRecState("error");
          setMicError("Microphone access denied — allow mic in browser and reload");
          return;
        }

        if (e.error === "no-speech") {
          // Benign — onend will restart
          return;
        }

        if (e.error === "network") {
          setMicError("Network error — retrying…");
          return;
        }

        // Any other error: show briefly, let onend restart
        setMicError(`Recognition error: ${e.error}`);
        setTimeout(() => setMicError(null), 2500);
      };

      rec.onresult = (event: any) => {
        if (matchStatusRef.current !== "idle" || gameOverRef.current) return;

        // Collect all alternatives from all result items
        const alternatives: string[] = [];
        for (let i = 0; i < event.results.length; i++) {
          for (let j = 0; j < event.results[i].length; j++) {
            const t = event.results[i][j].transcript.trim();
            if (t) alternatives.push(t);
          }
        }

        if (alternatives.length === 0) return;

        // Show best guess in bubble
        setSpokenText(alternatives[0]);

        const target = wordsRef.current?.[wordIndexRef.current]?.word ?? "";
        if (anyAlternativeMatches(alternatives, target, matchTolerance)) {
          doSuccess();
        } else {
          doFailure();
        }
      };

      setRecState("starting");
      try {
        rec.start();
      } catch (err) {
        // "already started" or other startup error — retry after a longer pause
        setRecState("starting");
        scheduleStart(300);
      }
    }, delayMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, matchTolerance, doSuccess, doFailure]);

  // ── Start recognition once words are loaded ──────────────────────────────
  useEffect(() => {
    if (!words || isLoadingWords) return;  // wait for words

    // Reset all refs for a fresh game session
    wordIndexRef.current   = 0;
    livesRef.current       = MAX_LIVES;
    countRef.current       = 0;
    matchStatusRef.current = "idle";
    gameOverRef.current    = false;
    activeRef.current      = true;

    setRecState("starting");
    scheduleStart(0);

    return () => {
      activeRef.current = false;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      try { recognitionRef.current?.abort(); } catch (_) {}
      setRecState("off");
    };
  // Only re-run when language changes or words first load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, !!words]);

  // ── Manual tap on mic ────────────────────────────────────────────────────
  const tapMic = useCallback(() => {
    if (gameOverRef.current) return;
    if (recState === "error" || recState === "off") {
      // Full restart
      setMicError(null);
      activeRef.current = true;
      scheduleStart(0);
    }
    // If "starting" or "listening" — no-op (already running)
  }, [recState, scheduleStart]);

  // ── Speaker button ────────────────────────────────────────────────────────
  const tapSpeak = useCallback(() => {
    const w = wordsRef.current?.[wordIndexRef.current]?.word;
    if (!w) return;
    setIsSpeaking(true);
    pronounce(w, language);
    setTimeout(() => setIsSpeaking(false), 1400);
  }, [language]);

  // ── Reset for play-again ─────────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    // Reset visual state
    setCount(0);
    setLives(MAX_LIVES);
    setWordIndex(0);
    setSpokenText("");
    setMatchStatusSync("idle");
    setMicError(null);

    // Reset refs
    countRef.current        = 0;
    livesRef.current        = MAX_LIVES;
    wordIndexRef.current    = 0;
    matchStatusRef.current  = "idle";
    gameOverRef.current     = false;
    activeRef.current       = true;

    setGameOver(false);
    setRecState("starting");
    scheduleStart(200);
  }, [setMatchStatusSync, scheduleStart]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (!userId) return null;

  if (isLoadingWords || !words) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Mic className="w-12 h-12 text-primary" />
        </motion.div>
        <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest">Loading words…</p>
      </div>
    );
  }

  const currentWord = words[wordIndex];

  const micIcon =
    recState === "error"     ? <MicOff className="w-8 h-8" /> :
    matchStatus === "error"  ? <X className="w-8 h-8" />      :
    <Mic className="w-8 h-8" />;

  const micLabel =
    recState === "listening"  ? "Listening…"   :
    recState === "starting"   ? "Starting…"    :
    recState === "processing" ? "Processing…"  :
    recState === "error"      ? "Tap to retry" :
    "Tap mic";

  const micClass =
    matchStatus === "success"  ? "bg-primary/20   text-primary    border-primary/60"     :
    matchStatus === "error"    ? "bg-destructive/20 text-destructive border-destructive/50" :
    recState === "listening"   ? "bg-card border-primary/60 text-primary"                :
    recState === "error"       ? "bg-card border-destructive/50 text-destructive"        :
    "bg-card border-border text-muted-foreground hover:border-primary hover:text-primary";

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden flex flex-col select-none">

      {/* ── Error flash overlay ────────────────────────────────────────── */}
      <AnimatePresence>
        {flashError && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50 bg-destructive pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* ── Top HUD ───────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 w-full px-6 pt-6 flex justify-between items-start z-10">

        {/* Lives or ∞ */}
        {heartsMode ? (
          <div className="flex space-x-2">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <motion.div
                key={i}
                animate={
                  i === lives && matchStatus === "error"
                    ? { scale: [1, 1.5, 0.5, 1], rotate: [0, -20, 20, 0] }
                    : {}
                }
                transition={{ duration: 0.45 }}
              >
                <Heart
                  className={`w-8 h-8 transition-all duration-300 ${
                    i < lives
                      ? "text-destructive fill-destructive drop-shadow-[0_0_8px_hsl(var(--destructive))]"
                      : "opacity-20 text-muted-foreground"
                  }`}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 bg-card/70 backdrop-blur px-3 py-1.5 rounded-full border border-primary/30">
            <InfinityIcon className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Infinite</span>
          </div>
        )}

        {/* Streak — always visible */}
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Streak</p>
          <motion.div
            key={count}
            initial={{ scale: 1.45, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 11 }}
            className="game-word text-5xl font-black leading-none word-glow"
            style={{ color: "var(--word-color)" }}
          >
            {count}
          </motion.div>
        </div>
      </div>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center z-0 px-6">
        <AnimatePresence mode="wait">

          {!gameOver ? (
            <motion.div
              key={wordIndex}
              initial={{ scale: 0.78, opacity: 0, filter: "blur(14px)" }}
              animate={
                matchStatus === "error"
                  ? { x: [-18, 18, -13, 13, -7, 7, 0] }
                  : matchStatus === "success"
                  ? { scale: 1.38, opacity: 0, filter: "blur(22px)" }
                  : { scale: 1, opacity: 1, filter: "blur(0px)" }
              }
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              transition={{ duration: matchStatus === "error" ? 0.45 : 0.22 }}
              className="text-center w-full"
            >
              <h1
                className={`game-word text-7xl md:text-8xl font-black mb-5 capitalize leading-tight ${
                  matchStatus === "idle"    ? "word-glow"                  : ""
                } ${
                  matchStatus === "error"   ? "neon-text-glow-destructive" : ""
                } ${
                  matchStatus === "success" ? "neon-text-glow"              : ""
                }`}
                style={{
                  color:
                    matchStatus === "error"   ? "hsl(var(--destructive))" :
                    matchStatus === "success" ? "hsl(var(--primary))"     :
                    "var(--word-color)",
                }}
              >
                {currentWord.word}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-serif italic">
                {currentWord.translation}
              </p>
            </motion.div>

          ) : (
            /* ── Game-over screen ── */
            <motion.div
              key="gameover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center w-full max-w-sm space-y-6 px-4"
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: [0, 1.4, 0.85, 1.05, 1], rotate: [-30, 12, -6, 2, 0] }}
                transition={{ type: "spring", damping: 7, stiffness: 160, delay: 0.05 }}
                className="text-8xl leading-none select-none"
                aria-hidden
              >
                💀
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <h2 className="text-4xl font-black text-destructive uppercase tracking-widest">Game Over</h2>
                <p className="text-muted-foreground mt-1">
                  You nailed{" "}
                  <span className="text-foreground font-bold">{count}</span>{" "}
                  word{count !== 1 ? "s" : ""} in a row!
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.72 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", damping: 12 }}
                className="bg-card border border-border rounded-2xl p-8"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Final Streak</p>
                <div
                  className="game-word text-8xl font-black leading-none word-glow"
                  style={{ color: "var(--word-color)" }}
                >
                  {count}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-widest font-mono">
                  {language.toUpperCase()} · {category}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <Button
                  size="lg"
                  className="w-full h-14 text-lg font-bold uppercase tracking-widest"
                  onClick={handlePlayAgain}
                >
                  <RotateCcw className="w-5 h-5 mr-2" /> Play Again
                </Button>
                <Button
                  variant="outline" size="lg"
                  className="w-full h-14 text-lg font-bold uppercase tracking-widest bg-transparent"
                  onClick={() => setLocation("/")}
                >
                  <Home className="w-5 h-5 mr-2" /> Main Menu
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom HUD ────────────────────────────────────────────────── */}
      {!gameOver && (
        <div className="absolute bottom-0 left-0 w-full pb-10 px-8 z-10">

          {/* Mic error banner */}
          <AnimatePresence>
            {micError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex items-center justify-center space-x-2 bg-destructive/15 border border-destructive/30 text-destructive text-xs font-mono px-4 py-2 rounded-full mx-auto w-fit"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{micError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spoken text bubble */}
          <div className="h-8 mb-5 flex items-center justify-center pointer-events-none">
            <AnimatePresence>
              {spokenText && (
                <motion.span
                  key={spokenText}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-muted-foreground font-mono bg-background/80 px-4 py-1 rounded-full backdrop-blur border border-border/40"
                >
                  "{spokenText}"
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Button row */}
          <div className="flex items-end justify-center space-x-8">

            {/* Speaker */}
            <div className="flex flex-col items-center space-y-2">
              <motion.button
                onClick={tapSpeak}
                whileTap={{ scale: 0.87 }}
                animate={isSpeaking ? { scale: [1, 1.14, 1] } : { scale: 1 }}
                transition={{ repeat: isSpeaking ? Infinity : 0, duration: 0.65 }}
                aria-label="Hear pronunciation"
                className={`p-4 rounded-full shadow-lg backdrop-blur border-2 transition-colors ${
                  isSpeaking
                    ? "bg-primary/15 border-primary/60 text-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                }`}
              >
                <Volume2 className="w-6 h-6" />
              </motion.button>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">Hear it</p>
            </div>

            {/* Mic */}
            <div className="flex flex-col items-center space-y-2">
              <motion.button
                onClick={tapMic}
                aria-label={micLabel}
                animate={
                  matchStatus === "success" ? { scale: [1, 1.28, 1] } :
                  matchStatus === "error"   ? { scale: [1, 0.72, 1] } :
                  recState === "listening"  ? { scale: [1, 1.08, 1] } :
                  { scale: 1 }
                }
                transition={{
                  repeat: matchStatus === "idle" && recState === "listening" ? Infinity : 0,
                  duration: 1.5,
                }}
                className={`p-6 rounded-full shadow-2xl backdrop-blur cursor-pointer transition-all border-2 ${micClass}`}
              >
                {micIcon}
              </motion.button>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">
                {micLabel}
              </p>
            </div>

            {/* Balance spacer */}
            <div className="w-14" />
          </div>
        </div>
      )}
    </div>
  );
}
