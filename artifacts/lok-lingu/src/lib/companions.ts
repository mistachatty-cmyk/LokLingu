/* ------------------------------------------------------------------
   CompanionKit — one table drives every companion's in-game presence.

   See docs/COMPANIONS.md for the full design record (why each field
   exists, the occlusion/reduced-motion/anti-farm constraints, and the
   build order). Every companion has ambient (Phase 1). NiNi, Amber,
   Baguette, Otter, Fox and Whale also have a collectible/special (Phase
   2-4) — see each entry's own comment for how it maps to (or simplifies)
   its doc spec.

   Every perk is a field on this table. That is the point of the table:
   Wren's hint, Phoenix's revive and Baguette's guest word used to be
   `getEquippedCompanion() === 'wren'` checks duplicated across game.tsx
   and draw.tsx, which meant giving any *other* companion a hint was a
   code change rather than a data entry. They are `hint`, `revive` and
   `guestWord` now, so any companion can be handed any of them.

   The Mi family (Mini-Mi, Big-Mi, Rando-Mi) adds `lengthBias` — the only
   perk here that acts on *which words get served* rather than on their
   presentation or their payout. Its guard rail lives in review.ts.

   Still ambient-only, deliberately: Leviathan (stacks two other
   companions' ambients — needs multi-Season field composition, which
   field.ts doesn't support). Not building a shallow reskin of something
   else just to say it's "done".
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
  /** Wolf: escalating token bonus while a streak holds. Ascending by `at`
   *  (words correct in a row, this run); the highest tier whose `at` the
   *  current streak has reached applies. Layered as EXTRA tokens on top
   *  of the normal per-hit award in game.tsx/draw.tsx, not a change to
   *  the award itself — keeps boost/rate math in use-celebration.ts
   *  untouched. */
  streakMultiplier?: { at: number; mult: number }[];
  /** Crane: fold a crane over `foldsNeeded` correct answers in a row; a
   *  completed fold grants a shield that absorbs the next miss entirely
   *  (no heart lost, fold progress untouched) rather than breaking the
   *  streak like a normal miss would. */
  shield?: { foldsNeeded: number };
  /** Sparrow: "short bursts of doubled token rate" — a per-hit chance to
   *  add `extraMult`x the normal rate as bonus tokens, layered on top the
   *  same way Wolf's pack bonus is. Stateless (no window/duration to
   *  track) — each burst is exactly the one hit it lands on. */
  burstChance?: { chance: number; extraMult: number };
  /** Tiger: ambush — rolled once per served word (like Wren's hint); a
   *  flagged word pays `bonusMult`x extra if answered correctly. Missing
   *  a flagged word has no extra consequence beyond the normal miss —
   *  this app avoids punitive drawbacks elsewhere (see Baguette's guest
   *  word), so "or nothing" means no bonus, not a penalty. */
  ambush?: { chance: number; bonusMult: number };
  /** Tiger's ultimate only: a missed *flagged* word costs an extra heart on
   *  top of the normal miss. Never set on a base kit — the ambush banner is
   *  the telegraph, and only unlocking the ultimate is the opt-in. */
  ambushPenalty?: boolean;
  /** Bot-Loko's ultimate only: repaired, the drone now retrieves *for* the
   *  player instead of taking a skip on escape — see event-director.tsx's
   *  `bot-loko` case. */
  droneAlly?: boolean;
  /** Wren: a first-letter nudge on a `chance` of served words. Purely
   *  additive UI — no economy or heart interaction, so it runs in both
   *  modes. A quiet nudge, not a crutch. */
  hint?: { chance: number };
  /** Phoenix: survive reaching 0 hearts, `perMatch` times per run,
   *  instead of ending it. The strongest perk in the set. */
  revive?: { perMatch: number };
  /** Sir Baguette: occasionally show the served word's counterpart in
   *  another language beside it. Saying it too pays `bonusTokens`;
   *  ignoring it costs nothing — strictly upside, and deliberately so.
   *
   *  Guest words are ephemeral exposure: they must never reach the
   *  Leitner queue, lifetime counts or per-language counters, or they
   *  would trip checkPolyglotBadge() fraudulently. See docs/EVENTS.md's
   *  invariant, which generalises exactly this rule. */
  guestWord?: { lang: string; chance: number; bonusTokens: number };
  /**
   * The Mi family: bias *which* words get served by length.
   *
   * The only perk here that acts on the words themselves rather than on
   * their presentation or their payout. `strength` is 0-1.
   *
   * Guard rail, enforced in review.ts: this is a **tiebreaker inside the
   * set the scheduler already considers eligible**, never an override of
   * it. `pickNextIndex()` stays in charge of what is *due for review*;
   * a companion may nudge which of those comes up next and nothing more.
   * A companion must never be able to starve the review queue.
   */
  lengthBias?: {
    prefer: 'short' | 'long' | 'random';
    strength: number;
    /** Extra tokens per letter beyond `from`, for companions paid by length. */
    lengthBonus?: { from: number; perLetter: number };
  };
  /** Robot: speaks a short spoken compliment via speakWord() after a
   *  correct answer. Muted-wrapped by the caller so the recognizer never
   *  hears its own praise. Purely additive — no economy interaction. */
  complimenter?: boolean;
  /** Robot: grants +1 skip every `skipEvery` correct answers this run,
   *  layered on top of the normal award the same way Wolf's pack bonus
   *  and Sparrow's burst are — never a change to the award itself. */
  skipEvery?: number;
  /** Crane's glow: the companion widget's glow intensity scales with the
   *  current in-run streak while this is true. Purely visual — no economy
   *  or answer-gating interaction, so it costs nothing to add to anyone. */
  glowOnStreak?: boolean;
  /** Sprout: a plant on the companion widget advances one stage every
   *  `every` words answered correctly this run; every `bloomEvery` words
   *  it blooms, rolls one `rewards` entry, and resets to stage 0. */
  growth?: { every: number; bloomEvery: number; rewards: RewardRoll[] };
  copy: {
    quips: string[];
    /** Replaces the generic "Game Over" headline while equipped. */
    onGameOver?: string;
  };
  /**
   * Unlocked by playing `unlock` words with this companion equipped — an
   * investment in one character, not a purchase. `overrides` is merged
   * shallowly over the base kit's fields once unlocked, so an ultimate is
   * still just kit data: amplify the identity in both directions (per the
   * design brief), not a second, disconnected companion.
   *
   * Applied once per mount, at the same point the base kit is read — not
   * live mid-run — so crossing the threshold takes effect on the *next*
   * run, matching every other one-shot equip read in this file's callers.
   */
  ultimate?: {
    unlock: number;
    overrides: Partial<CompanionKit>;
  };
}

