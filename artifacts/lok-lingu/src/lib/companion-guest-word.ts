/* ------------------------------------------------------------------
   Companion guest words — docs/COMPANIONS.md.

   Occasionally the word being served has a counterpart in another
   language shown alongside it as a strictly-upside bonus: say it too and
   get a few extra tokens. Ignoring it costs nothing.

   The target language, the chance and the payout all live on the
   companion kit's `guestWord` field, so this is no longer Baguette-only
   — any companion can be given a guest word in any language. This module
   is just the lookup; the page owns rolling it, showing it, and handling
   the extra match.
------------------------------------------------------------------ */

import { FALLBACK_WORDS, type WordEntry } from './offline-data';

/**
 * The `toLang` counterpart of `word`, matched via the shared English
 * `translation` pivot every language already keys off (es "uno" -> "one",
 * fr "un" -> "one"). Returns null when the two languages match, the
 * word isn't found, or the target has no entry in this category sharing
 * the same translation — coverage across languages is uneven (see the
 * doc's measured es/fr pivot gap), so failing gracefully here means the
 * bonus just doesn't appear that round rather than throwing.
 */
export function counterpartWord(
  word: string,
  fromLang: string,
  toLang: string,
  category: string,
): WordEntry | null {
  if (fromLang === toLang) return null;
  const source = FALLBACK_WORDS[fromLang]?.[category]?.find((e) => e.word === word);
  if (!source) return null;
  const target = FALLBACK_WORDS[toLang]?.[category];
  if (!target) return null;
  return target.find((e) => e.translation === source.translation) ?? null;
}
