import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTokenSkin } from '@/hooks/use-token-skin';
import { usePerfBudget } from '@/hooks/use-perf-budget';
import type { TokenSkin } from '@/lib/token-skins';

/* ------------------------------------------------------------------
   The Vault — the ultimate token skin.

   Coins fall to the floor of the screen and stay there, building into a
   pile as the run goes on.

   The obvious naive version of this destroys the frame rate, so it is
   built around three hard limits:

     1. **The pile is capped and evicts FIFO.** MAX_PILE coins exist at
        most, ever. A 500-word run costs exactly the same as a 60-word
        one. Without this the DOM grows without bound and the tab dies.

     2. **A landed coin stops animating.** Each coin runs one transform
        animation to its resting place and is then a static, composited
        element. The pile is not a simulation — there is no per-frame
        work proportional to its size, which is what makes the cap
        affordable in the first place.

     3. **The cap is adaptive.** `usePerfBudget` watches real frame times;
        on a struggling device the ceiling drops to REDUCED_PILE and the
        excess is evicted immediately.

   Coins rest in columns so they read as a heap rather than a single
   overlapping line, using a small integer height map — no collision
   detection, no physics loop.
------------------------------------------------------------------ */

const MAX_PILE = 60;
const REDUCED_PILE = 20;
const COLUMNS = 14;
/** Vertical pixels each additional coin in a column adds to the heap. */
const STACK_STEP = 13;
/** Stop stacking upward past this, so a column can never wall off the UI. */
const MAX_STACK_HEIGHT = 5;

interface Coin {
  key: number;
  column: number;
  /** How many coins were already in this column when it landed. */
  depth: number;
  rotate: number;
  drift: number;
}

interface Props {
  /** Same counter the corner label uses; a change means "a coin was earned". */
  animKey: number;
  /** Override the equipped skin — used by the shop preview. */
  skinOverride?: TokenSkin;
  /** Preview mode keeps the layer inside its container instead of the viewport. */
  contained?: boolean;
}

export function TokenVaultLayer({ animKey, skinOverride, contained = false }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const { skin: equipped } = useTokenSkin();
  const skin = skinOverride ?? equipped;
  const active = skin.motion === 'pile' && !prefersReducedMotion;

  const budget = usePerfBudget(active);
  const cap = budget === 'reduced' ? REDUCED_PILE : MAX_PILE;

  const [coins, setCoins] = useState<Coin[]>([]);
  const lastKeyRef = useRef(0);

  // Add one coin per earn event.
  useEffect(() => {
    if (!active || animKey === 0 || animKey === lastKeyRef.current) return;
    lastKeyRef.current = animKey;

    setCoins((prev) => {
      const column = Math.floor(Math.random() * COLUMNS);
      const depth = Math.min(
        prev.filter((c) => c.column === column).length,
        MAX_STACK_HEIGHT,
      );
      const next: Coin = {
        key: animKey,
        column,
        depth,
        rotate: Math.round((Math.random() - 0.5) * 60),
        drift: Math.round((Math.random() - 0.5) * 14),
      };
      // FIFO eviction — the oldest coin leaves so the pile never grows
      // past the budget. This is the whole reason the effect is safe.
      const merged = [...prev, next];
      return merged.length > cap ? merged.slice(merged.length - cap) : merged;
    });
  }, [animKey, active, cap]);

  // Trim immediately when the perf guard lowers the ceiling mid-run.
  useEffect(() => {
    setCoins((prev) => (prev.length > cap ? prev.slice(prev.length - cap) : prev));
  }, [cap]);

  // Drop the pile when the skin changes so an unequipped vault does not
  // leave coins stranded on screen.
  useEffect(() => {
    if (!active) setCoins([]);
  }, [active]);

  if (!active || coins.length === 0) return null;

  return (
    <div
      className={`${contained ? 'absolute' : 'fixed'} inset-0 z-0 overflow-hidden`}
      style={{ pointerEvents: 'none' }}
      aria-hidden
    >
      {coins.map((c) => {
        const leftPct = ((c.column + 0.5) / COLUMNS) * 100;
        const restBottom = 8 + c.depth * STACK_STEP;
        return (
          <motion.div
            key={c.key}
            className="absolute select-none text-2xl leading-none will-change-transform"
            style={{
              left: `${leftPct}%`,
              bottom: restBottom,
              textShadow: skin.outline,
            }}
            initial={{ y: -window.innerHeight * 0.75, x: 0, rotate: 0, opacity: 0 }}
            animate={{
              // Overshoot then settle — reads as a bounce without simulating one.
              y: [-window.innerHeight * 0.75, 0, -10, 0],
              x: c.drift,
              rotate: c.rotate,
              opacity: 1,
            }}
            transition={{
              duration: skin.duration,
              times: [0, 0.72, 0.86, 1],
              ease: ['easeIn', 'easeOut', 'easeIn'],
            }}
          >
            {skin.glyph}
          </motion.div>
        );
      })}
    </div>
  );
}
