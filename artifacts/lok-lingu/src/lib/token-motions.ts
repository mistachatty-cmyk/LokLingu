/* ------------------------------------------------------------------
   Token motions — the "how it moves" half of a token, as data.

   The old model was `type TokenMotion = 'rise' | 'burst' | 'fall' | 'pile'`,
   a bare string union with two hardcoded switch statements downstream and
   no parameters. 24 of the 31 skins in the catalog used 'rise', so
   three-quarters of the shop was the same animation with a different
   emoji on it.

   Motions are now a separate, independently-ownable axis with real
   physics parameters. That turns a 31-entry list into a look × motion
   cross-product: every glyph can use every motion, which is both far more
   variety and considerably less code than adding another near-duplicate
   skin each time.

   Ownership of *looks* is untouched — see `token-skins.ts`. Nobody loses
   a purchase; they gain a second dimension on top of it.
------------------------------------------------------------------ */

import { spendTokens } from './economy';
import { isDevMode } from './dev-mode';

export type MotionKind =
  | 'rise'      // the classic float upward
  | 'ballistic' // launched, falls under gravity, bounces off the floor
  | 'zerog'     // no gravity — drifts and tumbles forever
  | 'explode';  // flies out, then bursts into fragments

export interface MotionPhysics {
  /** px/s². 0 for zero-g motions. */
  gravity: number;
  /** Bounciness, 0 (dead stop) to 1 (perfectly elastic). */
  restitution: number;
  /** Per-second velocity retention; <1 bleeds energy. */
  drag: number;
  /** Launch speed in px/s. */
  speed: number;
  /** Launch cone half-angle, in radians. */
  spread: number;
  /** How many floor bounces before the body is retired. */
  bounces: number;
  /** Bodies spawned per token event. */
  count: number;
  /** Trail sample count. 0 disables the slipstream entirely. */
  trail: number;
  /** Fragments produced when an `explode` motion detonates. */
  fragments?: number;
  /** Seconds before the body is retired regardless of state. */
  life: number;
}

export interface TokenMotionDef {
  id: string;
  name: string;
  blurb: string;
  kind: MotionKind;
  cost: number;
  physics: MotionPhysics;
  /** Marks the headline motions for shop presentation. */
  ultimate?: boolean;
  /** Rolls a different motion on every single spawn. */
  random?: boolean;
}

export const TOKEN_MOTIONS: TokenMotionDef[] = [
  {
    id: 'rise',
    name: 'Rise',
    blurb: 'The classic. Floats up and fades.',
    kind: 'rise',
    cost: 0,
    physics: {
      gravity: -90, restitution: 0, drag: 0.92, speed: 60, spread: 0.15,
      bounces: 0, count: 1, trail: 0, life: 1.1,
    },
  },
  {
    id: 'tumble',
    name: 'Tumble',
    blurb: 'Arcs up, drops, and rolls to a stop.',
    kind: 'ballistic',
    cost: 120,
    physics: {
      gravity: 900, restitution: 0.32, drag: 0.99, speed: 260, spread: 0.5,
      bounces: 2, count: 1, trail: 0, life: 2.4,
    },
  },
  {
    id: 'bouncy',
    name: 'Bouncy',
    blurb: 'Hits the floor and keeps its energy.',
    kind: 'ballistic',
    cost: 180,
    physics: {
      gravity: 1100, restitution: 0.68, drag: 0.995, speed: 300, spread: 0.6,
      bounces: 5, count: 2, trail: 0, life: 3,
    },
  },
  {
    id: 'superball',
    name: 'Superball',
    blurb: 'Barely loses a thing. Ricochets everywhere.',
    kind: 'ballistic',
    cost: 260,
    physics: {
      gravity: 1400, restitution: 0.88, drag: 0.998, speed: 420, spread: 1.1,
      bounces: 9, count: 3, trail: 0, life: 4,
    },
  },
  {
    id: 'slipstream',
    name: 'Slipstream',
    blurb: 'Drags a glowing wake behind it.',
    kind: 'ballistic',
    cost: 320,
    physics: {
      gravity: 950, restitution: 0.55, drag: 0.996, speed: 340, spread: 0.8,
      bounces: 4, count: 2, trail: 14, life: 3.2,
    },
  },
  {
    id: 'driftless',
    name: 'Driftless',
    blurb: 'No gravity. Coasts away and tumbles.',
    kind: 'zerog',
    cost: 240,
    physics: {
      gravity: 0, restitution: 1, drag: 0.997, speed: 130, spread: Math.PI,
      bounces: 0, count: 3, trail: 0, life: 2.8,
    },
  },
  {
    id: 'nebula',
    name: 'Nebula',
    blurb: 'Weightless, trailing, everywhere at once.',
    kind: 'zerog',
    cost: 420,
    physics: {
      gravity: 0, restitution: 1, drag: 0.998, speed: 110, spread: Math.PI,
      bounces: 0, count: 5, trail: 18, life: 3.4,
    },
  },
  {
    id: 'flak',
    name: 'Flak',
    blurb: 'Climbs, then bursts into fragments.',
    kind: 'explode',
    cost: 380,
    physics: {
      gravity: 700, restitution: 0.4, drag: 0.995, speed: 300, spread: 0.35,
      bounces: 1, count: 1, trail: 6, fragments: 10, life: 2.6,
    },
  },
  {
    id: 'supernova',
    name: 'Supernova',
    blurb: 'Detonates into a trailing shower.',
    kind: 'explode',
    cost: 600,
    physics: {
      gravity: 620, restitution: 0.5, drag: 0.996, speed: 260, spread: 0.5,
      bounces: 2, count: 2, trail: 12, fragments: 16, life: 3.6,
    },
    ultimate: true,
  },
  {
    id: 'wildcard',
    name: 'Wildcard',
    blurb: 'A different motion every single time.',
    kind: 'ballistic',
    cost: 900,
    physics: {
      gravity: 1000, restitution: 0.6, drag: 0.996, speed: 320, spread: 0.7,
      bounces: 4, count: 2, trail: 8, life: 3,
    },
    ultimate: true,
    random: true,
  },
];

