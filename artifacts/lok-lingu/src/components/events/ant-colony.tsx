import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GestureSurface } from '@/components/gesture-surface';

/* ------------------------------------------------------------------
   Ant Colony — T0, non-blocking.

   Five ants cross the bottom edge, left to right, staggered. Tap one to
   smash it for a small bonus. Let two reach the far edge untouched and
   they leave 20 tokens behind on their way out — so ignoring it entirely
   isn't a loss, it's just a smaller, later payout instead of a tap-driven
   one. Nothing here can cost anything; every branch pays.

   Coordinates are measured against a same-size stage div rather than
   `window`, same reasoning as Bot-Loko's fix: the GestureSurface is inset
   from the viewport, and mixing those two spaces is exactly the bug that
   made Bot-Loko's slash miss every time before that fix landed.
------------------------------------------------------------------ */

const HIT_RADIUS = 44;
const ANT_COUNT = 5;
/** Fraction of durationMs each ant's own crossing takes — staggered starts
 *  fill the rest, so the last ant still finishes before the beat ends. */
const CROSS_FRACTION = 0.55;

interface Ant {
  id: number;
  startAt: number; // ms into the event
  y: number; // 0..1 lane within the bottom band
  x: number; // current surface-local px, updated by the rAF loop
  alive: boolean;
  escaped: boolean;
}

export function AntColony({
  durationMs,
  onSquash,
  onEscapeBonus,
  onDone,
}: {
  durationMs: number;
  /** Fires once per tapped ant. */
  onSquash: () => void;
  /** Fires once, the moment a second ant reaches the far edge untapped. */
  onEscapeBonus: () => void;
  onDone: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const antsRef = useRef<Ant[]>([]);
  const [, forceRender] = useState(0);
  const escapedCountRef = useRef(0);
  const bonusFiredRef = useRef(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setStage({ w: r.width, h: r.height });
  }, []);

  useEffect(() => {
    if (!stage) return;
    antsRef.current = Array.from({ length: ANT_COUNT }, (_, i) => ({
      id: i,
      startAt: (i / ANT_COUNT) * durationMs * (1 - CROSS_FRACTION),
      y: 0.15 + (i / ANT_COUNT) * 0.7,
      x: -30,
      alive: true,
      escaped: false,
    }));

    const crossMs = durationMs * CROSS_FRACTION;
    const started = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const elapsed = now - started;
      for (const ant of antsRef.current) {
        if (!ant.alive || ant.escaped) continue;
        const local = elapsed - ant.startAt;
        if (local < 0) continue;
        const t = Math.min(1, local / crossMs);
        ant.x = -30 + (stage.w + 60) * t;
        if (t >= 1) {
          ant.escaped = true;
          escapedCountRef.current += 1;
          if (escapedCountRef.current >= 2 && !bonusFiredRef.current) {
            bonusFiredRef.current = true;
            onEscapeBonus();
          }
        }
      }
      forceRender((n) => n + 1);
      if (elapsed >= durationMs) {
        finish();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [stage, durationMs, finish, onEscapeBonus]);

  const handleTap = useCallback(
    (x: number, y: number) => {
      for (const ant of antsRef.current) {
        if (!ant.alive || ant.escaped) continue;
        const ay = (stage?.h ?? 0) * ant.y;
        if (Math.hypot(ant.x - x, ay - y) <= HIT_RADIUS) {
          ant.alive = false;
          onSquash();
          forceRender((n) => n + 1);
          return;
        }
      }
    },
    [stage, onSquash],
  );

  return (
    <GestureSurface
      onTap={handleTap}
      // Ground-level band only — the ants walk near the bottom, and this
      // keeps the tap target from swallowing input higher up the screen.
      inset="inset-x-0 bottom-24 h-24"
      className="z-30"
    >
      <div ref={stageRef} className="pointer-events-none absolute inset-0" />
      {stage &&
        antsRef.current
          .filter((a) => a.alive && !a.escaped)
          .map((ant) => (
            <motion.div
              key={ant.id}
              aria-hidden
              className="pointer-events-none absolute select-none text-xl"
              style={{
                left: ant.x,
                top: stage.h * ant.y,
                translateX: '-50%',
                translateY: '-50%',
                scaleX: -1, // walking left-to-right reads better facing forward
              }}
            >
              🐜
            </motion.div>
          ))}
    </GestureSurface>
  );
}
