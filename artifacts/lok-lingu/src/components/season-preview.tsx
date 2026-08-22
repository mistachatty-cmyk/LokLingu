import { useEffect, useRef } from 'react';
import { createField, type FieldHandle } from '@/lib/particles/field';
import type { Season } from '@/lib/seasons';

interface Props {
  season: Season;
}

/**
 * Live ambient preview for a Seasons shop card. Same idea as
 * `TokenMotionPreview` (a small contained canvas driven by the real engine,
 * not a mocked-up approximation) but for `createField` instead of
 * `createTokenSim` — a `Season`'s `SeasonMotion` is already exactly what
 * `createField` consumes, so no new data shape is needed.
 *
 * Unlike the token previews, this runs continuously rather than firing once
 * per tap — ambient weather is meant to be seen at rest, not triggered.
 * Particle count is capped well below the season's real in-app `baseCount`
 * (tuned for a full screen) so a handful of tiny cards on one page stays
 * cheap and legible at card size.
 */
export function SeasonPreview({ season }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<FieldHandle | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const count = Math.min(season.baseCount, 6);
    const field = createField(canvas, season, count);
    fieldRef.current = field;
    return () => {
      field.stop();
      fieldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season.id]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full pointer-events-none select-none"
    />
  );
}
