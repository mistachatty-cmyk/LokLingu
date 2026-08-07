/* ------------------------------------------------------------------
   Token skins — how earned LOK tokens look and behave when they pop.

   Today appearance and effect ship as one bundled choice, which is what
   the shop sells. They are deliberately modelled as *two fields* on the
   same SKU rather than one blob, so splitting them into independent
   "look" and "motion" pickers later is a mechanical change: widen the
   store from one id to two, and the catalog already holds the parts.

   Performance is a hard requirement, not a nice-to-have. Rules every
   skin obeys:

     1. Animate transform and opacity only. Nothing here touches layout,
        filter-on-large-areas, or box-shadow on a moving element.
     2. Particle counts are compile-time constants, never derived from
        the score. A player on a 400 streak sees the same budget as one
        on their first word.
     3. Anything that accumulates is capped and evicts FIFO.
     4. `prefers-reduced-motion` collapses every skin to a static label.
     5. A live frame-time guard (`use-perf-budget`) downgrades the
        expensive skins automatically on a struggling device.
------------------------------------------------------------------ */

import { currentLevel } from './levels';

export type TokenMotion =
  | 'rise'      // classic float upward
  | 'burst'     // radial particle spray, then rise
  | 'fall'      // arcs up, then gravity takes it down off-screen
  | 'pile';     // falls and accumulates at the bottom of the screen

export interface TokenSkin {
  id: string;
  name: string;
  blurb: string;
  /** Token cost. 0 = owned by default. */
  cost: number;
  /** Marks the single ultimate skin for shop presentation. */
  ultimate?: boolean;
  /**
   * Level required instead of tokens. A skin with this set can never be
   * bought at any price — it is earned on the level track or not at all.
   */
  unlockLevel?: number;
  /** The pile survives between matches instead of clearing on mount. */
  persistent?: boolean;

  /* --- appearance half (future "look" picker) --- */
  glyph: string;
  /** Multiplier on the base coin size. */
  scale: number;
  /** Soft halo behind the coin. Rendered as a static radial gradient. */
  halo?: string;
  /** Outline ring drawn with text-shadow — cheap, no filter. */
  outline?: string;

  /* --- effect half (future "motion" picker) --- */
  motion: TokenMotion;
  /** Particles for `burst`. Capped in the catalog, never computed. */
  particles?: number;
  /** Seconds the primary animation runs. */
  duration: number;
}

export const TOKEN_SKINS: TokenSkin[] = [
  {
    id: 'classic',
    name: 'Classic Coin',
    blurb: 'The original spinning coin. Rises from the streak counter and fades.',
    cost: 0,
    glyph: '🪙',
    scale: 1,
    motion: 'rise',
    duration: 0.65,
  },
  {
    id: 'aurora',
    name: 'Aurora Glow',
    blurb: 'A soft coloured halo blooms behind the coin as it climbs.',
    cost: 40,
    glyph: '🪙',
    scale: 1.1,
    halo: 'radial-gradient(circle, var(--word-color) 0%, transparent 70%)',
    motion: 'rise',
    duration: 0.8,
  },
  {
    id: 'neon',
    name: 'Neon Outline',
    blurb: 'Hard glowing ring around the coin and the amount. Arcade-bright.',
    cost: 60,
    glyph: '🪙',
    scale: 1.05,
    outline: '0 0 6px var(--word-color), 0 0 14px var(--word-color)',
    motion: 'rise',
    duration: 0.75,
  },
  {
    id: 'jumbo',
    name: 'Jumbo',
    blurb: 'Twice the size, twice as slow. Impossible to miss.',
    cost: 70,
    glyph: '🪙',
    scale: 2,
    motion: 'rise',
    duration: 1,
  },
  {
    id: 'supernova',
    name: 'Supernova',
    blurb: 'The coin detonates into a ring of sparks before the amount rises.',
    cost: 90,
    glyph: '🪙',
    scale: 1.15,
    outline: '0 0 8px var(--word-color)',
    motion: 'burst',
    particles: 8,
    duration: 0.85,
  },
  {
    id: 'freefall',
    name: 'Freefall',
    blurb: 'Real gravity. The coin is thrown upward, stalls, then drops away.',
    cost: 120,
    glyph: '🪙',
    scale: 1.2,
    motion: 'fall',
    duration: 1.1,
  },
  {
    id: 'vault',
    name: 'The Vault',
    blurb:
      'Every coin you earn falls to the floor of the screen and stays there, piling up as you play. Clears when the run ends.',
    cost: 400,
    ultimate: true,
    glyph: '🪙',
    scale: 1.1,
    motion: 'pile',
    duration: 1.2,
  },
  {
    // The base Vault above stays exactly as it is — this is a separate
    // thing, earned rather than bought, and the two coexist.
    id: 'vault-eternal',
    name: 'The Eternal Vault',
    blurb:
      'Your hoard never clears. Coins carry over from match to match and keep stacking for as long as you keep counting. Earned at level 84 — it cannot be bought.',
    cost: 0,
    ultimate: true,
    unlockLevel: 84,
    persistent: true,
    glyph: '🪙',
    scale: 1.15,
    outline: '0 0 8px var(--word-color)',
    motion: 'pile',
    duration: 1.2,
  },
];

export const DEFAULT_TOKEN_SKIN = 'classic';

export function getTokenSkin(id: string): TokenSkin {
  return TOKEN_SKINS.find((s) => s.id === id) ?? TOKEN_SKINS[0];
}

/* ------------------------- ownership ------------------------- */

const OWNED_KEY = 'lok-lingu-owned-token-skins';
export const SELECTED_KEY = 'lok-lingu-token-skin';
export const TOKEN_SKIN_EVENT = 'lok-token-skin';

export function getOwnedSkins(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(OWNED_KEY) || '[]');
    const list = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
    // Free skins are always owned, even if storage was cleared.
    const free = TOKEN_SKINS.filter((s) => s.cost === 0 && s.unlockLevel == null).map((s) => s.id);
    return [...new Set([...free, ...list])];
  } catch {
    return TOKEN_SKINS.filter((s) => s.cost === 0 && s.unlockLevel == null).map((s) => s.id);
  }
}

/**
 * Level-gated skins ignore the purchase list entirely — reaching the
 * level *is* ownership, and dropping below it is impossible because
 * lifetime words only ever increase.
 */
export function ownsSkin(id: string, level = currentLevel()): boolean {
  const skin = TOKEN_SKINS.find((s) => s.id === id);
  if (skin?.unlockLevel != null) return level >= skin.unlockLevel;
  return getOwnedSkins().includes(id);
}

export function grantSkin(id: string): void {
  try {
    localStorage.setItem(OWNED_KEY, JSON.stringify([...new Set([...getOwnedSkins(), id])]));
    window.dispatchEvent(new CustomEvent(TOKEN_SKIN_EVENT));
  } catch {
    /* private mode */
  }
}

export function getSelectedSkin(): string {
  try {
    const id = localStorage.getItem(SELECTED_KEY) || DEFAULT_TOKEN_SKIN;
    // Never leave the player equipped with something they do not own.
    return ownsSkin(id) ? id : DEFAULT_TOKEN_SKIN;
  } catch {
    return DEFAULT_TOKEN_SKIN;
  }
}

export function setSelectedSkin(id: string): void {
  try {
    localStorage.setItem(SELECTED_KEY, id);
    window.dispatchEvent(new CustomEvent(TOKEN_SKIN_EVENT));
  } catch {
    /* private mode */
  }
}
