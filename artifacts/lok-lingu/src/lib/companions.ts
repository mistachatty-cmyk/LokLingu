/* ------------------------------------------------------------------
   CompanionKit — one table drives every companion's in-game presence.

   See docs/COMPANIONS.md for the full design record (why each field
   exists, the occlusion/reduced-motion/anti-farm constraints, and the
   build order this file is Phase 1 of). This file ships the "kit and
   ambient" phase: a CompanionKit entry per companion, each with an
   `ambient` Season fed straight into the existing particle engine
   (src/lib/particles/field.ts). Collectibles, per-companion specials
   (NiNi's pacing/palette, Amber's bottle, Baguette's guest words) and
   rare drops are later phases — not built here.
------------------------------------------------------------------ */

import type { Season } from './seasons';
import type { SoundProfile } from './celebrations';
import type { RewardRoll } from './companion-rewards';
import type { SpawnOrigin } from './particles/collectibles';

export interface CollectibleKit {
  glyph: string;
  spawnEveryMs: [number, number];
  maxOnScreen: number;
  origin: SpawnOrigin;
  sizeRange: [number, number];
  rewards: RewardRoll[];
  /** Anti-farm: no more than this many collects count for a reward per run. */
  capPerRun: number;
  /** Optional milestone celebration — a physics burst of the same glyph,
   *  distinct from the slow tap-to-collect items above. Visual/sound only,
   *  no separate reward grant (see companion-layer.tsx). */
  burst?: {
    /** Fires every N words answered correctly this run (celebration.matchCount). */
    every: number;
    /** [min, max] pieces per burst. */
    count: [number, number];
    sound: SoundProfile;
  };
  /** Amber's bottle: every `capacity`-th collect (on top of its own normal
   *  reward) also fires a bigger burst + a bonus reward roll, then resets.
   *  Doc's escalating 25/50/100 thresholds are simplified to one repeating
   *  threshold here — the multi-tier version needs a persistent fill-level
   *  HUD element that isn't built yet. */
  charge?: {
    capacity: number;
    burstCount: [number, number];
    sound: SoundProfile;
    bonusRewards: RewardRoll[];
  };
}

export interface CompanionKit {
  /** Matches the roadmap/achievement companion id (title, lowercased and
   *  hyphenated) — see companionGlyph() in companion-widget.tsx for the
   *  same derivation. */
  id: string;
  name: string;
  /** Fed straight into createField() while this companion is equipped. */
  ambient?: Season;
  /** Tappable layer, rendered via particles/collectibles.ts. Phase 2 —
   *  most companions don't have one yet; see docs/COMPANIONS.md. */
  collectible?: CollectibleKit;
  /** Overrides SPEED_TIMING (game.tsx) while equipped — more time to think
   *  and speak. Voice mode only; draw mode has no restart-delay concept. */
  pacing?: { hitMs: number; restartMs: number };
  /** CSS class rendered as a full-screen, pointer-events-none tint by
   *  companion-layer.tsx — purely additive, never touches the player's
   *  saved theme (localStorage['lok-lingu-theme']). Defined in index.css. */
  palette?: string;
  copy: {
    quips: string[];
  };
}

