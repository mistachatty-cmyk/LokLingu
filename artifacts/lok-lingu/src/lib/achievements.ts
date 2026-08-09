/* ------------------------------------------------------------------
   Achievements.

   Mirrors roadmap.ts's Milestone shape (glyph/tier) so the same
   GalleryCard/TIER_ANIMATION machinery in roadmap.tsx can render these
   with no new UI code. Unlike Milestones, achievements are evaluated by
   an arbitrary predicate (`check`) rather than a single counter
   threshold, since some ("1000 words in one session") aren't expressible
   as a simple "at N" comparison against a single stored value.

   Two starting categories:
     session  — challenges scoped to a single run (e.g. Thousand Club).
     category — per-language, per-word-category flavor achievements (e.g.
                50 French food words). First example only; the pattern is
                built to extend to more languages/categories later.
------------------------------------------------------------------ */

import type { Tier } from './roadmap';
import { currentSessionBestWords, categoryWordCount, getUnlockedAchievements, setAchievementUnlocked, setCompanionUnlocked } from '../hooks/use-celebration';

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  glyph: string;
  tier: Tier;
  check: () => boolean;
  rewardLabel: string;
}

export const SESSION_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'thousand-club',
    title: 'Thousand Club',
    detail: 'Count 1,000 words in a single session, back to back.',
    glyph: '🔥',
    tier: 'epic',
    check: () => currentSessionBestWords() >= 1000,
    rewardLabel: '+200 tokens',
  },
];

/**
 * Per-language, per-category flavor achievements. Ships a small proof-of
 * -concept set (not a full language x category matrix) per the user's
 * "expand later" framing — one real French example plus two more to show
 * the pattern generalizes across languages and categories.
 */
export const CATEGORY_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'fr-food-baguette',
    title: 'Le Boulanger',
    detail: 'Correctly answer 50 French food words.',
    glyph: '🥖',
    tier: 'rare',
    check: () => categoryWordCount('fr', 'food') >= 50,
    rewardLabel: 'Baguette token skin + Sir Baguette companion',
  },
  {
    id: 'ja-animals-shiba',
    title: 'Dōbutsu Tsūjin',
    detail: 'Correctly answer 50 Japanese animal words.',
    glyph: '🐕',
    tier: 'rare',
    check: () => categoryWordCount('ja', 'animals') >= 50,
    rewardLabel: 'Shiba token skin',
  },
  {
    id: 'es-greetings-amigo',
    title: 'El Saludador',
    detail: 'Correctly answer 50 Spanish greeting words.',
    glyph: '🤝',
    tier: 'rare',
    check: () => categoryWordCount('es', 'greetings') >= 50,
    rewardLabel: 'Sombrero token skin',
  },
];

export const ALL_ACHIEVEMENTS: Achievement[] = [...SESSION_ACHIEVEMENTS, ...CATEGORY_ACHIEVEMENTS];

// Some achievements also unlock a SPECIAL_COMPANIONS entry (roadmap.ts).
// Kept as a side-table here rather than a field on Achievement so
// achievements.ts doesn't need to import roadmap.ts's Milestone shape —
// the companion id just has to match SPECIAL_COMPANIONS' title-derived id.
const ACHIEVEMENT_COMPANION_UNLOCKS: Record<string, string> = {
  'fr-food-baguette': 'sir-baguette',
};

/** Runs every achievement's predicate and persists any newly-met ones. */
export function updateAchievementUnlocks(): void {
  const unlocked = getUnlockedAchievements();
  for (const achievement of ALL_ACHIEVEMENTS) {
    if (unlocked.includes(achievement.id)) continue;
    if (achievement.check()) {
      setAchievementUnlocked(achievement.id);
      const companionId = ACHIEVEMENT_COMPANION_UNLOCKS[achievement.id];
      if (companionId) setCompanionUnlocked(companionId);
    }
  }
}
