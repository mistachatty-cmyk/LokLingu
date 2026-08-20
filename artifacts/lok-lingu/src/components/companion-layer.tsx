import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { createField, type FieldHandle } from '@/lib/particles/field';
import { getEquippedCompanion } from '@/hooks/use-celebration';
import { getCompanionKit } from '@/lib/companions';

/**
 * Ambient-only companion effect — Phase 1 of docs/COMPANIONS.md's build
 * order. Reuses createField() exactly as SeasonLayer does, just scoped to
 * whichever companion is equipped rather than the global season setting.
 *
 * Deliberately NOT reactive to equip changes while mounted: equipping only
 * happens from the roadmap page, a full navigation away from game/draw, so
 * a one-shot read on mount (same pattern CompanionWidget already uses) is
 * enough — no event plumbing needed for something that can't change under
 * the player's feet.
 *
 * `pointer-events: none` and always behind content — the one rule
 * everything in COMPANIONS.md bends around: this must never compete with
 * the word or the controls. Removes itself entirely under reduced motion,
 * same as SeasonLayer; there is no reward riding on this layer (that's
 * what makes it safe to do so — the collectible layer, not built yet, is
 * the one that has to stay tappable under reduced motion instead).
 */
export function CompanionLayer() {
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<FieldHandle | null>(null);
  const [equippedId] = useState(() => getEquippedCompanion());

  const kit = equippedId ? getCompanionKit(equippedId) : null;
  const season = kit?.ambient;
  const shouldRun = !!season && !reduceMotion;

  useEffect(() => {
    if (!shouldRun || !season) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const field = createField(canvas, season, season.baseCount);
    fieldRef.current = field;
    return () => {
      field.stop();
      fieldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRun, season?.id]);

  if (!shouldRun) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full pointer-events-none select-none"
      style={{ zIndex: 1 }}
    />
  );
}
