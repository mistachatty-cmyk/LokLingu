import { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { WordPresentation } from '@/lib/word-effects';

/* ------------------------------------------------------------------
   Tomato Splat — T0, non-blocking.

   A tomato flies in and splats across the word; the mess fades on its
   own over `durationMs`. Purely cosmetic — nothing to win, nothing to
   lose, no gesture required. The whole-screen "distraction" the
   original brainstorm described is scoped to a light word-local tint
   instead, same discipline as Light Switch: fighting other overlays
   for the entire viewport buys nothing a word-scoped effect doesn't
   already deliver.
------------------------------------------------------------------ */

const PEAK_DARKNESS = 0.4;

export function TomatoSplat({
  durationMs,
  onPresentation,
  onDone,
}: {
  durationMs: number;
  onPresentation: (p: WordPresentation | null) => void;
  onDone: () => void;
}) {
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onPresentation(null);
    onDone();
  }, [onPresentation, onDone]);

  useEffect(() => {
    // Splat immediately, hold briefly, then fade — a mess, not a fog.
    onPresentation({ maskPct: PEAK_DARKNESS, tint: '#dc2626' });
    const t = window.setTimeout(finish, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, finish, onPresentation]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-center text-5xl"
      initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
      animate={{ opacity: [0, 1, 1, 0], scale: 1, rotate: 0 }}
      transition={{ duration: durationMs / 1000, times: [0, 0.15, 0.75, 1] }}
    >
      🍅
    </motion.div>
  );
}
