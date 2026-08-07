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
/**
 * The Eternal Vault carries its hoard between matches. "Infinite" is the
 * *count* — `hoardTotal` below has no ceiling and is what the player
 * watches climb. The number of coins actually in the DOM stays capped at
 * exactly the same budget as the base Vault, because that cap is what
 * makes the effect free. A hoard of 40,000 renders 60 coins.
 */
const PERSIST_KEY = 'lok-lingu-vault-pile';
const PERSIST_TOTAL_KEY = 'lok-lingu-vault-total';
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

function loadPile(): Coin[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PERSIST_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (c): c is Coin =>
          c && typeof c.key === 'number' && typeof c.column === 'number' &&
          typeof c.depth === 'number' && typeof c.rotate === 'number' &&
          typeof c.drift === 'number',
      )
      // Storage is untrusted — a hand-edited or stale key must not be able
      // to blow the render budget.
      .slice(-MAX_PILE);
  } catch {
    return [];
  }
}

function loadTotal(): number {
  try {
    return Math.max(0, parseInt(localStorage.getItem(PERSIST_TOTAL_KEY) || '0', 10) || 0);
  } catch {
    return 0;
  }
}

function savePile(coins: Coin[], total: number): void {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(coins));
    localStorage.setItem(PERSIST_TOTAL_KEY, String(total));
  } catch {
    /* private mode — the hoard simply does not survive a reload */
  }
}

/** Wipes a persistent hoard. Exposed for a future "melt down" action. */
export function clearVaultHoard(): void {
  try {
    localStorage.removeItem(PERSIST_KEY);
    localStorage.removeItem(PERSIST_TOTAL_KEY);
  } catch {
    /* ignore */
  }
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

  // The persistent variant restores its pile on mount; the base Vault
  // always starts empty, which is the difference the player bought
  // versus the one they earned.
  const persistent = Boolean(skin.persistent) && !contained;

  const [coins, setCoins] = useState<Coin[]>(() =>
    persistent ? loadPile() : [],
  );
  const [hoardTotal, setHoardTotal] = useState<number>(() =>
    persistent ? loadTotal() : 0,
  );
  const lastKeyRef = useRef(0);
  // Coins restored from storage must not replay their fall — they were
  // earned in an earlier match and are already at rest.
  const restoredRef = useRef(new Set(coins.map((c) => c.key)));
  // animKey restarts at 1 every match, so it cannot be the coin key for a
  // pile that outlives the match. Keys continue from the restored high
  // water mark instead.
  const nextKeyRef = useRef(
    coins.reduce((max, c) => Math.max(max, c.key), 0) + 1,
  );

  // Add one coin per earn event.
  useEffect(() => {
    if (!active || animKey === 0 || animKey === lastKeyRef.current) return;
    lastKeyRef.current = animKey;

    if (persistent) setHoardTotal((t) => t + 1);

    setCoins((prev) => {
      const column = Math.floor(Math.random() * COLUMNS);
      const depth = Math.min(
        prev.filter((c) => c.column === column).length,
        MAX_STACK_HEIGHT,
      );
      const next: Coin = {
        key: nextKeyRef.current++,
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
  // leave coins stranded on screen. A persistent hoard is only cleared
  // from the display — the stored copy survives so re-equipping restores it.
  useEffect(() => {
    if (!active) setCoins([]);
  }, [active]);

  // Persist on change. Writing the whole (already capped) array is cheap
  // and keeps storage and display trivially consistent.
  useEffect(() => {
    if (!persistent || !active) return;
    savePile(coins, hoardTotal);
  }, [persistent, active, coins, hoardTotal]);

  if (!active || coins.length === 0) return null;

  return (
    <div
      className={`${contained ? 'absolute' : 'fixed'} inset-0 z-0 overflow-hidden`}
      style={{ pointerEvents: 'none' }}
      aria-hidden
    >
      {/* Hoard counter — the "infinite" half of the effect. The pile in the
          DOM is capped; this number is not. */}
      {persistent && hoardTotal > 0 && (
        <span
          className="absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[10px] font-black uppercase tracking-[0.2em] opacity-60"
          style={{ color: 'var(--word-color)' }}
        >
          hoard {hoardTotal.toLocaleString()}
        </span>
      )}

      {coins.map((c) => {
        const leftPct = ((c.column + 0.5) / COLUMNS) * 100;
        const restBottom = 8 + c.depth * STACK_STEP;
        // A coin restored from a previous match is already at rest — it
        // must not replay its fall, or every reload would rain the whole
        // hoard down the screen at once.
        const settled = restoredRef.current.has(c.key);
        return (
          <motion.div
            key={c.key}
            className="absolute select-none text-2xl leading-none will-change-transform"
            style={{
              left: `${leftPct}%`,
              bottom: restBottom,
              textShadow: skin.outline,
            }}
            initial={
              settled
                ? { y: 0, x: c.drift, rotate: c.rotate, opacity: 1 }
                : { y: -window.innerHeight * 0.75, x: 0, rotate: 0, opacity: 0 }
            }
            animate={
              settled
                ? { y: 0, x: c.drift, rotate: c.rotate, opacity: 1 }
                : {
                    // Overshoot then settle — reads as a bounce without simulating one.
                    y: [-window.innerHeight * 0.75, 0, -10, 0],
                    x: c.drift,
                    rotate: c.rotate,
                    opacity: 1,
                  }
            }
            transition={
              settled
                ? { duration: 0 }
                : {
                    duration: skin.duration,
                    times: [0, 0.72, 0.86, 1],
                    ease: ['easeIn', 'easeOut', 'easeIn'],
                  }
            }
          >
            {skin.glyph}
          </motion.div>
        );
      })}
    </div>
  );
}
