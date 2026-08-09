/* ------------------------------------------------------------------
   Progression roadmap.

   Two tracks, both driven by counters the game already writes:

     match  — words hit inside the current run (`incrementMatch`). Drives
              the in-run celebration ladder up to 100.
     total  — lifetime words across every language (`getLifetimeWords`).
              Drives the long collection track, including animals.

   Nothing here mutates state. `evaluate()` is a pure projection of the
   two counters onto the milestone tables, so the roadmap page, the game
   HUD and any future notification all read the same source and cannot
   disagree about what is unlocked.
------------------------------------------------------------------ */

export type Track = 'match' | 'total';

export type RewardKind = 'tokens' | 'skip' | 'heart' | 'celebration' | 'theme' | 'companion' | 'badge';

export type Tier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface Milestone {
  /** Counter value at which this unlocks. */
  at: number;
  track: Track;
  title: string;
  detail: string;
  reward: RewardKind;
  /** Human-readable reward amount, e.g. "+25 tokens". */
  rewardLabel: string;
  /** False while the reward is designed but not yet wired to anything. */
  live: boolean;
  /** Display glyph for gallery cards. Only companions set this today. */
  glyph?: string;
  /** Rarity — drives which emblem-* animation a gallery card gets. */
  tier?: Tier;
}

/**
 * Tier → one of the seven emblem-* keyframe animations already defined
 * in index.css (reused, not reinvented — see EMBLEMS in lib/emblems.ts
 * for the same vocabulary applied to level rewards). `common` gets no
 * animation; static is the right amount of flourish for the entry tier.
 */
export const TIER_ANIMATION: Record<Tier, string | null> = {
  common: null,
  uncommon: 'emblem-pulse',
  rare: 'emblem-flicker',
  epic: 'emblem-orbit',
  legendary: 'emblem-prism',
  mythic: 'emblem-shimmer',
};

/**
 * The in-run ladder to 100. These mirror what `use-celebration.ts`
 * actually does today — mini burst every 25, big every 50 (which also
 * unlocks boost), suBang every 100 (which activates boost).
 */
export const MATCH_MILESTONES: Milestone[] = [
  { at: 5,   track: 'match', title: 'Warm',          detail: 'Five in a row without stopping.',                   reward: 'badge',       rewardLabel: 'Warm badge',        live: true },
  { at: 10,  track: 'match', title: 'Rolling',       detail: 'Ten straight — the loop is holding.',               reward: 'badge',       rewardLabel: 'Rolling badge',     live: true },
  { at: 25,  track: 'match', title: 'First Burst',   detail: 'Your equipped celebration fires at mini intensity.', reward: 'tokens',      rewardLabel: '+25 tokens',        live: true  },
  { at: 50,  track: 'match', title: 'Boost Unlocked',detail: 'Big celebration, and Token Boost becomes available.', reward: 'celebration', rewardLabel: 'Boost unlocked',    live: true  },
  { at: 75,  track: 'match', title: 'Deep Run',      detail: 'Three quarters of the way to a century.',            reward: 'badge',       rewardLabel: '+1 skip',           live: true },
  { at: 100, track: 'match', title: 'Century',       detail: 'suBang celebration, and Token Boost activates.',     reward: 'celebration', rewardLabel: 'Boost activated',   live: true  },
];

/**
 * The long track. "What could animals be" — the answer this roadmap
 * commits to is *companions*: one animal per lifetime tier, each tied to
 * a language family, unlocked by total words spoken. They are collection
 * pieces first (a visible menagerie), and later a cosmetic that rides
 * along on the game screen where the floating "L" sits today.
 */
