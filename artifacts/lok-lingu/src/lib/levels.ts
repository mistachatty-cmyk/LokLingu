/* ------------------------------------------------------------------
   Player levels.

   Derived, never stored. Level is a pure function of lifetime words —
   the counter the game already writes on every correct answer — so it
   cannot desync from actual play, cannot be lost by clearing a stray
   key, and cannot be awarded twice.

   Curve: cumulative words for level L = round(1.2 * L^1.85).

     L10 ≈    82      L40 ≈  1,161      L84 ≈  4,355
     L20 ≈    295     L60 ≈  2,485      L100 ≈ 6,001

   Deliberately superlinear but not brutal: early levels arrive fast
   enough to explain the system, and level 100 is a genuine commitment
   without being unreachable.
------------------------------------------------------------------ */

export const MAX_LEVEL = 100;

/** Total lifetime words required to *reach* this level. */
export function wordsForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(1.2 * Math.pow(level, 1.85));
}

export function levelFromWords(words: number): number {
  if (words <= 0) return 1;
  // Monotonic curve, so a bounded scan is exact and cheap enough to run
  // on render. No need for an inverse-power approximation.
  let level = 1;
  while (level < MAX_LEVEL && words >= wordsForLevel(level + 1)) level += 1;
  return level;
}

export interface LevelState {
  level: number;
  words: number;
  /** Words banked since reaching the current level. */
  into: number;
  /** Words between the current level and the next. */
  span: number;
  /** 0–1 progress towards the next level. 1 at MAX_LEVEL. */
  progress: number;
  nextAt: number | null;
}

export function levelState(words: number): LevelState {
  const level = levelFromWords(words);
  if (level >= MAX_LEVEL) {
    return { level, words, into: 0, span: 0, progress: 1, nextAt: null };
  }
  const base = wordsForLevel(level);
  const next = wordsForLevel(level + 1);
  const span = Math.max(1, next - base);
  const into = Math.max(0, words - base);
  return { level, words, into, span, progress: Math.min(1, into / span), nextAt: next };
}

/* ---------------------- level-gated perks ---------------------- */

/**
 * Free skips granted at the start of every match. Level is the only
 * input, so this is the one place the number is decided — `game.tsx`
 * asks rather than hard-coding a constant.
 */
export function freeSkipsForLevel(level: number): number {
  if (level >= 50) return 3;
  if (level >= 20) return 2;
  return 1;
}

/** The level at which the Vault stops clearing between matches. */
export const ETERNAL_VAULT_LEVEL = 84;

export function hasEternalVault(level: number): boolean {
  return level >= ETERNAL_VAULT_LEVEL;
}

/* ------------------------- live readers ------------------------- */

import { getLifetimeWords } from './offline-data';

/** Total lifetime words across every language. */
export function currentWords(): number {
  return Object.values(getLifetimeWords()).reduce((a, b) => a + b, 0);
}

export function currentLevel(): number {
  return levelFromWords(currentWords());
}