export const COMPANION_KITS: CompanionKit[] = [
  {
    id: 'nini',
    name: 'NiNi the Sloth',
    ambient: {
      id: 'companion-nini',
      name: 'NiNi — drifting leaves',
      blurb: 'Slow leaves drift by while NiNi takes her time.',
      glyphs: ['🍃', '🍃', '🌿'],
      motion: { gravity: 10, terminalVelocity: 18, spinSpeed: 12, wander: 0, flicker: 0, swayAmplitude: 26, swayFrequency: 0.12 },
      baseCount: 6, // "very low count" per the doc — this is ambience, not weather
      sizeRange: [12, 20],
      opacity: 0.4,
      cost: 0,
    },
    // A tier beyond 'relaxed' (700/500) — more time to think and speak.
    // This is the accessibility companion; framed as a sloth's pace, not
    // an "easy mode" toggle, per the doc's explicit note not to nerf it.
    pacing: { hitMs: 1100, restartMs: 900 },
    palette: 'companion-nini-tint',
    // Bamboo grows from the bottom edge; weights mirror the doc's table
    // (40% tokens / 25% bonus points / 15% guest word / 10% skip / 8%
    // heart / 2% rare drop) with the three unbuilt slots folded into
    // 'tokens' — see companion-rewards.ts's file header.
    collectible: {
      glyph: '🎋',
      spawnEveryMs: [2200, 4200],
      maxOnScreen: 4,
      origin: 'bottom',
      sizeRange: [26, 40],
      capPerRun: 8,
      rewards: [
        { kind: 'tokens', weight: 82, amount: [3, 12] },
        { kind: 'skip', weight: 10 },
        { kind: 'heart', weight: 8 },
      ],
      // Every 10 words: a bamboo explosion — bounces around and clatters,
      // no tap needed. Celebration, not a second payout channel (the slow
      // tap-to-collect bamboo above already pays out on its own schedule).
      burst: { every: 10, count: [8, 14], sound: 'rattle' },
    },
    copy: { quips: ["No rush. You've got this.", 'Slow and steady.', 'Take your time.'] },
  },
  {
    id: 'wren',
    name: 'Wren',
    ambient: {
      id: 'companion-wren',
      name: 'Wren — drifting feathers',
      blurb: 'Feathers drift down after Wren.',
      glyphs: ['🪶'],
      motion: { gravity: 8, terminalVelocity: 20, spinSpeed: 40, wander: 0.3, flicker: 0, swayAmplitude: 18, swayFrequency: 0.18 },
      baseCount: 5,
      sizeRange: [10, 16],
      opacity: 0.35,
      cost: 0,
    },
    copy: { quips: ["Chirp! You're doing great.", 'Small steps count.'] },
  },
  {
    id: 'sparrow',
    name: 'Sparrow',
    ambient: {
      id: 'companion-sparrow',
      name: 'Sparrow — quick darting motes',
      blurb: 'Quick motes dart past, keeping pace with Sparrow.',
      glyphs: ['✨'],
      motion: { gravity: 2, terminalVelocity: 40, spinSpeed: 0, wander: 1.4, flicker: 0.3, swayAmplitude: 0, swayFrequency: 0 },
      baseCount: 6,
      sizeRange: [6, 10],
      opacity: 0.45,
      cost: 0,
    },
    copy: { quips: ['Quick as ever!', "Let's keep going."] },
  },
  {
    id: 'otter',
    name: 'Otter',
    ambient: {
      id: 'companion-otter',
      name: 'Otter — rising bubbles',
      blurb: 'Bubbles rise lazily around Otter.',
      glyphs: ['🫧'],
      motion: { gravity: -9, terminalVelocity: 16, spinSpeed: 0, wander: 0.2, flicker: 0, swayAmplitude: 14, swayFrequency: 0.2 },
      baseCount: 7,
      sizeRange: [8, 16],
      opacity: 0.4,
      cost: 0,
    },
    copy: { quips: ['Splash! Having fun yet?', "You've got this."] },
  },
  {
    id: 'fox',
    name: 'Fox',
    ambient: {
      id: 'companion-fox',
      name: 'Fox — autumn leaves',
      blurb: 'Autumn leaves tumble by, Fox-quick.',
      glyphs: ['🍁', '🍂'],
      motion: { gravity: 16, terminalVelocity: 44, spinSpeed: 60, wander: 0, flicker: 0, swayAmplitude: 30, swayFrequency: 0.2 },
      baseCount: 7,
      sizeRange: [12, 20],
      opacity: 0.45,
      cost: 0,
    },
    copy: { quips: ['Yip! Nearly there.', 'Sneaky good streak.'] },
  },
  {
    id: 'crane',
    name: 'Crane',
    ambient: {
      id: 'companion-crane',
      name: 'Crane — origami paper',
      blurb: 'Folded paper drifts around Crane.',
      glyphs: ['📄', '🕊️'],
      motion: { gravity: 6, terminalVelocity: 20, spinSpeed: 30, wander: 0, flicker: 0, swayAmplitude: 24, swayFrequency: 0.15 },
      baseCount: 5,
      sizeRange: [10, 16],
      opacity: 0.35,
      cost: 0,
    },
    copy: { quips: ['Graceful as always.', 'Steady wins it.'] },
  },
  {
    id: 'wolf',
    name: 'Wolf',
    ambient: {
      id: 'companion-wolf',
      name: 'Wolf — drifting snow',
      blurb: 'Snow drifts past while Wolf keeps watch.',
      glyphs: ['❄️'],
      motion: { gravity: 14, terminalVelocity: 30, spinSpeed: 20, wander: 0.1, flicker: 0, swayAmplitude: 20, swayFrequency: 0.16 },
      baseCount: 8,
      sizeRange: [8, 14],
      opacity: 0.4,
      cost: 0,
    },
    copy: { quips: ['Awoo! Pack is proud.', "Don't stop now."] },
  },
  {
    id: 'tiger',
    name: 'Tiger',
    ambient: {
      id: 'companion-tiger',
      name: 'Tiger — tall grass',
      blurb: 'Tall grass sways at the edges around Tiger.',
      glyphs: ['🌾'],
      motion: { gravity: 0, terminalVelocity: 0, spinSpeed: 0, wander: 0, flicker: 0, swayAmplitude: 34, swayFrequency: 0.1 },
      baseCount: 6,
      sizeRange: [16, 26],
      opacity: 0.3,
      cost: 0,
    },
    copy: { quips: ['Roar! Ferocious focus.', 'Keep the momentum.'] },
  },
  {
    id: 'whale',
    name: 'Whale',
    ambient: {
      id: 'companion-whale',
      name: 'Whale — slow bubbles',
      blurb: 'Slow, deep bubbles rise around Whale.',
      glyphs: ['🫧'],
      motion: { gravity: -4, terminalVelocity: 10, spinSpeed: 0, wander: 0.1, flicker: 0, swayAmplitude: 10, swayFrequency: 0.08 },
      baseCount: 5,
      sizeRange: [10, 22],
      opacity: 0.3,
      cost: 0,
    },
    copy: { quips: ['A deep breath, then on.', 'Making waves out there.'] },
  },
  {
    id: 'dragon',
    name: 'Amber the Dragon',
    ambient: {
      id: 'companion-dragon',
      name: 'Amber — rising embers',
      blurb: 'Embers rise and flicker around Amber.',
      // Straight from docs/COMPANIONS.md's Amber spec: gravity -6, terminalVelocity 20, flicker 0.6.
      glyphs: ['🔥', '✨'],
      motion: { gravity: -6, terminalVelocity: 20, spinSpeed: 0, wander: 0.15, flicker: 0.6, swayAmplitude: 12, swayFrequency: 0.2 },
      baseCount: 9,
      sizeRange: [10, 18],
      opacity: 0.5,
      cost: 0,
    },
    // Tappable embers pay a small amount on their own; every 25th one also
    // fires the "bottle" — a bigger burst + bonus payout, per the doc's
    // "hoard the embers, cash in the hoard" fantasy.
    collectible: {
      glyph: '🔥',
      spawnEveryMs: [1800, 3400],
      maxOnScreen: 5,
      origin: 'top',
      sizeRange: [20, 32],
      capPerRun: 40,
      rewards: [
        { kind: 'tokens', weight: 90, amount: [1, 4] },
        { kind: 'skip', weight: 10 },
      ],
      charge: {
        capacity: 25,
        burstCount: [16, 24],
        sound: 'gong',
        bonusRewards: [{ kind: 'tokens', weight: 100, amount: [40, 80] }],
      },
    },
    copy: { quips: ['Legendary pace.', 'Fire it up!'] },
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    ambient: {
      id: 'companion-phoenix',
      name: 'Phoenix — falling ash',
      blurb: 'Ash drifts down after Phoenix.',
      glyphs: ['🪶', '✨'],
      motion: { gravity: 10, terminalVelocity: 24, spinSpeed: 16, wander: 0.1, flicker: 0.2, swayAmplitude: 16, swayFrequency: 0.15 },
      baseCount: 8,
      sizeRange: [8, 16],
      opacity: 0.4,
      cost: 0,
    },
    copy: { quips: ['Reborn every run.', 'Rise and keep going.'] },
  },
  {
    id: 'leviathan',
    name: 'Leviathan',
    ambient: {
      id: 'companion-leviathan',
      name: 'Leviathan — deep silhouettes',
      blurb: 'Dark shapes drift at the edges around Leviathan.',
      glyphs: ['🌊'],
      motion: { gravity: 0, terminalVelocity: 0, spinSpeed: 0, wander: 0.25, flicker: 0, swayAmplitude: 20, swayFrequency: 0.06 },
      baseCount: 5,
      sizeRange: [18, 30],
      opacity: 0.25,
      cost: 0,
    },
    copy: { quips: ['From the depths, respect.', 'Unstoppable.'] },
  },
  {
    id: 'sir-baguette',
    name: 'Sir Baguette',
    ambient: {
      id: 'companion-sir-baguette',
      name: 'Sir Baguette — falling bread',
      blurb: 'Baguettes fall gently, Sir Baguette-style.',
      glyphs: ['🥖'],
      motion: { gravity: 16, terminalVelocity: 40, spinSpeed: 50, wander: 0, flicker: 0, swayAmplitude: 22, swayFrequency: 0.18 },
      baseCount: 6,
      sizeRange: [14, 22],
      opacity: 0.4,
      cost: 0,
    },
    copy: { quips: ['Magnifique, mon ami!', 'A little crusty, a lot proud.'] },
  },
];

const DEFAULT_QUIPS = ['Keep going!', "You've got this."];

const KIT_BY_ID = new Map(COMPANION_KITS.map((k) => [k.id, k]));

export function getCompanionKit(id: string): CompanionKit | null {
  return KIT_BY_ID.get(id) ?? null;
}

export function companionQuips(id: string): string[] {
  return KIT_BY_ID.get(id)?.copy.quips ?? DEFAULT_QUIPS;
}
