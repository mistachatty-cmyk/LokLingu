import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useReducedMotion } from 'framer-motion';
import { createField, type FieldHandle } from '@/lib/particles/field';
import {
  activeSeason,
  isSeasonEnabled,
  seasonsInGame,
  getIntensity,
  INTENSITY_SCALE,
  type Season,
} from '@/lib/seasons';

export const SEASON_EVENT = 'lok-season';

/** Fire after changing any season setting so the live layer picks it up. */
export function announceSeasonChange(): void {
  try {
    window.dispatchEvent(new CustomEvent(SEASON_EVENT));
  } catch {
    /* non-browser context */
  }
}

/**
 * The ambient weather layer. Mounted once, globally, as a sibling of the
 * router — the same position `LiquidGlassCursor` uses, which is the one
 * spot that survives `Layout`'s early return for /game and /draw.
 *
 * It is purely decorative: `pointer-events: none` throughout, always
 * behind content, and it removes itself entirely (rather than merely
 * hiding) whenever it shouldn't be running, so there is no idle rAF loop.
 */
export function SeasonLayer() {
  const [location] = useLocation();
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<FieldHandle | null>(null);
  const [config, setConfig] = useState(() => readConfig());

  function readConfig() {
    return {
      enabled: isSeasonEnabled(),
      inGame: seasonsInGame(),
      season: activeSeason(),
      intensity: getIntensity(),
    };
  }

  // Re-read settings when the shop or the settings drawer changes them.
  useEffect(() => {
    const refresh = () => setConfig(readConfig());
    window.addEventListener(SEASON_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(SEASON_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const inPlay = location === '/game' || location === '/draw';
  // Suppressed during play unless explicitly allowed, and never drawn for
  // players who asked for reduced motion.
  const shouldRun = config.enabled && !reduceMotion && (!inPlay || config.inGame);

  useEffect(() => {
    if (!shouldRun) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const count = particleCount(config.season, config.intensity, inPlay);
    const field = createField(canvas, config.season, count);
    fieldRef.current = field;
    return () => {
      field.stop();
      fieldRef.current = null;
    };
  }, [shouldRun, config.season, config.intensity, inPlay]);

  if (!shouldRun) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none select-none"
      style={{ zIndex: 1 }}
    />
  );
}

function particleCount(season: Season, intensity: string, inPlay: boolean): number {
  const scale = INTENSITY_SCALE[intensity as keyof typeof INTENSITY_SCALE] ?? 1;
  // Narrow screens get proportionally fewer particles, and during play the
  // field is thinned further so it never competes with the word on screen.
  const widthFactor = typeof window !== 'undefined' && window.innerWidth < 480 ? 0.6 : 1;
  const playFactor = inPlay ? 0.5 : 1;
  return Math.max(4, Math.round(season.baseCount * scale * widthFactor * playFactor));
}
