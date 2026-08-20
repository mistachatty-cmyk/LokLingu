/**
 * LokSets — one concept covering every organized word grouping, whether it's
 * a built-in category list or something a player built themselves.
 *
 * Built-in lists (all 17 languages x 5 categories) are NOT migrated into
 * stored StudySet records — that would be a real data migration for zero
 * behavioral gain. Instead they're derived here, on read, from
 * FALLBACK_WORDS, and given the same card shape as custom sets so the
 * /loksets UI and the game/draw launch path don't need to know which kind
 * they're looking at.
 */

import { FALLBACK_WORDS, FALLBACK_LANGUAGES } from './offline-data';
import { getAllStudySets, getStudySet, getSetWordEntries, type LokSetWord } from './journal';

/** Set by loksets.tsx before navigating to /game or /draw; read once there
 *  and cleared on exit so a later plain Voice/Draw launch from the main
 *  menu doesn't stay pinned to whatever LokSet was last played. */
export const CUSTOM_SET_KEY = 'lok-lingu-custom-set-id';
export const CUSTOM_ORDER_KEY = 'lok-lingu-custom-order';

export interface WordSetCard {
  /** `default:{lang}:{category}` for a derived set, or the StudySet id. */
  id: string;
  name: string;
  lang: string;
  description?: string;
  wordCount: number;
  favorite: boolean;
  kind: 'default' | 'custom' | 'special';
  category?: string;
}

function langName(code: string): string {
  return FALLBACK_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** One card per language x category — the entire bundled dictionary, browsable as sets. */
export function defaultWordSets(): WordSetCard[] {
  const cards: WordSetCard[] = [];
  for (const [lang, categories] of Object.entries(FALLBACK_WORDS)) {
    for (const [category, words] of Object.entries(categories)) {
      cards.push({
        id: `default:${lang}:${category}`,
        name: `${langName(lang)} — ${titleCase(category)}`,
        lang,
        category,
        wordCount: words.length,
        favorite: false,
        kind: 'default',
      });
    }
  }
  return cards;
}

/** The player's own LokSets. */
export function customWordSets(): WordSetCard[] {
  return getAllStudySets().map((s) => ({
    id: s.id,
    name: s.name,
    lang: s.lang,
    description: s.description,
    wordCount: s.entries?.length ?? s.words.length,
    favorite: !!s.favorite,
    kind: s.kind ?? 'custom',
  }));
}

export function allWordSets(): WordSetCard[] {
  return [...customWordSets(), ...defaultWordSets()];
}

export interface ResolvedWordSet {
  id: string;
  name: string;
  lang: string;
  entries: LokSetWord[];
  /** What order.ts / game.tsx should default to when the player hasn't overridden it. */
  defaultOrderMode: 'sequential' | 'shuffle';
}

/**
 * Turns any LokSet id (default or custom) into its word entries plus the
 * language they belong to. This is the one function game.tsx and draw.tsx
 * need to go from "which LokSet is active" to "what to play" — neither
 * screen needs to know whether the id was derived or stored.
 */
export function resolveWordSet(id: string): ResolvedWordSet | null {
  if (id.startsWith('default:')) {
    const [, lang, category] = id.split(':');
    const words = FALLBACK_WORDS[lang]?.[category];
    if (!words || words.length === 0) return null;
    return {
      id,
      name: `${langName(lang)} — ${titleCase(category)}`,
      lang,
      entries: words.map((w) => ({
        word: w.word,
        translation: w.translation,
        pronunciation: w.pronunciation,
        category,
      })),
      // Numbers stay sequential by default, matching lib/review.ts's
      // SEQUENTIAL_CATEGORIES — counting to twenty in shuffled order would
      // defeat the point. Everything else defaults to shuffle, matching
      // today's pickNextIndex()-driven behavior.
      defaultOrderMode: category === 'numbers' ? 'sequential' : 'shuffle',
    };
  }

  const set = getStudySet(id);
  if (!set) return null;
  const entries = getSetWordEntries(set);
  if (entries.length === 0) return null;
  return {
    id,
    name: set.name,
    lang: set.lang,
    entries,
    defaultOrderMode: set.orderMode ?? 'shuffle',
  };
}
