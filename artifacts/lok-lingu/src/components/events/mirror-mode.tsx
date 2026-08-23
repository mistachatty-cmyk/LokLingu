import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureSurface, type SlashPath } from '@/components/gesture-surface';
import type { WordPresentation } from '@/lib/word-effects';

/* ------------------------------------------------------------------
   Mirror Mode — T0, non-blocking.

   The word renders flipped (scaleX(-1)). A swipe unflips it early, purely
   as a convenience; left alone, it stays flipped for the whole beat, and
   the double-tokens payoff for answering it *while* flipped is decided by
   the host page's own answer handler — it just checks whether the live
   `presentation.flipX` is still true the moment a correct answer lands,
   the same place every other in-the-moment bonus (Tiger's ambush, the Mi
   family's length bonus) is already computed. This component only owns
   the flip state and the early-clear gesture.

   Reuses `flipX`, already wired into GameWord's `animate` (see that
   file's comment on why flipX has to ride there, not `style`).
------------------------------------------------------------------ */

export function MirrorMode({
  durationMs,
  onPresentation,
  onDone,
}: {
  durationMs: number;
  onPresentation: (p: WordPresentation | null) => void;
  onDone: () => void;
}) {
  const [flipped, setFlipped] = useState(true);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (!flipped) return;
    const t = window.setTimeout(finish, durationMs);
    return () => window.clearTimeout(t);
  }, [flipped, durationMs, finish]);

  useEffect(() => {
    onPresentation(flipped ? { flipX: true } : null);
  }, [flipped, onPresentation]);

  const handleSlash = useCallback(
    (_path: SlashPath) => {
      if (!flipped) return;
      setFlipped(false);
      // A brief beat so the un-flip itself is visible before the event
      // tears down, rather than snapping straight to gone.
      window.setTimeout(finish, 260);
    },
    [flipped, finish],
  );

  return (
    <GestureSurface
      onSlash={handleSlash}
      inset="inset-x-0 top-16 bottom-24"
      className="z-30"
    />
  );
}
