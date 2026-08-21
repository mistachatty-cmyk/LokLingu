/* ------------------------------------------------------------------
   Sir Baguette's guest word — docs/COMPANIONS.md.

   Occasionally the word being served has a French counterpart shown
   alongside it as a strictly-upside bonus: say it too, get +2 tokens.
   Ignoring it costs nothing. This module is just the lookup; game.tsx
   owns rolling the chance, displaying it, and handling the extra match.
------------------------------------------------------------------ */

import { FALLBACK_WORDS, type WordEntry } from './offline-data';

/**
 * French counterpart of `word`, matched via the shared English
 * `translation` pivot every language already keys off (es "uno" -> "one",
 * fr "un" -> "one"). Returns null when `fromLang` is already French, the
 * word isn't found, or French has no entry in this category sharing the
 * same translation — coverage across languages is uneven (see the doc's
 * measured es/fr pivot gap), so failing gracefully here means the event
 * just doesn't fire that round rather than throwing.
 */
export function frenchCounterpart(word: string, fromLang: string, category: string): WordEntry | null {
  if (fromLang === 'fr') return null;
  const source = FALLBACK_WORDS[fromLang]?.[category]?.find((e) => e.word === word);
  if (!source) return null;
  const frList = FALLBACK_WORDS.fr?.[category];
  if (!frList) return null;
  return frList.find((e) => e.translation === source.translation) ?? null;
}

/** Rolled once per served word. */
export const GUEST_WORD_CHANCE = 0.2;
