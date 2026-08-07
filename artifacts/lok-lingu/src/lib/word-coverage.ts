/* ------------------------------------------------------------------
   How complete is a given language/category?

   Deliberately *derived* from FALLBACK_WORDS rather than hand-maintained.
   A hand-kept list of "which categories are thin" drifts the moment
   somebody adds words; counting the real data cannot.

   `numbers` is special: languages with a generator count to infinity, so
   they are always complete regardless of how long the seed table is.
------------------------------------------------------------------ */

import { FALLBACK_WORDS } from './offline-data';
import { supportsInfiniteCounting } from './number-words';

export type Coverage = 'full' | 'beta' | 'experimental' | 'missing';

/** At or above this many entries a category plays like a finished one. */
export const FULL_THRESHOLD = 20;
/** Below FULL but at or above this, it is playable but visibly short. */
export const BETA_THRESHOLD = 10;

export interface CoverageInfo {
  coverage: Coverage;
  count: number;
  /** True when the category counts forever and the count is irrelevant. */
  infinite: boolean;
  label: string;
  /** One line explaining the mark, used as the tap/hover note. */
  note: string;
}

export function wordCount(language: string, category: string): number {
  const list = FALLBACK_WORDS?.[language]?.[category];
  return Array.isArray(list) ? list.length : 0;
}

export function getCoverage(language: string, category: string): CoverageInfo {
  const count = wordCount(language, category);

  if (category === 'numbers' && supportsInfiniteCounting(language)) {
    return {
      coverage: 'full',
      count,
      infinite: true,
      label: 'Infinite',
      note: 'Numbers are generated, so you can count as high as you like.',
    };
  }

  if (count === 0) {
    return {
      coverage: 'missing',
      count,
      infinite: false,
      label: 'Not ready',
      note: 'No word list yet — picking this falls back to numbers.',
    };
  }

  if (count >= FULL_THRESHOLD) {
    return {
      coverage: 'full',
      count,
      infinite: false,
      label: 'Complete',
      note: `${count} words, fully reviewed.`,
    };
  }

  if (count >= BETA_THRESHOLD) {
    return {
      coverage: 'beta',
      count,
      infinite: false,
      label: 'Beta',
      note: `${count} words — playable, still being expanded.`,
    };
  }

  return {
    coverage: 'experimental',
    count,
    infinite: false,
    label: 'Experimental',
    note: `Only ${count} words so far — this one is still being built out.`,
  };
}

/** Opacity for a category chip, so thin lists visibly recede. */
export function coverageOpacity(coverage: Coverage): number {
  switch (coverage) {
    case 'full':
      return 1;
    case 'beta':
      return 0.82;
    case 'experimental':
      return 0.62;
    case 'missing':
      return 0.45;
  }
}

/** The little mark shown on the chip. */
export function coverageSymbol(coverage: Coverage): string | null {
  switch (coverage) {
    case 'full':
      return null;
    case 'beta':
      return '•';
    case 'experimental':
      return '△';
    case 'missing':
      return '✕';
  }
}

/** Aggregate completeness for a whole language, for the language picker. */
export function languageCoverage(language: string, categories: string[]): Coverage {
  const ranks: Record<Coverage, number> = { full: 3, beta: 2, experimental: 1, missing: 0 };
  let worst: Coverage = 'full';
  for (const c of categories) {
    const got = getCoverage(language, c).coverage;
    if (ranks[got] < ranks[worst]) worst = got;
  }
  return worst;
}
