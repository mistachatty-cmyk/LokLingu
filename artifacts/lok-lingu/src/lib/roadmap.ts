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
}

/**
 * The in-run ladder to 100. These mirror what `use-celebration.ts`
 * actually does today — mini burst every 25, big every 50 (which also
 * unlocks boost), suBang every 100 (which activates boost).
 */
export const MATCH_MILESTONES: Milestone[] = [
  { at: 5,   track: 'match', title: 'Warm',          detail: 'Five in a row without stopping.',                   reward: 'badge',       rewardLabel: 'Warm badge',        live: false },
  { at: 10,  track: 'match', title: 'Rolling',       detail: 'Ten straight — the loop is holding.',               reward: 'badge',       rewardLabel: 'Rolling badge',     live: false },
  { at: 25,  track: 'match', title: 'First Burst',   detail: 'Your equipped celebration fires at mini intensity.', reward: 'tokens',      rewardLabel: '+25 tokens',        live: true  },
  { at: 50,  track: 'match', title: 'Boost Unlocked',detail: 'Big celebration, and Token Boost becomes available.', reward: 'celebration', rewardLabel: 'Boost unlocked',    live: true  },
  { at: 75,  track: 'match', title: 'Deep Run',      detail: 'Three quarters of the way to a century.',            reward: 'skip',        rewardLabel: '+1 skip',           live: false },
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
  { at: 25,    track: 'total', title: 'Sparrow',   detail: 'Companion. Small, quick, first to arrive.',          reward: 'companion', rewardLabel: 'Sparrow companion',  live: false },
  { at: 100,   track: 'total', title: 'Centurion', detail: 'One hundred words banked across all languages.',     reward: 'tokens',    rewardLabel: '+100 tokens',        live: false },
  { at: 250,   track: 'total', title: 'Fox',       detail: 'Companion. Arrives with a free skip stack.',         reward: 'companion', rewardLabel: 'Fox + 1 skip',       live: false },
  { at: 500,   track: 'total', title: 'Crane',     detail: 'Companion. Unlocks the Lingu Culture theme tier.',   reward: 'companion', rewardLabel: 'Crane + theme tier', live: false },
  { at: 1000,  track: 'total', title: 'Wolf',      detail: 'Companion. Pack animal — hearts start stacking.',    reward: 'companion', rewardLabel: 'Wolf + 3 hearts',    live: false },
  { at: 2500,  track: 'total', title: 'Tiger',     detail: 'Companion. Flag Tier singles unlock.',               reward: 'companion', rewardLabel: 'Tiger + flag tier',  live: false },
  { at: 5000,  track: 'total', title: 'Whale',     detail: 'Companion. The whole Flag Pack, no purchase.',       reward: 'companion', rewardLabel: 'Whale + flag pack',  live: false },
  { at: 10000, track: 'total', title: 'Dragon',    detail: 'Companion. Mythic tier, animated, one per account.', reward: 'companion', rewardLabel: 'Dragon + Mythic',    live: false },
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
