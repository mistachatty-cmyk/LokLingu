import { useEffect, useRef } from 'react';
import { createTokenSim, type TokenSimHandle } from '@/lib/particles/token-sim';
import type { TokenMotionDef } from '@/lib/token-motions';

interface Props {
  motion: TokenMotionDef;
  glyph: string;
  /** Bump to trigger a fresh spawn — same animKey idiom as TokenEarnedLabel/TokenVaultLayer. */
  animKey: number;
}

/**
 * Live physics preview for a Motion shop card. Mounts a small contained
 * canvas and drives it with the exact same `createTokenSim` used by
 * `TokenPhysicsLayer` in real gameplay — so what a player sees in the shop
 * is not a mocked-up approximation, it's the real simulation at card scale.
 * `token-sim.ts`'s floor/wall collision is relative to `canvas.clientHeight`/
 * `clientWidth`, so it already works correctly at any container size.
 */
export function TokenMotionPreview({ motion, glyph, animKey }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<TokenSimHandle | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sim = createTokenSim(canvas);
    simRef.current = sim;
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (animKey === 0) return;
    const canvas = canvasRef.current;
    const sim = simRef.current;
    if (!canvas || !sim) return;
    // Every TokenMotionDef's physics (speed, gravity) is tuned for a
    // full-height gameplay canvas — spawned unscaled here, the body would
    // cross this small card in 1-2 frames and read as "nothing happened".
    // Scaling both speed and gravity together by the container's height
    // relative to a typical gameplay canvas keeps the flight's shape
    // (parabola, bounce pattern) intact while containing it visibly.
    const REFERENCE_CANVAS_HEIGHT = 640;
    const physicsScale = Math.max(0.05, Math.min(1, canvas.clientHeight / REFERENCE_CANVAS_HEIGHT));
    sim.spawn({
      x: canvas.clientWidth / 2,
      y: canvas.clientHeight * 0.2,
      glyph,
      size: 22,
      motion,
      physicsScale,
    });
    // Intentionally only re-fires on animKey — motion/glyph changing without
    // a bump shouldn't spawn anything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full pointer-events-none select-none text-primary"
    />
  );
}
