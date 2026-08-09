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
import { getUnlockedAchievements } from '../hooks/use-celebration';
import { isRetired } from './prestige';
import { spendTokens } from './economy';
import { isDevMode } from './dev-mode';

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
  /** Optional category for grouping in shop UI (e.g., 'classic', 'food', 'symbolic', 'collab'). */
  category?: string;
  /** Marks the single ultimate skin for shop presentation. */
  ultimate?: boolean;
  /**
   * Level required instead of tokens. A skin with this set can never be
   * bought at any price — it is earned on the level track or not at all.
   */
  unlockLevel?: number;
  /** The pile survives between matches instead of clearing on mount. */
  persistent?: boolean;
  /**
   * Achievement id required instead of tokens/level — earned by meeting
   * an achievements.ts predicate (e.g. category word counts). Same
   * "cannot be bought" semantics as unlockLevel, just gated on a
   * different earned condition.
   */
  unlockAchievement?: string;

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
  /* --- CLASSIC COINS --- */
  {
    id: 'classic',
    name: 'Classic Coin',
    blurb: 'The original spinning coin. Rises from the streak counter and fades.',
    cost: 0,
    category: 'classic',
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
    category: 'classic',
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
    category: 'classic',
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
    category: 'classic',
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
    category: 'classic',
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
    category: 'classic',
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
    category: 'classic',
    ultimate: true,
    glyph: '🪙',
    scale: 1.1,
    motion: 'pile',
    duration: 1.2,
  },
  {
    id: 'vault-eternal',
    name: 'The Eternal Vault',
    blurb:
      'Your hoard never clears. Coins carry over from match to match and keep stacking for as long as you keep counting. Earned at level 84 — it cannot be bought.',
    cost: 0,
    category: 'classic',
    ultimate: true,
    unlockLevel: 84,
    persistent: true,
    glyph: '🪙',
    scale: 1.15,
    outline: '0 0 8px var(--word-color)',
    motion: 'pile',
    duration: 1.2,
  },

  /* --- FOOD: CULTURE-SPECIFIC --- */
  {
    id: 'baguette',
    name: 'Baguette',
    blurb:
      'A tiny golden baguette instead of a coin. Earned by mastering 50 French food words — it cannot be bought.',
    cost: 0,
    category: 'food',
    unlockAchievement: 'fr-food-baguette',
    glyph: '🥖',
    scale: 1.1,
    motion: 'rise',
    duration: 0.7,
  },
  {
    id: 'sushi',
    name: 'Sushi Roll',
    blurb: 'A perfectly formed nigiri. Representing the culinary art of Japan, one rice grain at a time.',
    cost: 150,
    category: 'food',
    glyph: '🍣',
    scale: 1.15,
    motion: 'rise',
    duration: 0.75,
  },
  {
    id: 'jollof',
    name: 'Jollof Rice',
    blurb: 'A heaping bowl of jollof rice. The pride of West Africa, bringing warmth to every winning streak.',
    cost: 150,
    category: 'food',
    glyph: '🍲',
    scale: 1.2,
    motion: 'rise',
    duration: 0.8,
  },
  {
    id: 'pizza',
    name: 'Pizza Slice',
    blurb: 'A slice of authentic Italian pizza. Timeless, universally loved, and worth every word.',
    cost: 100,
    category: 'food',
    glyph: '🍕',
    scale: 1.1,
    motion: 'rise',
    duration: 0.7,
  },
  {
    id: 'taco',
    name: 'Taco',
    blurb: 'A delicious taco. The spirit of Mexico in every correct answer.',
    cost: 100,
    category: 'food',
    glyph: '🌮',
    scale: 1.15,
    motion: 'rise',
    duration: 0.75,
  },
  {
    id: 'dumpling',
    name: 'Dumpling',
    blurb: 'A steamed dumpling. Brought to you by the cultures of East and Southeast Asia.',
    cost: 120,
    category: 'food',
    glyph: '🥟',
    scale: 1.1,
    motion: 'rise',
    duration: 0.7,
  },

  /* --- SYMBOLIC: ABSTRACT & ORNAMENTAL --- */
  {
    id: 'fleur-de-lis',
    name: 'Fleur-de-Lis',
    blurb: 'An ornate golden flower. Symbol of elegance and nobility across cultures.',
    cost: 180,
    category: 'symbolic',
    glyph: '⚜️',
    scale: 1.2,
    outline: '0 0 8px var(--word-color)',
    motion: 'rise',
    duration: 0.8,
  },
  {
    id: 'lotus',
    name: 'Lotus Blossom',
    blurb: 'A sacred lotus in full bloom. Representing enlightenment and purity.',
    cost: 180,
    category: 'symbolic',
    glyph: '💮',
    scale: 1.15,
    motion: 'rise',
    duration: 0.75,
  },
  {
    id: 'disco',
    name: 'Disco Ball',
    blurb: 'A shimmering disco ball. Let the good times roll with every correct word.',
    cost: 200,
    category: 'symbolic',
    glyph: '🪩',
    scale: 1.1,
    outline: '0 0 10px var(--word-color)',
    motion: 'burst',
    particles: 10,
    duration: 0.9,
  },
  {
    id: 'nesting-doll',
    name: 'Matryoshka',
    blurb: 'A Russian nesting doll. Layers of tradition in every answer.',
    cost: 150,
    category: 'symbolic',
    glyph: '🪆',
    scale: 1.2,
    motion: 'rise',
    duration: 0.8,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    blurb: 'A brilliant diamond. Eternal, precious, and earned through dedication.',
    cost: 250,
    category: 'symbolic',
    glyph: '💎',
    scale: 1.15,
    outline: '0 0 6px var(--word-color), 0 0 12px var(--word-color)',
    motion: 'rise',
    duration: 0.75,
  },
  {
    id: 'rosette',
    name: 'Rosette',
    blurb: 'A delicate rose badge. For those who appreciate the finer things.',
    cost: 160,
    category: 'symbolic',
    glyph: '🏵️',
    scale: 1.1,
    motion: 'rise',
    duration: 0.7,
  },
  {
    id: 'star',
    name: 'Star',
    blurb: 'A shining star. Reach for it with every word you master.',
    cost: 100,
    category: 'symbolic',
    glyph: '⭐️',
    scale: 1.25,
    outline: '0 0 4px var(--word-color)',
    motion: 'rise',
    duration: 0.7,
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    blurb: 'A delicate sakura petal. Beauty in impermanence.',
    cost: 140,
    category: 'symbolic',
    glyph: '🌸',
    scale: 1.1,
    motion: 'rise',
    duration: 0.8,
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    blurb: 'A golden sunflower. Following the light toward success.',
    cost: 140,
    category: 'symbolic',
    glyph: '🌼',
    scale: 1.2,
    motion: 'rise',
    duration: 0.8,
  },
  {
    id: 'anatomical-heart',
    name: 'Anatomical Heart',
    blurb: 'A detailed heart. For those who play from the heart.',
    cost: 180,
    category: 'symbolic',
    glyph: '🫀',
    scale: 1.15,
    motion: 'burst',
    particles: 12,
    duration: 0.85,
  },
  {
    id: 'hand-fingers',
    name: 'Peace Fingers',
    blurb: 'A hand making peace. Spread positivity with every correct answer.',
    cost: 120,
    category: 'symbolic',
    glyph: '🫰🏽',
    scale: 1.1,
    motion: 'rise',
    duration: 0.7,
  },
  {
    id: 'love-gesture',
    name: 'Love Gesture',
    blurb: 'A hand making the love shape. Celebrate every triumph with heart.',
    cost: 130,
    category: 'symbolic',
    glyph: '🫶🏾',
    scale: 1.15,
    motion: 'rise',
    duration: 0.75,
  },
  {
    id: 'shaking-face',
    name: 'Shaking Power',
    blurb: 'A trembling face of determination. Raw energy in action.',
    cost: 110,
    category: 'symbolic',
    glyph: '🫨',
    scale: 1.15,
    motion: 'burst',
    particles: 8,
    duration: 0.75,
  },
  {
    id: 'brain',
    name: 'Brain Power',
    blurb: 'The ultimate symbol of learning. Every word makes you brighter.',
    cost: 200,
    category: 'symbolic',
    glyph: '🧠',
    scale: 1.1,
    motion: 'rise',
    duration: 0.75,
  },
  {
    id: 'money-bag-yuan',
    name: 'Yuan Money Bag',
    blurb: 'A bag of yuan. Worth its weight in linguistic treasure.',
    cost: 175,
    category: 'symbolic',
    glyph: '💵',
    scale: 1.2,
    motion: 'rise',
    duration: 0.75,
  },
  {
    id: 'money-bag-euro',
    name: 'Euro Money Bag',
    blurb: 'A bag of euros. European sophistication in token form.',
    cost: 175,
    category: 'symbolic',
    glyph: '💷',
    scale: 1.2,
    motion: 'rise',
    duration: 0.75,
  },
  {
    id: 'money-bag-pound',
    name: 'Pound Money Bag',
    blurb: 'A bag of pounds. British elegance and value.',
    cost: 175,
    category: 'symbolic',
    glyph: '💴',
    scale: 1.2,
    motion: 'rise',
    duration: 0.75,
  },
  {
    id: 'money-bag-yen',
    name: 'Yen Money Bag',
    blurb: 'A bag of yen. Eastern prosperity in every answer.',
    cost: 175,
    category: 'symbolic',
    glyph: '💶',
    scale: 1.2,
    motion: 'rise',
    duration: 0.75,
  },
  {
    id: 'books',
    name: 'Book Stack',
    blurb: 'A tower of knowledge. The foundation of every word you learn.',
    cost: 190,
    category: 'symbolic',
    glyph: '📚',
    scale: 1.15,
    motion: 'rise',
    duration: 0.8,
  },

  /* --- COLLAB: PARTNERSHIP SKINS --- */
  {
    id: 'llamaste',
    name: 'Llamaste',
    blurb:
      'A mystical llama in a state of zen. A collaboration with The Haicuu Experience — for those who honor the alpaca within.',
    cost: 300,
    category: 'collab',
    glyph: '🦙',
    scale: 1.25,
    outline: '0 0 6px var(--word-color)',
    motion: 'rise',
    duration: 0.8,
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
    const free = TOKEN_SKINS.filter((s) => s.cost === 0 && s.unlockLevel == null && s.unlockAchievement == null).map((s) => s.id);
    return [...new Set([...free, ...list])];
  } catch {
    return TOKEN_SKINS.filter((s) => s.cost === 0 && s.unlockLevel == null && s.unlockAchievement == null).map((s) => s.id);
  }
}

