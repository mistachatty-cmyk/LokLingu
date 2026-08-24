import { useCallback, useEffect, useRef } from 'react';

/* ------------------------------------------------------------------
   GestureSurface — the one interactive layer events draw on.

   Before this, nothing in the running game was interactive. Every
   overlay (celebration, word-pop, token physics, companion layer) is
   `pointer-events: none`, and the single mid-game tap capture is
   `particles/collectibles.ts`, which listens on `window` and hit-tests
   item positions itself. There was no swipe or drag handling anywhere
   in the app outside `draw-canvas.tsx`.

   So rather than each event inventing its own pointer code, they all
   mount this. Three gestures cover every interaction the event
   catalogue needs:

     tap    — lights-out relight, ant smash, vending machine, invaders
     slash  — Bot-Loko intercept, fruit-ninja style throws
     scrub  — scratch card, fog wipe, pull-the-background-back

   Coordinates are reported in surface-local CSS pixels, so an event
   positions its targets in the same space it hit-tests them.

   ── The collectibles conflict ──
   `collectibles.ts` listens on `window` at the capture-phase default
   (bubble), so a tap meant for an event would *also* pop a companion
   collectible underneath it. This surface is a real DOM element above
   it and calls `stopPropagation()`, which stops the bubble to window
   and keeps the two systems from double-firing on one touch.
------------------------------------------------------------------ */

export interface SlashPath {
  /** Sampled polyline in surface-local px. */
  points: [number, number][];
  /** Total path length — lets an event ignore an accidental twitch. */
  length: number;
}

interface Props {
  /** A discrete tap at (x, y), surface-local px. */
  onTap?: (x: number, y: number) => void;
  /**
   * A completed swipe. Fires on pointer-up with the whole sampled path
   * so the event can sweep it against its own targets.
   */
  onSlash?: (path: SlashPath) => void;
  /**
   * Continuous drag progress, throttled to animation frames. `covered`
   * is the fraction of `scrubCells` visited at least once, which is what
   * a scratch card or fog wipe actually wants to threshold on.
   */
  onScrub?: (info: { x: number; y: number; covered: number }) => void;
  /**
   * Grid resolution for scrub coverage. 8 → an 8×8 grid of 64 cells;
   * a cell counts as cleared once the pointer passes within it.
   */
  scrubCells?: number;
  /** Ignore slashes shorter than this (px). Filters out stray taps. */
  minSlashLength?: number;
  /**
   * Live position sample on every pointermove, unthrottled. `onScrub` is
   * rAF-coalesced, which is right for coverage but wrong for hit-testing
   * a moving target — a fast flick past a drone can produce several moves
   * inside one frame, and only the last would be seen.
   */
  onMove?: (x: number, y: number) => void;
  /**
   * Tailwind inset for the capture area. Defaults to the whole screen,
   * but an event that runs for several seconds should leave the HUD
   * reachable — a player must always be able to hit Home or the mic,
   * even mid-beat.
   */
  inset?: string;
  className?: string;
  children?: React.ReactNode;
}

export function GestureSurface({
  onTap,
  onSlash,
  onScrub,
  onMove,
  scrubCells = 8,
  minSlashLength = 40,
  inset = 'inset-0',
  className = '',
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const points = useRef<[number, number][]>([]);
  const moved = useRef(0);
  /** Which scrub grid cells have been visited. */
  const cells = useRef<Set<number>>(new Set());
  const rafPending = useRef(false);

  // Reset coverage if the caller changes resolution mid-life.
  useEffect(() => {
    cells.current = new Set();
  }, [scrubCells]);

  const localPos = useCallback((e: React.PointerEvent): [number, number] => {
    const el = ref.current;
    if (!el) return [0, 0];
    const r = el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }, []);

  const markCell = useCallback(
    (x: number, y: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const cx = Math.min(scrubCells - 1, Math.max(0, Math.floor((x / r.width) * scrubCells)));
      const cy = Math.min(scrubCells - 1, Math.max(0, Math.floor((y / r.height) * scrubCells)));
      cells.current.add(cy * scrubCells + cx);
    },
    [scrubCells],
  );

  const handleDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Keep the tap from also reaching collectibles.ts's window listener.
      e.stopPropagation();
      e.preventDefault();
      const el = ref.current;
      if (!el) return;
      el.setPointerCapture(e.pointerId);
      drawing.current = true;
      moved.current = 0;
      const p = localPos(e);
      points.current = [p];
      markCell(p[0], p[1]);
      onMove?.(p[0], p[1]);
    },
    [localPos, markCell, onMove],
  );

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drawing.current) return;
      e.stopPropagation();
      const p = localPos(e);
      const prev = points.current[points.current.length - 1];
      if (prev) {
        moved.current += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      }
      points.current.push(p);
      markCell(p[0], p[1]);
      onMove?.(p[0], p[1]);

      // Coverage is reported at most once per frame — a fast drag can
      // fire dozens of pointermove events between paints and there is no
      // reason to re-render for each.
      if (onScrub && !rafPending.current) {
        rafPending.current = true;
        requestAnimationFrame(() => {
          rafPending.current = false;
          onScrub({
            x: p[0],
            y: p[1],
            covered: cells.current.size / (scrubCells * scrubCells),
          });
        });
      }
    },
    [localPos, markCell, onScrub, scrubCells],
  );

  const handleUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drawing.current) return;
      e.stopPropagation();
      drawing.current = false;
      const path = points.current;
      const distance = moved.current;
      points.current = [];

      // Short and stationary reads as a tap; anything longer is a slash.
      if (distance < minSlashLength) {
        const p = path[0];
        if (p && onTap) onTap(p[0], p[1]);
        return;
      }
      if (onSlash) onSlash({ points: path, length: distance });
    },
    [minSlashLength, onSlash, onTap],
  );

  return (
    <div
      ref={ref}
      className={`absolute ${inset} ${className}`}
      // `touch-action: none` or the browser scroll-steals the drag on
      // mobile before we ever see a pointermove — the same reason
      // draw-canvas.tsx sets it.
      style={{ touchAction: 'none' }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      {children}
    </div>
  );
}

/**
 * Does a slash path pass within `radius` of (tx, ty)?
 *
 * Tests the *segments*, not just the sampled vertices: a fast flick can
 * report points 80px apart, and checking only those would miss a target
 * the stroke visibly cut straight through.
 */
export function slashHits(
  path: SlashPath,
  tx: number,
  ty: number,
  radius: number,
): boolean {
  const r2 = radius * radius;
  for (let i = 1; i < path.points.length; i++) {
    const [ax, ay] = path.points[i - 1];
    const [bx, by] = path.points[i];
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    // Degenerate segment — fall back to a point test.
    let t = lenSq === 0 ? 0 : ((tx - ax) * dx + (ty - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const ddx = tx - px;
    const ddy = ty - py;
    if (ddx * ddx + ddy * ddy <= r2) return true;
  }
  return false;
}
