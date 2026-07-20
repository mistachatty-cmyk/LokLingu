/**
 * Draw Mode — LokBook canvas engine integrated into Lok Lingu
 *
 * Game flow:
 *  1. Word shown at top  →  user traces / writes it on the canvas
 *  2. Tap ✓ Done  →  canvas strokes FADE OUT (LokBook fade engine)
 *                     next word dissolves in
 *  3. Tap 🗑 Clear  →  erase and retry current word (no penalty)
 *  4. Streak counted on every confirmed word
 *  5. Hearts mode optional (same localStorage flag as voice mode)
 *     In draw mode a "wrong" attempt = submitting with zero strokes
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetWords, useSubmitScore } from "@workspace/api-client-react";
import { useUser } from "../hooks/use-user";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eraser, Check, Heart, Home, RotateCcw,
  Infinity as InfinityIcon, Volume2, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DrawCanvas, { type DrawCanvasHandle } from "../components/draw-canvas";

// ── TTS (reuse same util as voice game) ─────────────────────────────────────
const LANG_MAP: Record<string, string> = {
  es: "es-ES", fr: "fr-FR", it: "it-IT", de: "de-DE", ja: "ja-JP",
};

function pronounce(text: string, lang: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u    = new SpeechSynthesisUtterance(text);
  u.lang     = LANG_MAP[lang] ?? "es-ES";
  u.rate     = parseFloat(localStorage.getItem("lok-lingu-tts-rate")   ?? "0.82");
  u.volume   = parseFloat(localStorage.getItem("lok-lingu-tts-volume") ?? "1");
  window.speechSynthesis.speak(u);
}

const MAX_LIVES = 3;

// ── Ink colour options ────────────────────────────────────────────────────────
const INK_OPTIONS = [
  { label: "Primary",   css: "hsl(var(--primary))"     },
  { label: "Rose",      css: "#ff3399"                  },
  { label: "Amber",     css: "#ffaa22"                  },
  { label: "Violet",    css: "#aa77ff"                  },
  { label: "White",     css: "#ffffff"                  },
  { label: "Charcoal",  css: "#334455"                  },
];

export default function DrawGame() {
  const [, setLocation]  = useLocation();
  const { userId }       = useUser();

  const language   = localStorage.getItem("lok-lingu-lang")      ?? "es";
  const category   = localStorage.getItem("lok-lingu-cat")       ?? "numbers";
  const heartsMode = localStorage.getItem("lok-lingu-hearts")    !== "false";
  const autoSpeak  = localStorage.getItem("lok-lingu-auto-speak") === "true";

  const { data: words, isLoading } = useGetWords(language, category, {
    query: { enabled: true, queryKey: ["words", language, category] },
  });
  const submitScore = useSubmitScore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [wordIndex, setWordIndex] = useState(0);
  const [count,     setCount]     = useState(0);
  const [lives,     setLives]     = useState(MAX_LIVES);
  const [gameOver,  setGameOver]  = useState(false);
  const [phase,     setPhase]     = useState<"draw" | "fading" | "next">("draw");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inkColor,  setInkColor]  = useState(INK_OPTIONS[0].css);
  const [showGuide, setShowGuide] = useState(true);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const canvasRef    = useRef<DrawCanvasHandle>(null);
  const countRef     = useRef(0);
  const livesRef     = useRef(MAX_LIVES);
  const wordIndexRef = useRef(0);
  const gameOverRef  = useRef(false);

  // ── Guard ──────────────────────────────────────────────────────────────────
  useEffect(() => { if (!userId) setLocation("/"); }, [userId, setLocation]);

  // ── Auto-speak on new word ─────────────────────────────────────────────────
  useEffect(() => {
    if (autoSpeak && words?.[wordIndex] && !gameOver) {
      pronounce(words[wordIndex].word, language);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordIndex, words]);

  // ── Draw word guide ghost ──────────────────────────────────────────────────
  useEffect(() => {
    if (showGuide && words?.[wordIndex] && phase === "draw") {
      // Small delay so canvas is ready after word change
      const t = setTimeout(() => {
        canvasRef.current?.drawWordGuide(words[wordIndex].word, inkColor);
      }, 80);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [wordIndex, showGuide, phase, inkColor, words]);

  // ── Confirm (advance word) ─────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (phase !== "draw" || gameOverRef.current) return;

    const strokes = canvasRef.current?.getStrokeCount() ?? 0;

    // "Wrong" in draw mode = submitting with zero strokes (no attempt)
    if (strokes === 0 && heartsMode) {
      const nl = livesRef.current - 1;
      livesRef.current = nl;
      setLives(nl);
      if (nl <= 0) {
        gameOverRef.current = true;
        setGameOver(true);
        if (userId) {
          submitScore.mutate({
            data: { userId, language, category, count: countRef.current },
          });
        }
      }
      return;
    }

    // ── Success path ────────────────────────────────────────────────────────
    setPhase("fading");
    const n = countRef.current + 1;
    countRef.current = n;
    setCount(n);

    // 🎯 Core LokBook fade: strokes dissolve over 900 ms
    await canvasRef.current?.fadeOut(900);

    // Advance word
    if (!words) return;
    const ni = (wordIndexRef.current + 1) % words.length;
    wordIndexRef.current = ni;
    setWordIndex(ni);
    setPhase("draw");
  }, [phase, heartsMode, userId, language, category, words, submitScore]);

  // ── Clear canvas (retry same word) ────────────────────────────────────────
  const handleClear = useCallback(() => {
    canvasRef.current?.clear();
    if (showGuide && words?.[wordIndex]) {
      setTimeout(() => {
        canvasRef.current?.drawWordGuide(words[wordIndex].word, inkColor);
      }, 40);
    }
  }, [showGuide, words, wordIndex, inkColor]);

  // ── Speak ──────────────────────────────────────────────────────────────────
  const handleSpeak = useCallback(() => {
    const w = words?.[wordIndex]?.word;
    if (!w) return;
    setIsSpeaking(true);
    pronounce(w, language);
    setTimeout(() => setIsSpeaking(false), 1400);
  }, [words, wordIndex, language]);

  // ── Play again ─────────────────────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    canvasRef.current?.clear();
    setCount(0); setLives(MAX_LIVES); setWordIndex(0); setGameOver(false); setPhase("draw");
    countRef.current = 0; livesRef.current = MAX_LIVES;
    wordIndexRef.current = 0; gameOverRef.current = false;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  if (!userId) return null;

  if (isLoading || !words) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Pencil className="w-10 h-10 text-primary" />
        </motion.div>
        <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest">Loading words…</p>
      </div>
    );
  }

  const currentWord = words[wordIndex];

  return (
    <div className="relative min-h-screen w-full bg-background flex flex-col select-none overflow-hidden">

      {/* ── Top HUD ───────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between flex-shrink-0 z-10">

        {/* Lives / Infinite */}
        {heartsMode ? (
          <div className="flex space-x-1.5">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart key={i} className={`w-7 h-7 transition-all ${
                i < lives
                  ? "text-destructive fill-destructive drop-shadow-[0_0_6px_hsl(var(--destructive))]"
                  : "opacity-20 text-muted-foreground"
              }`} />
            ))}
          </div>
        ) : (
          <div className="flex items-center space-x-1 bg-card/70 backdrop-blur px-2.5 py-1 rounded-full border border-primary/30">
            <InfinityIcon className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Infinite</span>
          </div>
        )}

        {/* Streak */}
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Streak</p>
          <motion.div
            key={count}
            initial={{ scale: 1.5, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 11 }}
            className="game-word text-4xl font-black leading-none word-glow"
            style={{ color: "var(--word-color)" }}
          >
            {count}
          </motion.div>
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 px-4 pb-4 space-y-3">

        <AnimatePresence mode="wait">
          {!gameOver ? (
            <motion.div
              key={wordIndex}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col min-h-0 flex-1 space-y-3"
            >
              {/* Word header */}
              <div className="text-center flex-shrink-0">
                <div className="flex items-center justify-center space-x-3">
                  <h1
                    className="game-word text-5xl font-black capitalize leading-tight word-glow"
                    style={{ color: "var(--word-color)" }}
                  >
                    {currentWord.word}
                  </h1>
                  {/* Speak button */}
                  <motion.button
                    onClick={handleSpeak}
                    whileTap={{ scale: 0.88 }}
                    animate={isSpeaking ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    transition={{ repeat: isSpeaking ? Infinity : 0, duration: 0.65 }}
                    className={`p-2.5 rounded-full border-2 transition-colors flex-shrink-0 ${
                      isSpeaking
                        ? "bg-primary/15 border-primary/60 text-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                    }`}
                    aria-label="Hear pronunciation"
                  >
                    <Volume2 className="w-4 h-4" />
                  </motion.button>
                </div>
                <p className="text-base text-muted-foreground font-serif italic mt-0.5">
                  {currentWord.translation}
                </p>
              </div>

              {/* Canvas — the heart of the draw engine */}
              <div className="relative flex-1 min-h-0">
                <div
                  className={`relative w-full h-full rounded-2xl border-2 overflow-hidden transition-all ${
                    phase === "fading"
                      ? "border-primary/60 shadow-[0_0_24px_hsl(var(--primary)/0.25)]"
                      : "border-border"
                  }`}
                  style={{ background: "hsl(var(--card))", minHeight: 260 }}
                >
                  <DrawCanvas
                    ref={canvasRef}
                    inkColor={inkColor}
                    lineWidth={11}
                    className="absolute inset-0 h-full"
                  />
                  {/* Fading overlay label */}
                  <AnimatePresence>
                    {phase === "fading" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      >
                        <span className="text-xs font-black uppercase tracking-widest text-primary/70 font-mono">
                          Nice ✓
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Ink colour picker */}
              <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex space-x-2">
                  {INK_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setInkColor(opt.css)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        inkColor === opt.css
                          ? "border-foreground scale-110"
                          : "border-border opacity-60 hover:opacity-100"
                      }`}
                      style={{ background: opt.css }}
                      title={opt.label}
                      aria-label={`Use ${opt.label} ink`}
                    />
                  ))}
                </div>

                {/* Guide toggle */}
                <button
                  onClick={() => {
                    const next = !showGuide;
                    setShowGuide(next);
                    if (!next) canvasRef.current?.clear();
                    else if (words?.[wordIndex]) {
                      setTimeout(() => canvasRef.current?.drawWordGuide(words[wordIndex].word, inkColor), 40);
                    }
                  }}
                  className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border transition-colors ${
                    showGuide
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Guide
                </button>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={phase === "fading"}
                  className="h-12 font-bold uppercase tracking-widest text-sm"
                >
                  <Eraser className="w-4 h-4 mr-2" /> Clear
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={phase === "fading"}
                  className="h-12 font-bold uppercase tracking-widest text-sm"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {phase === "fading" ? "Fading…" : "Done ✓"}
                </Button>
              </div>
            </motion.div>

          ) : (
            /* ── Game Over ── */
            <motion.div
              key="gameover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center space-y-6 px-4 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: [0, 1.4, 0.85, 1.05, 1] }}
                transition={{ type: "spring", damping: 7, stiffness: 160, delay: 0.05 }}
                className="text-8xl leading-none select-none"
              >
                🖊️
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h2 className="text-4xl font-black text-destructive uppercase tracking-widest">Session Over</h2>
                <p className="text-muted-foreground mt-1">
                  You traced <span className="text-foreground font-bold">{count}</span> word{count !== 1 ? "s" : ""}!
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45, type: "spring", damping: 12 }}
                className="bg-card border border-border rounded-2xl p-8 w-full max-w-xs"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Words Traced</p>
                <div className="game-word text-7xl font-black leading-none word-glow" style={{ color: "var(--word-color)" }}>
                  {count}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-widest font-mono">
                  {language.toUpperCase()} · {category}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="space-y-3 w-full max-w-xs"
              >
                <Button size="lg" className="w-full h-13 text-base font-bold uppercase tracking-widest" onClick={handlePlayAgain}>
                  <RotateCcw className="w-5 h-5 mr-2" /> Trace Again
                </Button>
                <Button variant="outline" size="lg" className="w-full h-13 text-base font-bold uppercase tracking-widest bg-transparent" onClick={() => setLocation("/")}>
                  <Home className="w-5 h-5 mr-2" /> Main Menu
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
