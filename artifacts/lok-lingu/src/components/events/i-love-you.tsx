import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WordPresentation } from '@/lib/word-effects';

/* ------------------------------------------------------------------
   I Love You — T0, non-blocking, zero interaction.

   The word is replaced with "I love you" for a beat, an audible awww
   plays, "I love you too" slides in beside it, and applause closes it
   out before the real word returns. Purely a celebration — no gesture,
   no stake, nothing to answer.

   Simplification, stated plainly: the brief described *saying* "I love
   you" as the trigger, which would mean the answer target itself
   becomes "I love you" for that turn — real engine work in the grading
   path, and risky to the learning-data invariant every other event in
   this file is careful never to touch (see docs/EVENTS.md). This ships
   as a fixed-timeline affective beat instead, in the same family as The
   Toast and The Cheer: zero interaction, all upside, nothing graded.
------------------------------------------------------------------ */

export function ILoveYou({
  durationMs,
  onPresentation,
  onAwww,
  onApplause,
  onDone,
}: {
  durationMs: number;
  onPresentation: (p: WordPresentation | null) => void;
  onAwww: () => void;
  onApplause: () => void;
  onDone: () => void;
}) {
  const doneRef = useRef(false);

  useEffect(() => {
    onPresentation({ text: 'I love you' });
    const awwwAt = window.setTimeout(onAwww, Math.round(durationMs * 0.35));
    const applauseAt = window.setTimeout(onApplause, Math.round(durationMs * 0.75));
    const doneAt = window.setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      onPresentation(null);
      onDone();
    }, durationMs);
    return () => {
      window.clearTimeout(awwwAt);
      window.clearTimeout(applauseAt);
      window.clearTimeout(doneAt);
    };
  }, [durationMs, onPresentation, onAwww, onApplause, onDone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[62%] z-30 flex justify-center">
      <AnimatePresence>
        <motion.p
          key="reply"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: (durationMs * 0.35) / 1000, duration: 0.3 }}
          className="text-lg font-semibold text-rose-400"
        >
          I love you too 💕
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
