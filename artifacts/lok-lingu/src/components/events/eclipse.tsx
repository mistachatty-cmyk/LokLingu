import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureSurface } from '@/components/gesture-surface';
import type { WordPresentation } from '@/lib/word-effects';

/* ------------------------------------------------------------------
   The Eclipse — T0, non-blocking.

   A dark disc transits the word over `durationMs`, darkening it at
   the midpoint and clearing on either side — never opaque, since this
   event has no win condition and nothing to unlock. Tapping anywhere
   nudges it along faster, for a small reason to engage, but doing
   nothing at all costs exactly nothing.

   The gentlest interactive event in the catalogue: no gesture is
   required to "win" it, because there is nothing to win. It exists to
   prove that a tap can shape presentation without ever blocking
   answering — Blurred Word proves presentation alone, this proves
   presentation plus an optional nudge.
------------------------------------------------------------------ */

/** Peak mask opacity at the disc's midpoint — dim, never opaque. */
const PEAK_DARKNESS = 0.55;
/** Each tap pulls the transit forward by this fraction. */
const NUDGE = 0.12;

export function Eclipse({
  durationMs,
  onPresentation,
  onDone,
}: {
  durationMs: number;
  onPresentation: (p: WordPresentation | null) => void;
  onDone: () => void;
}) {
  const [t, setT] = useState(0); // 0..1 transit progress
  const tRef = useRef(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const started = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const elapsed = now - started;
      const next = Math.min(1, tRef.current + (16.7 / durationMs));
      tRef.current = Math.max(next, Math.min(1, elapsed / durationMs));
      setT(tRef.current);
      if (tRef.current >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, finish]);

  useEffect(() => {
    // Darkest at the midpoint, clear at both ends — a smooth transit
    // rather than a fade-in-fade-out, so it genuinely reads as passing.
    const darkness = PEAK_DARKNESS * (1 - Math.abs(t - 0.5) * 2);
    onPresentation(darkness > 0.02 ? { maskPct: darkness } : null);
  }, [t, onPresentation]);

  const handleTap = useCallback(() => {
    tRef.current = Math.min(1, tRef.current + NUDGE);
    setT(tRef.current);
  }, []);

  return (
    <GestureSurface onTap={handleTap} inset="inset-x-0 top-16 bottom-24" className="z-30" />
  );
}