/** `kit` with its ultimate's overrides applied, if `wordsPlayed` clears the
 *  unlock threshold. Shallow-merges `overrides` over `kit` field by field —
 *  every ultimate below only touches independent perk fields, so this never
 *  needs to be deeper than one level. */
export function effectiveCompanionKit(
  kit: CompanionKit | null,
  wordsPlayed: number,
): CompanionKit | null {
  if (!kit?.ultimate) return kit;
  if (wordsPlayed < kit.ultimate.unlock) return kit;
  return { ...kit, ...kit.ultimate.overrides };
}

/** Highest tier whose `at` <= streak, or 1 (no bonus) if none qualify. */
export function currentStreakMultiplier(
  tiers: { at: number; mult: number }[] | undefined,
  streak: number,
): number {
  if (!tiers) return 1;
  let mult = 1;
  for (const tier of tiers) {
    if (streak >= tier.at) mult = tier.mult;
  }
  return mult;
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
    // heart / 2% rare drop) with 'bonus points' and 'guest word' folded
    // into 'tokens' (still unbuilt as generic reward-table entries — see
    // companion-rewards.ts's file header) but the rare drop is real.
    collectible: {
      glyph: '🎋',
      spawnEveryMs: [2200, 4200],
      maxOnScreen: 4,
      origin: 'bottom',
      sizeRange: [26, 40],
      capPerRun: 8,
      rewards: [
        { kind: 'tokens', weight: 80, amount: [3, 12] },
        { kind: 'skip', weight: 10 },
        { kind: 'heart', weight: 8 },
        // Doc's "rare cosmetic drop" slot — grants the Autumn Leaves skin,
        // matching NiNi's own falling-leaves ambient. Backed by the pity
        // timer in companion-layer.tsx, so it's guaranteed within a bound
        // even at 2% odds rather than possibly never landing.
        { kind: 'skin', weight: 2, seasonId: 'leaves' },
      ],
      // Every 10 words: a bamboo explosion — bounces around and clatters,
      // no tap needed. Celebration, not a second payout channel (the slow
      // tap-to-collect bamboo above already pays out on its own schedule).
      burst: { every: 10, count: [8, 14], sound: 'rattle' },
    },
    copy: { quips: ["No rush. You've got this.", 'Slow and steady.', 'Take your time.'] },
    // Calm becomes lucrative: even more time to think, and a flat 2.5x on
    // every hit (streakMultiplier's existing `at: 0` tier — always active,
    // no streak required — is exactly a flat multiplier, so this needed no
    // new field). Amplifies NiNi's identity in both directions, per brief.
    ultimate: {
      unlock: 400,
      overrides: {
        pacing: { hitMs: 1500, restartMs: 1200 },
        streakMultiplier: [{ at: 0, mult: 2.5 }],
      },
    },
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
    hint: { chance: 0.25 },
    copy: { quips: ["Chirp! You're doing great.", 'Small steps count.'] },
    // Wren's nudge, much more often — the gentle assist becomes the
    // headline feature rather than an occasional courtesy.
    ultimate: {
      unlock: 400,
      overrides: { hint: { chance: 0.6 } },
    },
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
    burstChance: { chance: 0.12, extraMult: 1 },
    copy: { quips: ['Quick as ever!', "Let's keep going."] },
    // Nearly a third of hits now burst, and each burst pays double what it
    // used to — Sparrow goes from "occasional flourish" to "usually on".
    ultimate: {
      unlock: 400,
      overrides: { burstChance: { chance: 0.35, extraMult: 2 } },
    },
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
    // Doc's "raft" combo (clear 5 before any surface) needs a per-bubble
    // lifespan signal collectibles.ts doesn't expose yet -- approximated
    // with the same charge mechanic Amber's bottle uses: every 5th bubble
    // caught is the "raft" landing, paying a bonus on top.
    collectible: {
      glyph: '🫧',
      spawnEveryMs: [1600, 3000],
      maxOnScreen: 6,
      origin: 'top',
      sizeRange: [16, 26],
      capPerRun: 30,
      rewards: [
        { kind: 'tokens', weight: 90, amount: [1, 3] },
        { kind: 'heart', weight: 8 },
        // Doc: "every reward table carries a 2% cosmetic slot." Fireflies
        // isn't a literal water skin (none of the premium Seasons are),
        // but the doc doesn't require a thematic match, only that it's
        // an existing grant -- see NiNi/Amber for the cases where a
        // matching skin did exist.
        { kind: 'skin', weight: 2, seasonId: 'fireflies' },
      ],
      charge: {
        capacity: 5,
        burstCount: [6, 10],
        sound: 'splash',
        bonusRewards: [{ kind: 'tokens', weight: 100, amount: [10, 20] }],
      },
    },
    copy: { quips: ['Splash! Having fun yet?', "You've got this."] },
    // The raft lands every 3rd bubble instead of every 5th, and pays out
    // roughly double — Otter's "clear a few before any surface" identity,
    // amplified rather than replaced.
    ultimate: {
      unlock: 400,
      overrides: {
        collectible: {
          glyph: '🫧',
          spawnEveryMs: [1600, 3000],
          maxOnScreen: 6,
          origin: 'top',
          sizeRange: [16, 26],
          capPerRun: 30,
          rewards: [
            { kind: 'tokens', weight: 90, amount: [1, 3] },
            { kind: 'heart', weight: 8 },
            { kind: 'skin', weight: 2, seasonId: 'fireflies' },
          ],
          charge: {
            capacity: 3,
            burstCount: [10, 16],
            sound: 'splash',
            bonusRewards: [{ kind: 'tokens', weight: 100, amount: [20, 38] }],
          },
        },
      },
    },
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
    // Doc's shell game (token hidden under one of 3 leaves) needs a
    // choice-based reveal UI that doesn't exist yet -- simplified to a
    // guaranteed bonus every 3rd leaf caught, same charge mechanic as
    // Otter's raft, so it's still "sometimes a leaf hides something".
    collectible: {
      glyph: '🍁',
      spawnEveryMs: [2000, 3600],
      maxOnScreen: 4,
      origin: 'edges',
      sizeRange: [18, 28],
      capPerRun: 15,
      rewards: [
        { kind: 'tokens', weight: 88, amount: [2, 6] },
        { kind: 'skip', weight: 10 },
        // A perfect match this time — Fox's own ambient IS autumn leaves.
        { kind: 'skin', weight: 2, seasonId: 'leaves' },
      ],
      charge: {
        capacity: 3,
        burstCount: [5, 8],
        sound: 'pop',
        bonusRewards: [{ kind: 'tokens', weight: 100, amount: [15, 30] }],
      },
    },
    copy: { quips: ['Yip! Nearly there.', 'Sneaky good streak.'] },
    // The hidden bonus lands on every 2nd leaf instead of every 3rd, and
    // pays noticeably more when it does.
    ultimate: {
      unlock: 400,
      overrides: {
        collectible: {
          glyph: '🍁',
          spawnEveryMs: [2000, 3600],
          maxOnScreen: 4,
          origin: 'edges',
          sizeRange: [18, 28],
          capPerRun: 15,
          rewards: [
            { kind: 'tokens', weight: 88, amount: [2, 6] },
            { kind: 'skip', weight: 10 },
            { kind: 'skin', weight: 2, seasonId: 'leaves' },
          ],
          charge: {
            capacity: 2,
            burstCount: [8, 12],
            sound: 'pop',
            bonusRewards: [{ kind: 'tokens', weight: 100, amount: [25, 45] }],
          },
        },
      },
    },
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
    shield: { foldsNeeded: 10 },
    // The folded paper catches more light the longer the current streak
    // holds — a purely additive glow on the companion widget, reusing
    // the same streak ref the shield-fold count already tracks.
    glowOnStreak: true,
    copy: { quips: ['Graceful as always.', 'Steady wins it.'] },
    // Folds twice as fast, so the shield is up far more often.
    ultimate: {
      unlock: 400,
      overrides: { shield: { foldsNeeded: 5 } },
    },
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
    // "Pack bonus" -- the pack gets stronger the longer the streak holds,
    // resets the instant it breaks (see the miss branch in game.tsx/
    // draw.tsx that zeroes the streak ref this reads from).
    streakMultiplier: [
      { at: 5, mult: 1.5 },
      { at: 15, mult: 2 },
      { at: 30, mult: 3 },
    ],
    copy: { quips: ['Awoo! Pack is proud.', "Don't stop now."] },
    // The pack kicks in sooner and tops out much higher.
    ultimate: {
      unlock: 400,
      overrides: {
        streakMultiplier: [
          { at: 3, mult: 2 },
          { at: 10, mult: 3 },
          { at: 20, mult: 5 },
        ],
      },
    },
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
    ambush: { chance: 0.08, bonusMult: 3 },
    copy: { quips: ['Roar! Ferocious focus.', 'Keep the momentum.'] },
    // Ambushes 3x more often and pays 5x — but a missed flagged word now
    // costs an extra heart on top of the normal miss (ambushPenalty). T3:
    // telegraphed (the ambush banner already renders whenever one is
    // flagged) and opt-in (only a player who equipped and levelled Tiger
    // to 400 words has this active at all).
    ultimate: {
      unlock: 400,
      overrides: {
        ambush: { chance: 0.24, bonusMult: 5 },
        ambushPenalty: true,
      },
    },
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
    // "Very rare, very large payout" -- a slow, low-count spawn (few
    // chances per run) with a small per-bubble reward, but the charge
    // threshold is deliberately low relative to Otter's so a "breach"
    // actually lands sometimes despite the low spawn rate.
    collectible: {
      glyph: '🫧',
      spawnEveryMs: [3200, 5200],
      maxOnScreen: 3,
      origin: 'top',
      sizeRange: [22, 34],
      capPerRun: 12,
      rewards: [
        { kind: 'tokens', weight: 98, amount: [2, 5] },
        { kind: 'skin', weight: 2, seasonId: 'snow' },
      ],
      charge: {
        capacity: 8,
        burstCount: [18, 28],
        sound: 'ascend',
        bonusRewards: [{ kind: 'tokens', weight: 100, amount: [60, 120] }],
      },
    },
    copy: { quips: ['A deep breath, then on.', 'Making waves out there.'] },
    // The breach lands roughly twice as often, and pays roughly twice as
    // much when it does — "very rare, very large" becomes "rare, huge".
    ultimate: {
      unlock: 400,
      overrides: {
        collectible: {
          glyph: '🫧',
          spawnEveryMs: [3200, 5200],
          maxOnScreen: 3,
          origin: 'top',
          sizeRange: [22, 34],
          capPerRun: 12,
          rewards: [
            { kind: 'tokens', weight: 98, amount: [2, 5] },
            { kind: 'skin', weight: 2, seasonId: 'snow' },
          ],
          charge: {
            capacity: 4,
            burstCount: [24, 36],
            sound: 'ascend',
            bonusRewards: [{ kind: 'tokens', weight: 100, amount: [100, 200] }],
          },
        },
      },
    },
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
        { kind: 'tokens', weight: 88, amount: [1, 4] },
        { kind: 'skip', weight: 10 },
        // Rare drop — Ash & Embers, matching Amber's own ambient. Same
        // pity-timer backstop as NiNi's leaves.
        { kind: 'skin', weight: 2, seasonId: 'embers' },
      ],
      charge: {
        capacity: 25,
        burstCount: [16, 24],
        sound: 'gong',
        bonusRewards: [{ kind: 'tokens', weight: 100, amount: [40, 80] }],
      },
    },
    copy: { quips: ['Legendary pace.', 'Fire it up!'] },
    // The bottle fills much faster and the cash-in is far bigger — the
    // hoard-and-cash-in loop tightens rather than staying occasional.
    ultimate: {
      unlock: 400,
      overrides: {
        collectible: {
          glyph: '🔥',
          spawnEveryMs: [1800, 3400],
          maxOnScreen: 5,
          origin: 'top',
          sizeRange: [20, 32],
          capPerRun: 40,
          rewards: [
            { kind: 'tokens', weight: 88, amount: [1, 4] },
            { kind: 'skip', weight: 10 },
            { kind: 'skin', weight: 2, seasonId: 'embers' },
          ],
          charge: {
            capacity: 12,
            burstCount: [24, 36],
            sound: 'gong',
            bonusRewards: [{ kind: 'tokens', weight: 100, amount: [80, 150] }],
          },
        },
      },
    },
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
    revive: { perMatch: 1 },
    copy: { quips: ['Reborn every run.', 'Rise and keep going.'] },
    // A second life per run — the strongest perk in the set, doubled.
    ultimate: {
      unlock: 400,
      overrides: { revive: { perMatch: 2 } },
    },
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
    id: 'robot',
    name: 'Robot',
    ambient: {
      id: 'companion-robot',
      name: 'Robot — drifting sparks',
      blurb: 'Small mechanical sparks tick and drift around Robot.',
      glyphs: ['⚙️', '✦'],
      motion: { gravity: 0, terminalVelocity: 10, spinSpeed: 40, wander: 0.4, flicker: 0.5, swayAmplitude: 6, swayFrequency: 0.5 },
      baseCount: 6,
      sizeRange: [6, 12],
      opacity: 0.4,
      cost: 0,
    },
    // Just gives compliments — a spoken line via speakWord() after every
    // correct answer, muted-wrapped by the caller so the recognizer never
    // hears itself. Precise and reliable is the whole fantasy, which is
    // also why the skip cadence below is a flat "every N", not a roll.
    complimenter: true,
    skipEvery: 12,
    copy: { quips: ['Compliment generated: nice work.', 'Efficiency: optimal.'] },
    // Compliments more often and the skip cadence tightens.
    ultimate: {
      unlock: 400,
      overrides: { skipEvery: 6 },
    },
  },
  {
    id: 'sprout',
    name: 'Sprout',
    ambient: {
      id: 'companion-sprout',
      name: 'Sprout — floating pollen',
      blurb: 'Pollen drifts lazily around Sprout.',
      glyphs: ['🌱', '·'],
      motion: { gravity: -5, terminalVelocity: 10, spinSpeed: 0, wander: 0.6, flicker: 0.3, swayAmplitude: 10, swayFrequency: 0.2 },
      baseCount: 5,
      sizeRange: [4, 8],
      opacity: 0.35,
      cost: 0,
    },
    // A plant grows out of Sprout: one stage every 10 words, blooms and
    // pays out every 30 (3 stages), then resets to grow again. Rendered by
    // companion-widget.tsx as a small stage indicator beside the avatar.
    growth: {
      every: 10,
      bloomEvery: 30,
      rewards: [
        { kind: 'tokens', weight: 55, amount: [10, 25] },
        { kind: 'skip', weight: 20 },
        { kind: 'heart', weight: 15 },
        { kind: 'skin', weight: 10, seasonId: 'leaves' },
      ],
    },
    copy: { quips: ['Growing steady.', 'Nearly ready to bloom!'] },
    // Blooms twice as often and the payout table skews richer.
    ultimate: {
      unlock: 400,
      overrides: {
        growth: {
          every: 10,
          bloomEvery: 15,
          rewards: [
            { kind: 'tokens', weight: 50, amount: [20, 45] },
            { kind: 'skip', weight: 20 },
            { kind: 'heart', weight: 15 },
            { kind: 'skin', weight: 15, seasonId: 'leaves' },
          ],
        },
      },
    },
  },
  /* ── The Mi family ──────────────────────────────────────────────
     Three siblings from the lore, and the first companions whose
     mechanic is about the *words themselves* rather than decoration.
     Each handles a length band: they seek those words out and pay for
     them. See `lengthBias` above for the guard rail that keeps this a
     nudge rather than a hijack of the review queue. */
  {
    id: 'mini-mi',
    name: 'Mini-Mi',
    ambient: {
      id: 'companion-mini-mi',
      name: 'Mini-Mi — tiny motes',
      blurb: 'Small bright specks scatter around Mini-Mi.',
      glyphs: ['·', '✦'],
      motion: { gravity: -3, terminalVelocity: 14, spinSpeed: 0, wander: 1.6, flicker: 0.5, swayAmplitude: 8, swayFrequency: 0.4 },
      baseCount: 12,
      sizeRange: [4, 8],
      opacity: 0.5,
      cost: 0,
    },
    // The small one — handles tiny words, and serves more of them.
    lengthBias: { prefer: 'short', strength: 0.8 },
    copy: { quips: ['Small and quick!', 'Little words count too.'] },
    // Strength maxes out — short words dominate the queue as hard as
    // lengthBias is ever allowed to push it (review.ts's tiebreaker-only
    // guard rail is what keeps this from starving due words).
    ultimate: {
      unlock: 400,
      overrides: { lengthBias: { prefer: 'short', strength: 1 } },
    },
  },
  {
    id: 'big-mi',
    name: 'Big-Mi',
    ambient: {
      id: 'companion-big-mi',
      name: 'Big-Mi — heavy blocks',
      blurb: 'Big slow shapes drift past Big-Mi.',
      glyphs: ['▉', '◼'],
      motion: { gravity: 5, terminalVelocity: 18, spinSpeed: 6, wander: 0.1, flicker: 0, swayAmplitude: 10, swayFrequency: 0.1 },
      baseCount: 5,
      sizeRange: [18, 30],
      opacity: 0.25,
      cost: 0,
    },
    // The large one — handles big words, and finally makes the hardest
    // words the most valuable ones.
    lengthBias: {
      prefer: 'long',
      strength: 0.8,
      lengthBonus: { from: 5, perLetter: 2 },
    },
    copy: { quips: ['Big word? Bring it.', 'The long ones pay best.'] },
    // Max strength, and each extra letter pays double.
    ultimate: {
      unlock: 400,
      overrides: {
        lengthBias: { prefer: 'long', strength: 1, lengthBonus: { from: 5, perLetter: 4 } },
      },
    },
  },
  {
    id: 'rando-mi',
    name: 'Rando-Mi',
    ambient: {
      id: 'companion-rando-mi',
      name: 'Rando-Mi — unpredictable motes',
      blurb: 'Nothing around Rando-Mi keeps the same size twice.',
      glyphs: ['✦', '◆', '▪'],
      motion: { gravity: 2, terminalVelocity: 30, spinSpeed: 90, wander: 2.2, flicker: 0.7, swayAmplitude: 26, swayFrequency: 0.5 },
      baseCount: 9,
      sizeRange: [5, 26],
      opacity: 0.4,
      cost: 0,
    },
    // The unpredictable sibling — length swings turn to turn, and the
    // swing itself is the mechanic, so the bias is re-rolled per word
    // rather than derived from length (see review.ts's lengthFactor).
    lengthBias: {
      prefer: 'random',
      strength: 1,
      lengthBonus: { from: 6, perLetter: 3 },
    },
    copy: { quips: ['Who knows what is next!', 'Roll with it.'] },
    // The brief's live mid-word reflow ("size fluctuates as you look at
    // it") needs a presentation channel outside the event director, which
    // doesn't exist yet — see docs/COMPANIONS.md's Mi family section. This
    // amplifies the existing per-word swing instead: `strength: 1` is
    // already the max lengthFactor's [0.5, 1.5] bound allows, so the
    // ultimate widens the payoff for a big swing rather than the swing
    // itself.
    ultimate: {
      unlock: 400,
      overrides: {
        lengthBias: { prefer: 'random', strength: 1, lengthBonus: { from: 4, perLetter: 4 } },
      },
    },
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
    guestWord: { lang: 'fr', chance: 0.2, bonusTokens: 2 },
    // Baguette Storm: reuses the exact physics-burst mechanism NiNi's
    // bamboo explosion already built (companion-layer.tsx's `wordCount %
    // every` trigger) rather than a new consecutive-streak tracker — the
    // doc's "long clean streak" becomes "every 15 correct answers this
    // run", the same simplification pattern Otter's raft and Fox's shell
    // game already document. Bread, not bamboo; a bigger burst.
    collectible: {
      glyph: '🥖',
      spawnEveryMs: [1e9, 1e9], // no slow tap-to-collect half — storm only
      maxOnScreen: 0,
      origin: 'bottom',
      sizeRange: [18, 26],
      capPerRun: 0,
      rewards: [],
      burst: { every: 15, count: [10, 16], sound: 'rattle' },
    },
    copy: {
      quips: ['Magnifique, mon ami!', 'A little crusty, a lot proud.'],
      onGameOver: "C'est la vie.",
    },
    // Doubles down on the guest-word charm and the storm comes every 10
    // instead of every 15.
    ultimate: {
      unlock: 400,
      overrides: {
        guestWord: { lang: 'fr', chance: 0.4, bonusTokens: 5 },
        collectible: {
          glyph: '🥖',
          spawnEveryMs: [1e9, 1e9],
          maxOnScreen: 0,
          origin: 'bottom',
          sizeRange: [18, 26],
          capPerRun: 0,
          rewards: [],
          burst: { every: 10, count: [14, 22], sound: 'rattle' },
        },
      },
    },
  },
  /* ── Bot-Loko ────────────────────────────────────────────────────
     Promoted from event-only antagonist (companion-events.ts,
     docs/EVENTS.md's lore) to a hidden, achievement-gated companion —
     see roadmap.ts's LOK_COMPANIONS entry (`secret: true`) and
     roadmap.tsx's GalleryCard, which renders it as `❔`/`???` with only a
     cryptic hint until unlocked.

     Deliberately understated at base tier: its identity is the event, not
     a stat line, matching "not malicious, mis-specified" rather than
     "a companion that happens to also be a debuff." The payoff is the
     ultimate — see `droneAlly` and event-director.tsx's `bot-loko` case. */
  {
    id: 'bot-loko',
    name: 'Bot-Loko',
    ambient: {
      id: 'companion-bot-loko',
      name: 'Bot-Loko — stray sparks',
      blurb: 'Faint circuit sparks drift and flicker around Bot-Loko.',
      glyphs: ['✨', '·'],
      motion: { gravity: -2, terminalVelocity: 12, spinSpeed: 20, wander: 0.8, flicker: 0.9, swayAmplitude: 10, swayFrequency: 0.3 },
      baseCount: 5,
      sizeRange: [4, 9],
      opacity: 0.35,
      cost: 0,
    },
    copy: { quips: ['eep — still recalibrating.', 'Sorry about your tokens. Really.'] },
    // Repaired, it retrieves *for* the player instead of taking a skip on
    // escape — the lore's whole payoff. See event-director.tsx's
    // `bot-loko` case, gated on `droneAlly`.
    ultimate: {
      unlock: 400,
      overrides: { droneAlly: true },
    },
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

/**
 * Plain-English summary of what a companion actually does, split into
 * upside and cost — the thing nothing in the UI told a player before this.
 * Every perk mechanic lived only as a code comment in this file, invisible
 * to anyone who didn't read the source.
 *
 * Generated from the kit's own fields rather than hand-authored per
 * companion, on purpose: a hand-written description drifts out of sync
 * the moment a number here changes (a tuning pass on Tiger's ambush odds
 * would silently make its own description a lie). Reading the fields
 * directly means the description is the mechanic.
 */
export interface CompanionPerkSummary {
  positives: string[];
  negatives: string[];
  /** Only present once the kit passed to this function is already the
   *  *effective* (ultimate-merged) kit — see effectiveCompanionKit(). */
  ultimate?: string;
}

export function describeCompanionPerks(kit: CompanionKit): CompanionPerkSummary {
  const positives: string[] = [];
  const negatives: string[] = [];
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  if (kit.pacing) {
    positives.push(`More time to think and speak — every word waits ${(kit.pacing.hitMs / 1000).toFixed(1)}s before advancing.`);
  }
  if (kit.streakMultiplier?.length) {
    const top = kit.streakMultiplier[kit.streakMultiplier.length - 1];
    positives.push(
      top.at === 0
        ? `Every correct answer pays an extra ${top.mult}x tokens.`
        : `Token pay escalates up to ${top.mult}x while your streak holds (${top.at}+ in a row).`,
    );
  }
  if (kit.shield) {
    positives.push(`Every ${kit.shield.foldsNeeded} correct answers in a row earns a shield that absorbs your next miss outright — no heart lost.`);
  }
  if (kit.burstChance) {
    positives.push(`${pct(kit.burstChance.chance)} chance per correct answer of a bonus burst paying ${kit.burstChance.extraMult}x extra tokens.`);
  }
  if (kit.ambush) {
    positives.push(`${pct(kit.ambush.chance)} chance a word gets flagged as an ambush — answer it right for ${kit.ambush.bonusMult}x tokens.`);
    if (kit.ambushPenalty) {
      negatives.push('Missing a flagged ambush word costs an extra heart on top of the normal miss.');
    } else {
      positives.push('Missing a flagged word costs nothing beyond the normal miss.');
    }
  }
  if (kit.hint) {
    positives.push(`${pct(kit.hint.chance)} chance of a first-letter nudge on the word.`);
  }
  if (kit.revive) {
    positives.push(`Survives reaching 0 hearts ${kit.revive.perMatch === 1 ? 'once' : `${kit.revive.perMatch} times`} per run instead of ending it.`);
  }
  if (kit.guestWord) {
    positives.push(`Occasionally shows the word's ${kit.guestWord.lang.toUpperCase()} counterpart alongside it — say it too for +${kit.guestWord.bonusTokens} tokens. Ignoring it costs nothing.`);
  }
  if (kit.lengthBias) {
    const dir = kit.lengthBias.prefer === 'short' ? 'shorter' : kit.lengthBias.prefer === 'long' ? 'longer' : 'unpredictable-length';
    positives.push(`Nudges the word list toward ${dir} words (never overrides what's actually due for review).`);
    if (kit.lengthBias.lengthBonus) {
      positives.push(`Pays extra tokens per letter beyond ${kit.lengthBias.lengthBonus.from} on the word you actually answer.`);
    }
  }
  if (kit.droneAlly) {
    positives.push('Repaired: retrieves tokens for you instead of taking a skip when its event resolves.');
  }
  if (positives.length === 0 && negatives.length === 0) {
    positives.push('Ambient companion — sets the mood, no mechanical effect on the run.');
  }

  const ultimate = kit.ultimate ? `Ultimate unlocks at ${kit.ultimate.unlock} words played with this companion equipped.` : undefined;
  return { positives, negatives, ultimate };
}