export const TOTAL_MILESTONES: Milestone[] = [
  { at: 10,    track: 'total', title: 'Wren',      detail: 'Companion. The very first — arrives fast so the system introduces itself early.', reward: 'companion', rewardLabel: 'Wren companion', live: true, glyph: '🐤', tier: 'common' },
  { at: 25,    track: 'total', title: 'Sparrow',   detail: 'Companion. Small, quick, first to arrive.',          reward: 'companion', rewardLabel: 'Sparrow companion',  live: true, glyph: '🐦', tier: 'common' },
  { at: 50,    track: 'total', title: 'Otter',     detail: 'Companion. Playful — keeps the early stretch from feeling empty before Centurion.', reward: 'companion', rewardLabel: 'Otter companion', live: true, glyph: '🦦', tier: 'common' },
  { at: 100,   track: 'total', title: 'Centurion', detail: 'One hundred words banked across all languages.',     reward: 'tokens',    rewardLabel: '+100 tokens',        live: false, glyph: '💯' },
  { at: 250,   track: 'total', title: 'Fox',       detail: 'Companion. Arrives with a free skip stack.',         reward: 'companion', rewardLabel: 'Fox + 1 skip',       live: true, glyph: '🦊', tier: 'uncommon' },
  { at: 500,   track: 'total', title: 'Crane',     detail: 'Companion. Unlocks the Lingu Culture theme tier.',   reward: 'companion', rewardLabel: 'Crane + theme tier', live: true, glyph: '🦢', tier: 'uncommon' },
  { at: 1000,  track: 'total', title: 'Wolf',      detail: 'Companion. Pack animal — hearts start stacking.',    reward: 'companion', rewardLabel: 'Wolf + 3 hearts',    live: true, glyph: '🐺', tier: 'rare' },
  { at: 2500,  track: 'total', title: 'Tiger',     detail: 'Companion. Flag Tier singles unlock.',               reward: 'companion', rewardLabel: 'Tiger + flag tier',  live: true, glyph: '🐯', tier: 'rare' },
  { at: 5000,  track: 'total', title: 'Whale',     detail: 'Companion. The whole Flag Pack, no purchase.',       reward: 'companion', rewardLabel: 'Whale + flag pack',  live: true, glyph: '🐋', tier: 'epic' },
  { at: 10000, track: 'total', title: 'Dragon',    detail: 'Companion. Mythic tier, animated, one per account.', reward: 'companion', rewardLabel: 'Dragon + Mythic',    live: true, glyph: '🐉', tier: 'legendary' },
  /*
   * New concepts past the original ceiling. Kept on the same total-words
   * counter deliberately — a companion tier that needed its own tracker
   * would be a second economy to keep in sync, and the whole point of
   * this track is that it cannot desync from what was actually played.
   */
  { at: 20000, track: 'total', title: 'Phoenix',  detail: 'Companion. Reborn each Legacy Archive cycle — see docs/PROGRESSION.md.', reward: 'companion', rewardLabel: 'Phoenix + Legacy Archive', live: true, glyph: '🐦‍🔥', tier: 'mythic' },
  { at: 50000, track: 'total', title: 'Leviathan', detail: 'Companion. The last tier. A permanent nameplate flourish, not just an icon.', reward: 'companion', rewardLabel: 'Leviathan + nameplate', live: true, glyph: '🐙', tier: 'mythic' },
];

/**
 * New earnable *concepts*, not yet wired to a reward payout — proposed
 * here so the roadmap page has somewhere to show them and the next
 * implementation pass has a concrete list instead of a blank page.
 * Deliberately all derived from counters that already exist.
 */
export const CONCEPT_MILESTONES: Milestone[] = [
  {
    at: 3, track: 'total', title: 'Polyglot',
    detail: 'Earned by playing 3+ different languages, not by words in any one of them — rewards breadth instead of grinding a single language.',
    reward: 'badge', rewardLabel: 'Polyglot badge', live: true,
  },
  {
    at: 7, track: 'total', title: 'Streak Keeper',
    detail: 'Play on 7 different calendar days. A comeback track, not a punishing daily-streak that resets on one missed day.',
    reward: 'badge', rewardLabel: 'Streak Keeper badge', live: true,
  },
  {
    at: 1, track: 'total', title: 'Archivist',
    detail: 'Equip a Legacy theme or celebration at least once — a nudge toward the archived styles from earlier updates, not just the newest ones.',
    reward: 'badge', rewardLabel: 'Archivist badge', live: true,
  },
];

export const ALL_MILESTONES = [...MATCH_MILESTONES, ...TOTAL_MILESTONES];

export interface TrackState {
  milestones: (Milestone & { unlocked: boolean })[];
  /** The next locked milestone, or null when the track is complete. */
  next: Milestone | null;
  /** 0–1 progress towards `next`, measured from the previous milestone. */
  progress: number;
}

function project(list: Milestone[], value: number): TrackState {
  const milestones = list.map((m) => ({ ...m, unlocked: value >= m.at }));
  const next = list.find((m) => value < m.at) ?? null;
  if (!next) return { milestones, next: null, progress: 1 };

  const prevAt = [...list].reverse().find((m) => m.at <= value)?.at ?? 0;
  const span = next.at - prevAt;
  const progress = span <= 0 ? 0 : Math.min(1, Math.max(0, (value - prevAt) / span));
  return { milestones, next, progress };
}

export function evaluate(matchCount: number, totalWords: number): {
  match: TrackState;
  total: TrackState;
} {
  return {
    match: project(MATCH_MILESTONES, matchCount),
    total: project(TOTAL_MILESTONES, totalWords),
  };
}
