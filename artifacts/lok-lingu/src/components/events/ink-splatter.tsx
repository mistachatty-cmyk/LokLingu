import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { GestureSurface } from '@/components/gesture-surface';

/* ------------------------------------------------------------------
   Ink Splatter — T1, blocking.

   Ink covers the word; wipe ~60% of it away before answering unlocks.
   Mechanically identical to Scratch Card (same mask + scrub + gate
   primitives), with ink-specific copy and a lower clear threshold so
   the two don't feel like reskins at the table — Scratch Card is a
   careful reveal, this is a quick wipe.

   Reduced motion: three taps instead of a drag, same unlock and payout,
   same reasoning as Scratch Card's.
------------------------------------------------------------------ */

const CLEAR_THRESHOLD = 0.5;
const GRID = 8;

export function InkSplatter({
  onCleared,
  onProgress,
}: {
  onCleared: () => void;
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
      onProgress(Math.max(0, 1 - c / CLEAR_THRESHOLD));
      if (c >= CLEAR_THRESHOLD) finish();
    },
    [finish, onProgress],
  );

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
      inset="inset-x-0 top-16 bottom-24"
      className="z-40"
    >
      <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl border border-indigo-500/40 bg-card/95 p-6 text-center shadow-xl backdrop-blur-sm">
        <p className="text-[11px] font-black uppercase tracking-widest text-indigo-500">
          {reduce ? 'Tap to wipe' : 'Wipe the ink away'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {reduce ? `${taps} / 3` : 'Drag across the splatter'}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-indigo-500"
            animate={{ width: `${Math.round(pct * 100)}%` }}
            transition={{ duration: 0.15, ease: 'linear' }}
          />
        </div>
      </div>
    </GestureSurface>
  );
}
