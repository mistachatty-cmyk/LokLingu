import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { GestureSurface, slashHits, type SlashPath } from '@/components/gesture-surface';

/* ------------------------------------------------------------------
   Fruit Slash — T0, non-blocking.

   A thrown fruit arcs across the screen; slash it for a bonus. Unlike
   Bot-Loko (T2 — a real stake, a real drone), this is Bot-Loko's shape
   with the stakes removed: missing costs nothing at all. The object is
   purely a reward opportunity, not a threat.

   Reduced motion: parked mid-arc and tappable, same as Bot-Loko's
   accessibility path.
------------------------------------------------------------------ */

const HIT_RADIUS = 56;
const EXIT_MS = 500;

export function FruitSlash({
  durationMs,
  onHit,
  onDone,
}: {
  durationMs: number;
  /** Slashed in time — the only outcome that pays. */
  onHit: () => void;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -80, y: 120 });
  const [struck, setStruck] = useState(false);
  const resolvedRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const resolve = useCallback(
    (hit: boolean) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      setStruck(hit);
      if (hit) onHit();
      window.setTimeout(onDone, hit ? EXIT_MS : 150);
    },
    [onHit, onDone],
  );

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setStage({ w: r.width, h: r.height });
  }, []);

  // A simple diagonal arc, bottom-left to top-right — a throw, not a
  // targeted flight path (there's nothing this one is "aiming" for).
  useEffect(() => {
    if (!stage) return;
    const { w, h } = stage;
    const startX = w * 0.1;
    const endX = w * 0.9;
    const startY = h * 0.75;
    const endY = h * 0.2;

    if (reduce) {
      setPos({ x: (startX + endX) / 2, y: (startY + endY) / 2 });
      const t = window.setTimeout(() => resolve(false), durationMs);
      return () => window.clearTimeout(t);
    }

    const started = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / durationMs);
      const arc = Math.sin(t * Math.PI) * -90;
      setPos({
        x: startX + (endX - startX) * t,
        y: startY + (endY - startY) * t + arc,
      });
      if (t >= 1) {
        resolve(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, reduce, resolve, stage]);

  const handleMove = useCallback(
    (x: number, y: number) => {
      const p = posRef.current;
      if (Math.hypot(p.x - x, p.y - y) <= HIT_RADIUS) resolve(true);
    },
    [resolve],
  );

  const handleSlash = useCallback(
    (path: SlashPath) => {
      const { x, y } = posRef.current;
      if (slashHits(path, x, y, HIT_RADIUS)) resolve(true);
    },
    [resolve],
  );

  const handleTap = useCallback(
    (x: number, y: number) => {
      const p = posRef.current;
      if (Math.hypot(p.x - x, p.y - y) <= HIT_RADIUS) resolve(true);
    },
    [resolve],
  );

  return (
    <GestureSurface
      onSlash={reduce ? undefined : handleSlash}
      onMove={reduce ? undefined : handleMove}
      onTap={handleTap}
      inset="inset-x-0 top-16 bottom-24"
      className="z-40"
    >
      <div ref={stageRef} className="pointer-events-none absolute inset-0" />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute select-none text-4xl"
        style={{ left: pos.x, top: pos.y, translateX: '-50%', translateY: '-50%' }}
        animate={
          struck
            ? { scale: [1, 1.6, 0], rotate: [0, 40, 120], opacity: [1, 1, 0] }
            : { scale: 1, opacity: 1, rotate: 0 }
        }
        transition={{ duration: struck ? 0.3 : 0.2 }}
      >
        🍉
      </motion.div>

      {struck && (
        <motion.p
          className="pointer-events-none absolute text-[11px] font-mono text-emerald-400"
          style={{ left: pos.x, top: pos.y + 30, translateX: '-50%' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 1, 0], y: -10 }}
          transition={{ duration: 0.7 }}
        >
          nice slice!
        </motion.p>
      )}
    </GestureSurface>
  );
}
