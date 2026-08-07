import { useEffect, useRef, useState } from 'react';

/**
 * A live frame-time guard for the expensive token skins.
 *
 * The point is not to measure FPS for display — the dev overlay already
 * does that — but to give animation code a single boolean it can respect:
 * "am I allowed to spend more right now?".
 *
 * Deliberately conservative:
 *   - It samples with one rAF loop shared by whoever mounts it, and does
 *     no work beyond incrementing a counter, so the guard cannot itself
 *     be the thing that costs frames.
 *   - It degrades fast (one bad second) but recovers slowly (three good
 *     seconds), so a skin does not flicker between budgets while the
 *     player watches.
 */
export type PerfBudget = 'full' | 'reduced';

const DEGRADE_BELOW_FPS = 45;
const RECOVER_ABOVE_FPS = 55;
const GOOD_SECONDS_TO_RECOVER = 3;

export function usePerfBudget(enabled = true): PerfBudget {
  const [budget, setBudget] = useState<PerfBudget>('full');
  const goodRunRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    let frames = 0;
    let windowStart = performance.now();
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      frames += 1;
      const now = performance.now();
      const elapsed = now - windowStart;

      if (elapsed >= 1000) {
        const fps = (frames * 1000) / elapsed;
        frames = 0;
        windowStart = now;

        if (fps < DEGRADE_BELOW_FPS) {
          goodRunRef.current = 0;
          setBudget('reduced');
        } else if (fps > RECOVER_ABOVE_FPS) {
          goodRunRef.current += 1;
          if (goodRunRef.current >= GOOD_SECONDS_TO_RECOVER) setBudget('full');
        } else {
          goodRunRef.current = 0;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  return budget;
}
