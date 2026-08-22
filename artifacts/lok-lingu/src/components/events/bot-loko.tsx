import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { GestureSurface, slashHits, type SlashPath } from '@/components/gesture-surface';

/* ------------------------------------------------------------------
   Bot-Loko — T2, non-blocking.

   A bat-shaped retrieval drone flies in on a curve, heading for your
   skip counter. Slash it and it drops what it came for. Let it land and
   it takes a skip.

   Lore (docs/EVENTS.md): Bot-Loko is not an animal and not malicious.
   It was built in the same workshop that mints Lok tokens, to retrieve
   dropped coins and return them to the vault. A firmware fault inverted
   the instruction, so it now retrieves them *from* players, entirely
   convinced it is helping. Intercepted, it emits an apologetic squeak.

   Non-blocking on purpose: you can ignore it completely and keep
   answering. The cost of ignoring it is one skip, never a heart and
   never your streak — this is a T2 beat, and a player mid-sentence
   should not have to choose between the word and the drone.

   Reduced motion: the drone appears at rest at its midpoint and is
   tappable rather than requiring a swipe. Same stakes, same window.
------------------------------------------------------------------ */

const HIT_RADIUS = 52;
/** How long the struck animation plus the squeak need to play out. */
const EXIT_MS = 900;

export function BotLoko({
  durationMs,
  onIntercept,
  onEscape,
  onDone,
}: {
  durationMs: number;
  /** Slashed in time — no cost, small reward. */
  onIntercept: () => void;
  /** Reached the counter — takes a skip. */
  onEscape: () => void;
  /**
   * Tear this event down. Called after the resolution animation, not with
   * the payout — the director unmounting us the instant we resolve would
   * throw away the pop and the apologetic squeak, which *are* the payoff.
   */
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -80, y: 120 });
  const [struck, setStruck] = useState(false);
  const resolvedRef = useRef(false);
  // The drone is positioned *inside* the GestureSurface, which is inset from
  // the viewport so the HUD stays reachable. Its `left`/`top` are therefore
  // surface-local, and so are the coordinates GestureSurface reports. Deriving
  // the flight path from `window.innerWidth/innerHeight` mixed the two spaces:
  // every hit test read ~64px (the top inset) too far away, so a swipe that
  // visibly cut the drone in half always missed.
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const resolve = useCallback(
    (hit: boolean) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      setStruck(hit);
      if (hit) onIntercept();
      else onEscape();
      window.setTimeout(onDone, hit ? EXIT_MS : 200);
    },
    [onIntercept, onEscape, onDone],
  );

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setStage({ w: r.width, h: r.height });
  }, []);

  // Flight path: a sine-bowed sweep from the left edge toward the top
  // right, where the skip counter lives in both modes' HUDs.
  useEffect(() => {
    if (!stage) return;
    const { w, h } = stage;
    const startX = -80;
    const endX = w * 0.82;
    const startY = h * 0.55;
    const endY = h * 0.12;

    if (reduce) {
      // Park it mid-path, stationary and tappable.
      setPos({ x: (startX + endX) / 2, y: (startY + endY) / 2 });
      const t = window.setTimeout(() => resolve(false), durationMs);
      return () => window.clearTimeout(t);
    }

    const started = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / durationMs);
      // Bow the path upward mid-flight so it reads as a swoop, not a ruler line.
      const bow = Math.sin(t * Math.PI) * -70;
      setPos({
        x: startX + (endX - startX) * t,
        y: startY + (endY - startY) * t + bow,
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

  // Hit-tested live, on every pointermove, against where the drone is
  // *right now*. Testing only the completed slash against its position at
  // pointer-up misses constantly: the drone travels while you swipe, so a
  // stroke that visibly cut straight through it reads as a clean miss.
  const handleMove = useCallback(
    (x: number, y: number) => {
      const p = posRef.current;
      if (Math.hypot(p.x - x, p.y - y) <= HIT_RADIUS) resolve(true);
    },
    [resolve],
  );

  // Kept as a backstop for a flick fast enough that no single sample lands
  // inside the radius — this sweeps the whole path's segments.
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
      // Leaves the HUD and the mic button live — the drone is a bonus, not
      // a reason to lose control of the screen for five seconds.
      inset="inset-x-0 top-16 bottom-24"
      className="z-40"
    >
      <div ref={stageRef} className="pointer-events-none absolute inset-0" />

      <motion.div
        aria-hidden
        data-bot-loko
        className="pointer-events-none absolute select-none text-4xl"
        style={{ left: pos.x, top: pos.y, translateX: '-50%', translateY: '-50%' }}
        animate={
          struck
            ? { scale: [1, 1.5, 0], rotate: [0, 25, 90], opacity: [1, 1, 0] }
            : { scale: 1, opacity: 1 }
        }
        transition={{ duration: struck ? 0.4 : 0.2 }}
      >
        🦇
      </motion.div>

      {struck && (
        <motion.p
          className="pointer-events-none absolute text-[11px] font-mono text-emerald-400"
          style={{ left: pos.x, top: pos.y + 34, translateX: '-50%' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 1, 0], y: -10 }}
          transition={{ duration: 1 }}
        >
          eep — sorry!
        </motion.p>
      )}
    </GestureSurface>
  );
}