/**
 * Level-gated and achievement-gated skins ignore the purchase list
 * entirely — reaching the level/achievement *is* ownership, and both are
 * monotonic (lifetime words only increase; achievements never un-earn).
 * Once retired (Prestige 10 buyout path), every remaining locked skin
 * also becomes purchasable with tokens regardless of its normal gate —
 * layered on top, not replacing, the existing checks.
 */
export function ownsSkin(id: string, level = currentLevel()): boolean {
  if (isDevMode()) return TOKEN_SKINS.some((s) => s.id === id);
  const skin = TOKEN_SKINS.find((s) => s.id === id);
  if (!skin) return false;
  if (skin.unlockLevel != null && level >= skin.unlockLevel) return true;
  if (skin.unlockAchievement != null && getUnlockedAchievements().includes(skin.unlockAchievement)) return true;
  if (getOwnedSkins().includes(id)) return true;
  return false;
}

/**
 * The Prestige-10 "Master Collector" buyout: spend tokens to unlock a
 * skin regardless of its normal level/achievement gate. Only available
 * once retired — grants ownership through the normal owned-list so it
 * persists the same way a purchase would.
 */
export function buyoutSkin(id: string): boolean {
  if (!isRetired()) return false;
  if (ownsSkin(id)) return true;
  const skin = TOKEN_SKINS.find((s) => s.id === id);
  if (!skin) return false;
  const cost = skin.cost > 0 ? skin.cost : 100; // flat buyout price for cost:0 gated skins
  if (!spendTokens(cost)) return false;
  grantSkin(id);
  return true;
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
