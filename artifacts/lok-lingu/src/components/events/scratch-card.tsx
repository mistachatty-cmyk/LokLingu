import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { GestureSurface } from '@/components/gesture-surface';

/* ------------------------------------------------------------------
   Scratch Card — T1, blocking.

   The word hides under a foil panel. Scratch ~60% of it away and
   answering unlocks. Costs only the few seconds it takes.

   This is the event that proves the two risky primitives at once: a
   real gesture (GestureSurface's `scrub`) and a real hold on the answer
   gate. It is also the one that most needs the escape hatch — the
   director auto-resolves it in the player's favour after `durationMs`,
   so a dead digitiser or a motor difficulty never traps anyone.

   Reduced motion swaps the drag for three large tap targets: same
   unlock, same payout, no sustained gesture required. An accessibility
   setting must not become a paywall on progress.
------------------------------------------------------------------ */

/** Fraction of the panel that must be cleared before answering unlocks. */
const CLEAR_THRESHOLD = 0.6;
const GRID = 8;

export function ScratchCard({
  onCleared,
  onProgress,
}: {
  /** Fires once, when the panel is cleared enough to answer. */
  onCleared: () => void;
  /** 0–1, for the director to render as a mask over the word. */
  onProgress: (pct: number) => void;
}) {
  const reduce = useReducedMotion();
  const [covered, setCovered] = useState(0);
  const [taps, setTaps] = useState(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onProgress(0);
    onCleared();
  }, [onCleared, onProgress]);

  const handleScrub = useCallback(
    ({ covered: c }: { covered: number }) => {
      setCovered(c);
      // Mask opacity falls as coverage rises; normalising by the
      // threshold means the word is fully clear exactly when it unlocks,
      // rather than still half-hidden at the moment you may answer.
      onProgress(Math.max(0, 1 - c / CLEAR_THRESHOLD));
      if (c >= CLEAR_THRESHOLD) finish();
    },
    [finish, onProgress],
  );

  // Reduced-motion path: three taps, no drag.
  const handleTap = useCallback(() => {
    setTaps((t) => {
      const next = t + 1;
      onProgress(Math.max(0, 1 - next / 3));
      if (next >= 3) finish();
      return next;
    });
  }, [finish, onProgress]);

  useEffect(() => {
    onProgress(1);
  }, [onProgress]);

  const pct = reduce ? taps / 3 : Math.min(1, covered / CLEAR_THRESHOLD);

  return (
    <GestureSurface
      onScrub={reduce ? undefined : handleScrub}
      onTap={reduce ? handleTap : undefined}
      scrubCells={GRID}
      // Same reasoning as Bot-Loko: this can hold the answer gate for
      // several seconds, so Home and the mic must stay reachable.
      inset="inset-x-0 top-16 bottom-24"
      className="z-40"
    >
      <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl border border-primary/40 bg-card/95 p-6 text-center shadow-xl backdrop-blur-sm">
        <p className="text-[11px] font-black uppercase tracking-widest text-primary">
          {reduce ? 'Tap to reveal' : 'Scratch to reveal'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {reduce ? `${taps} / 3` : 'Drag across the panel'}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${Math.round(pct * 100)}%` }}
            transition={{ duration: 0.15, ease: 'linear' }}
          />
        </div>
      </div>
    </GestureSurface>
  );
}
