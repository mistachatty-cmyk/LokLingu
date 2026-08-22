import { useEffect, useState } from 'react';
import type { WordPresentation } from '@/lib/word-effects';

/* ------------------------------------------------------------------
   Blurred Word — T0, non-blocking.

   The word softens, holds, then sharpens back with a typewriter
   resolve. Costs nothing and blocks nothing: if the player can still
   read it through the blur, or simply knows the word already, they
   answer straight through and the event never gets in their way.

   This is the gentlest thing in the catalogue on purpose. It exists to
   prove the presentation seam end to end without any interaction risk,
   and it is the one event that is safe at `high` frequency.

   Renders no DOM of its own — it only reports a WordPresentation
   upward, which the director hands to GameWord.
------------------------------------------------------------------ */

const PEAK_BLUR = 7;

export function BlurredWord({
  durationMs,
  onPresentation,
  onDone,
}: {
  durationMs: number;
  onPresentation: (p: WordPresentation | null) => void;
  onDone: () => void;
}) {
  // 'in' → blur ramps up, 'hold' → sits soft, 'out' → sharpens + retypes
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const inMs = durationMs * 0.25;
    const holdMs = durationMs * 0.45;
    const t1 = window.setTimeout(() => setPhase('hold'), inMs);
    const t2 = window.setTimeout(() => setPhase('out'), inMs + holdMs);
    const t3 = window.setTimeout(onDone, durationMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [durationMs, onDone]);

  useEffect(() => {
    onPresentation(
      phase === 'out'
        ? { blur: 0, effect: 'typewriter' }
        : { blur: PEAK_BLUR },
    );
  }, [phase, onPresentation]);

  // Clearing the presentation is the director's job on unmount, not
  // ours — doing it here would race the sharpen-back frame.
  return null;
}
