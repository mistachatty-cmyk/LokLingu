import { useCallback, useEffect, useState } from 'react';
import { GestureSurface } from '@/components/gesture-surface';
import type { WordPresentation } from '@/lib/word-effects';

/* ------------------------------------------------------------------
   Light Switch — T1, non-blocking.

   The word inverts (light-on-dark ↔ dark-on-light, via the existing
   `invert` filter — see game-word.tsx's composed-filter comment) until
   the player taps to flip it back. Unlike Mirror Mode's timer, this one
   only clears on the tap, or on the escape hatch if nobody ever taps it —
   there is no reward for leaving it inverted, so unlike Mirror Mode there
   is nothing to lose by flipping it back immediately.

   Scoped to the word itself, not "the whole screen" as the original
   brainstorm phrased it — inverting the entire viewport would fight
   every other effect's contrast assumptions (mask overlays, tints) and
   buys nothing a word-scoped invert doesn't already deliver: the point is
   a visually jarring, instantly-readable-once-flipped beat, not a
   disorientation puzzle.
------------------------------------------------------------------ */

export function LightSwitch({
  durationMs,
  onPresentation,
  onDone,
}: {
  durationMs: number;
  onPresentation: (p: WordPresentation | null) => void;
  onDone: () => void;
}) {
  const [inverted, setInverted] = useState(true);

  const handleTap = useCallback(() => {
    if (!inverted) return;
    setInverted(false);
    // A beat so the flip-back itself reads before the event tears down.
    window.setTimeout(onDone, 200);
  }, [inverted, onDone]);

  useEffect(() => {
    onPresentation(inverted ? { invert: true } : null);
  }, [inverted, onPresentation]);

  return (
    <GestureSurface
      onTap={handleTap}
      inset="inset-x-0 top-16 bottom-24"
      className="z-30"
    />
  );
}
