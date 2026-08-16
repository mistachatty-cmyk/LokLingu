import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { createTokenSim, type TokenSimHandle } from '@/lib/particles/token-sim';
import { getSelectedMotion, resolveMotion, MOTION_EVENT } from '@/lib/token-motions';
import { useTokenSkin } from '@/hooks/use-token-skin';

export const TOKEN_SPAWN_EVENT = 'lok-token-spawn';

interface SpawnDetail {
  x: number;
  y: number;
}

/**
 * Fires a token spawn at a real screen position.
 *
 * The old API was `animKey: number` — a monotonically incrementing integer
 * with no coordinate attached, which is fine for a keyframe that always
 * plays in the same place but useless to a simulation that needs to know
 * where the coin launched from. Callers pass the element the token came
 * out of and we take its centre.
 */
export function spawnTokenAt(el: HTMLElement | null): void {
  try {
    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.35;
    if (el) {
      const r = el.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    window.dispatchEvent(
      new CustomEvent<SpawnDetail>(TOKEN_SPAWN_EVENT, { detail: { x, y } }),
    );
  } catch {
    /* non-browser context */
  }
}

/**
 * Full-screen physics surface for earned tokens. Mounted once per game
 * page, behind the HUD. Idles completely when no bodies are alive — the
 * simulation stops its own rAF loop rather than clearing an empty canvas
 * sixty times a second.
 */
export function TokenPhysicsLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<TokenSimHandle | null>(null);
  const reduceMotion = useReducedMotion();
  const { skin } = useTokenSkin();
  const skinRef = useRef(skin);
  skinRef.current = skin;

  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sim = createTokenSim(canvas);
    simRef.current = sim;

    const onSpawn = (e: Event) => {
      const detail = (e as CustomEvent<SpawnDetail>).detail;
      if (!detail) return;
      // Wildcard resolves to a different motion on every spawn.
      const motion = resolveMotion(getSelectedMotion());
      const s = skinRef.current;
      sim.spawn({
        x: detail.x,
        y: detail.y,
        glyph: s?.glyph ?? '🪙',
        // Scaled up from the old label size — the user's note was that
        // tokens weren't noticeable enough.
        size: 30 * (s?.scale ?? 1),
        motion,
      });
    };

    // Re-equipping a motion shouldn't require a remount.
    const onMotionChange = () => {};

    window.addEventListener(TOKEN_SPAWN_EVENT, onSpawn);
    window.addEventListener(MOTION_EVENT, onMotionChange);
    return () => {
      window.removeEventListener(TOKEN_SPAWN_EVENT, onSpawn);
      window.removeEventListener(MOTION_EVENT, onMotionChange);
      sim.stop();
      simRef.current = null;
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // `currentColor` drives the slipstream stroke, so the wake picks up
      // the theme's primary colour automatically.
      className="fixed inset-0 w-full h-full pointer-events-none select-none text-primary"
      style={{ zIndex: 2 }}
    />
  );
}
