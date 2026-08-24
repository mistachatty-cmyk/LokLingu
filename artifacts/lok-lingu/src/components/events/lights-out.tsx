import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GestureSurface } from '@/components/gesture-surface';
import type { WordPresentation } from '@/lib/word-effects';

/* ------------------------------------------------------------------
   Lights Out — T1, blocking.

   The word goes dark. Tap 10 times to bring the lights back up — each
   tap fills one node on a bar and lifts the mask a little, so the
   screen gets visibly brighter as you go rather than snapping back at
   the last tap.

   Scoped to the word (a `maskPct` mask), not the whole viewport, same
   discipline as Light Switch and Tomato Splat — see their comments for
   why. The node bar is the event's own UI, not a HUD change.
------------------------------------------------------------------ */

const TAPS_NEEDED = 10;

export function LightsOut({
  onPresentation,
  onCleared,
}: {
  onPresentation: (p: WordPresentation | null) => void;
  onCleared: () => void;
}) {
  const [taps, setTaps] = useState(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onPresentation(null);
    onCleared();
  }, [onPresentation, onCleared]);

  const handleTap = useCallback(() => {
    setTaps((t) => {
      const next = Math.min(TAPS_NEEDED, t + 1);
      onPresentation({ maskPct: 1 - next / TAPS_NEEDED });
      if (next >= TAPS_NEEDED) finish();
      return next;
    });
  }, [finish, onPresentation]);

  useEffect(() => {
    onPresentation({ maskPct: 1 });
  }, [onPresentation]);

  return (
    <GestureSurface
      onTap={handleTap}
      inset="inset-x-0 top-16 bottom-24"
      className="z-40"
    >
      <div className="pointer-events-none absolute inset-x-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">
          Tap to relight
        </p>
        <div className="flex gap-1">
          {Array.from({ length: TAPS_NEEDED }).map((_, i) => (
            <motion.div
              key={i}
              className={`h-6 w-2 rounded-full ${i < taps ? 'bg-amber-400' : 'bg-muted'}`}
              animate={{ opacity: i < taps ? 1 : 0.4, scaleY: i < taps ? 1 : 0.7 }}
              transition={{ duration: 0.15 }}
            />
          ))}
        </div>
      </div>
    </GestureSurface>
  );
}
