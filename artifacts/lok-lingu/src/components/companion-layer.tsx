import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { createField, type FieldHandle } from '@/lib/particles/field';
import { createCollectibles, type CollectiblesHandle } from '@/lib/particles/collectibles';
import { getEquippedCompanion } from '@/hooks/use-celebration';
import { getCompanionKit } from '@/lib/companions';
import { rollReward, grantReward } from '@/lib/companion-rewards';
import { useCelebrationSound } from '@/hooks/use-celebration-sound';

interface Props {
  /** The element wrapping the word + its controls (mic/speak/skip buttons).
   *  Collectibles never spawn inside this rect (inflated), so a tap never
   *  lands where a real answer or control would be instead. Omit on a
   *  screen with no collectible-bearing companion equipped. */
  zoneRef?: React.RefObject<HTMLElement | null>;
  /** Called with a short label ("+5", "+1 skip") each time a collectible
   *  pays out, so the host screen can flash its own token/skip counter. */
  onReward?: (label: string) => void;
  /** Words answered correctly this run (celebration.matchCount). Drives
   *  milestone bursts (e.g. NiNi's bamboo explosion every 10 words) —
   *  visual/sound only, no separate reward grant. */
  wordCount?: number;
}

/**
 * Ambient + collectible companion effects. Ambient is Phase 1 (unchanged);
 * the collectible canvas is Phase 2 of docs/COMPANIONS.md — a small,
 * bounded, tappable layer for companions whose CompanionKit defines one
 * (NiNi's bamboo today).
 *
 * Deliberately NOT reactive to equip changes while mounted: equipping only
 * happens from the roadmap page, a full navigation away from game/draw, so
 * a one-shot read on mount (same pattern CompanionWidget already uses) is
 * enough — no event plumbing needed for something that can't change under
 * the player's feet.
 *
 * The collectible canvas stays `pointer-events: none` — collectibles.ts
 * listens on `window` for taps instead, so this layer can never steal a
 * click meant for a real button (the one rule everything in
 * COMPANIONS.md bends around).
 */
export function CompanionLayer({ zoneRef, onReward, wordCount = 0 }: Props) {
  const reduceMotion = useReducedMotion();
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const collectCanvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<FieldHandle | null>(null);
  const collectiblesRef = useRef<CollectiblesHandle | null>(null);
  const { play } = useCelebrationSound();
  const [equippedId] = useState(() => getEquippedCompanion());
  /** Per-mount collect counter — the closest available proxy to "per run"
   *  since resetMatch() isn't called consistently across game.tsx/draw.tsx
   *  (see use-celebration.ts). A fresh mount is a fresh run either way. */
  const collectedRef = useRef(0);
  /** Last wordCount a burst fired at, so a re-render at the same count
   *  (e.g. a sibling state update) can't double-fire it. */
  const lastBurstAtRef = useRef(0);
  /** Amber's bottle fill, since last burst — resets to 0 each time it pays out. */
  const chargeRef = useRef(0);

  const kit = equippedId ? getCompanionKit(equippedId) : null;
  const season = kit?.ambient;
  const collectible = kit?.collectible;
  const shouldRunAmbient = !!season && !reduceMotion;
  // Collectibles keep paying out under reduced motion (spawn static, no
  // drift) — only the growth/pop animation is skipped, inside collectibles.ts.
  const shouldRunCollectibles = !!collectible;

  useEffect(() => {
    if (!shouldRunAmbient || !season) return;
    const canvas = ambientCanvasRef.current;
    if (!canvas) return;
    const field = createField(canvas, season, season.baseCount);
    fieldRef.current = field;
    return () => {
      field.stop();
      fieldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRunAmbient, season?.id]);

  useEffect(() => {
    if (!shouldRunCollectibles || !collectible) return;
    const canvas = collectCanvasRef.current;
    if (!canvas) return;
    const handle = createCollectibles(canvas, {
      glyph: collectible.glyph,
      spawnEveryMs: collectible.spawnEveryMs,
      maxOnScreen: collectible.maxOnScreen,
      origin: collectible.origin,
      sizeRange: collectible.sizeRange,
      reducedMotion: !!reduceMotion,
      forbiddenRect: () => {
        const zoneEl = zoneRef?.current;
        const canvasEl = collectCanvasRef.current;
        if (!zoneEl || !canvasEl) return null;
        const zoneBox = zoneEl.getBoundingClientRect();
        const canvasBox = canvasEl.getBoundingClientRect();
        const inflate = 16;
        return {
          x: zoneBox.left - canvasBox.left - inflate,
          y: zoneBox.top - canvasBox.top - inflate,
          width: zoneBox.width + inflate * 2,
          height: zoneBox.height + inflate * 2,
        };
      },
      onCollect: () => {
        if (collectedRef.current >= collectible.capPerRun) return;
        collectedRef.current += 1;
        const roll = rollReward(collectible.rewards);
        const label = grantReward(roll);
        onReward?.(label);
        const chargeConfig = collectible.charge;
        if (chargeConfig) {
          chargeRef.current += 1;
          if (chargeRef.current >= chargeConfig.capacity) {
            chargeRef.current = 0;
            const [minC, maxC] = chargeConfig.burstCount;
            const count = Math.round(minC + Math.random() * (maxC - minC));
            collectiblesRef.current?.burst(count);
            play(chargeConfig.sound, 'suBang');
            const bonusRoll = rollReward(chargeConfig.bonusRewards);
            const bonusLabel = grantReward(bonusRoll);
            onReward?.(bonusLabel);
          }
        }
      },
    });
    collectiblesRef.current = handle;
    return () => {
      handle.stop();
      collectiblesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRunCollectibles, collectible?.glyph, reduceMotion]);

  useEffect(() => {
    const burstConfig = collectible?.burst;
    if (!burstConfig || wordCount <= 0) return;
    if (wordCount % burstConfig.every !== 0) return;
    if (lastBurstAtRef.current === wordCount) return;
    lastBurstAtRef.current = wordCount;
    const [minC, maxC] = burstConfig.count;
    const count = Math.round(minC + Math.random() * (maxC - minC));
    collectiblesRef.current?.burst(count);
    play(burstConfig.sound, 'big');
  }, [wordCount, collectible?.burst, play]);

  if (!shouldRunAmbient && !shouldRunCollectibles) return null;

  return (
    <>
      {shouldRunAmbient && (
        <canvas
          ref={ambientCanvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full pointer-events-none select-none"
          style={{ zIndex: 1 }}
        />
      )}
      {shouldRunCollectibles && (
        <canvas
          ref={collectCanvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full pointer-events-none select-none"
          style={{ zIndex: 2 }}
        />
      )}
    </>
  );
}