export const MOTION_BY_ID = new Map(TOKEN_MOTIONS.map((m) => [m.id, m]));

const K = {
  owned: 'lok-lingu-owned-motions',
  selected: 'lok-lingu-token-motion',
} as const;

export const MOTION_EVENT = 'lok-token-motion';

function announce(): void {
  try {
    window.dispatchEvent(new CustomEvent(MOTION_EVENT));
  } catch {
    /* non-browser context */
  }
}

export function getOwnedMotions(): string[] {
  const free = TOKEN_MOTIONS.filter((m) => m.cost === 0).map((m) => m.id);
  try {
    const raw = localStorage.getItem(K.owned);
    const stored: string[] = raw ? JSON.parse(raw) : [];
    return Array.from(new Set([...free, ...stored]));
  } catch {
    return free;
  }
}

export function ownsMotion(id: string): boolean {
  return isDevMode() || getOwnedMotions().includes(id);
}

export function getSelectedMotion(): TokenMotionDef {
  try {
    const id = localStorage.getItem(K.selected);
    if (id) {
      const m = MOTION_BY_ID.get(id);
      // Never hand back a motion the player no longer owns.
      if (m && ownsMotion(id)) return m;
    }
  } catch {
    /* fall through to the default */
  }
  return TOKEN_MOTIONS[0];
}

export function setSelectedMotion(id: string): void {
  try {
    localStorage.setItem(K.selected, id);
  } catch {
    /* private mode */
  }
  announce();
}

export function purchaseMotion(id: string): boolean {
  const motion = MOTION_BY_ID.get(id);
  if (!motion) return false;
  if (ownsMotion(id)) {
    setSelectedMotion(id);
    return true;
  }
  if (!spendTokens(motion.cost)) return false;
  try {
    const owned = getOwnedMotions();
    localStorage.setItem(K.owned, JSON.stringify([...owned, id]));
  } catch {
    /* private mode — the spend still happened, so equip anyway */
  }
  setSelectedMotion(id);
  return true;
}

/**
 * Resolves the motion to actually simulate for one spawn. Wildcard picks
 * a fresh motion each call, which is the whole point of it — everything
 * else resolves to itself.
 */
export function resolveMotion(def: TokenMotionDef): TokenMotionDef {
  if (!def.random) return def;
  const pool = TOKEN_MOTIONS.filter((m) => !m.random);
  return pool[Math.floor(Math.random() * pool.length)];
}
