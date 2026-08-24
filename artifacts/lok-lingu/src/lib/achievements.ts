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
import { currentSessionBestWords, categoryWordCount, getUnlockedAchievements, setAchievementUnlocked, setCompanionUnlocked, botLokoInterceptsCount } from '../hooks/use-celebration';
import { getAllNotes } from './journal';

/**
 * How many words of a given length band the player has ever answered
 * correctly. The Mi family's unlocks are earned by actually working
 * through words of that shape, which is the whole point of the siblings.
 */
function wordsAnsweredInLengthBand(min: number, max: number): number {
  return getAllNotes().filter(
    (n) => n.correctCount > 0 && n.word.length >= min && n.word.length <= max,
  ).length;
}

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

/**
 * The Mi family's unlocks. Length-band achievements rather than
 * language/category ones, matching what the siblings actually do — you
 * earn Big-Mi by getting through big words.
 */
export const LENGTH_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'mi-short-words',
    title: 'Mini-Mi',
    detail: 'Correctly answer 25 words of four letters or fewer.',
    glyph: '🔹',
    tier: 'uncommon',
    check: () => wordsAnsweredInLengthBand(1, 4) >= 25,
    rewardLabel: 'Mini-Mi companion',
  },
  {
    id: 'mi-long-words',
    title: 'Big-Mi',
    detail: 'Correctly answer 25 words of eight letters or more.',
    glyph: '🔶',
    tier: 'rare',
    check: () => wordsAnsweredInLengthBand(8, Infinity) >= 25,
    rewardLabel: 'Big-Mi companion',
  },
  {
    id: 'mi-any-words',
    title: 'Rando-Mi',
    detail: 'Earn both of the other siblings — Rando-Mi only shows up once they have.',
    glyph: '🎲',
    tier: 'epic',
    check: () => {
      const done = getUnlockedAchievements();
      return done.includes('mi-short-words') && done.includes('mi-long-words');
    },
    rewardLabel: 'Rando-Mi companion',
  },
];

/**
 * The Bot-Loko companion's unlock. The achievement itself is deliberately
 * visible (unlike the companion card it grants, which is `secret` — see
 * roadmap.ts's LOK_COMPANIONS entry) — it's the trail of breadcrumbs that
 * lets a player discover the hidden companion at all, rather than a second
 * layer of the same secret.
 */
export const BOTLOKO_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'botloko-caught',
    title: 'Caught Red-Handed',
    detail: 'Intercept Bot-Loko 5 times.',
    glyph: '🦇',
    tier: 'rare',
    check: () => botLokoInterceptsCount() >= 5,
    rewardLabel: 'Bot-Loko companion',
  },
];

export const ALL_ACHIEVEMENTS: Achievement[] = [
  ...SESSION_ACHIEVEMENTS,
  ...CATEGORY_ACHIEVEMENTS,
  ...LENGTH_ACHIEVEMENTS,
  ...BOTLOKO_ACHIEVEMENTS,
];

// Some achievements also unlock a LOK_COMPANIONS entry (roadmap.ts).
// Kept as a side-table here rather than a field on Achievement so
// achievements.ts doesn't need to import roadmap.ts's Milestone shape —
// the companion id just has to match LOK_COMPANIONS' title-derived id.
const ACHIEVEMENT_COMPANION_UNLOCKS: Record<string, string> = {
  'fr-food-baguette': 'sir-baguette',
  'mi-short-words': 'mini-mi',
  'mi-long-words': 'big-mi',
  'mi-any-words': 'rando-mi',
  'botloko-caught': 'bot-loko',
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
