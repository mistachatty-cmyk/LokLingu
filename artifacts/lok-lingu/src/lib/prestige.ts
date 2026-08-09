/* ------------------------------------------------------------------
   Prestige.

   Level caps at 100 (see levels.ts). Prestige lets a player bank their
   current lifetime-word total as an "offset" and restart the 1-100 climb,
   up to 10 times, each time requiring more words than the last to
   re-reach 100. At Prestige 10 the player either retires (buy-everything
   with tokens) or enters Master Prestige — a much longer 1-1000 ladder.

   Critically: prestiging never touches lok-lingu-lifetime-{lang}. Those
   counters are the single source of truth for companions, badges, and
   the Menagerie track (roadmap.ts), and must keep summing forever so
   prestiging never un-unlocks anything already earned. Prestige is an
   *offset* layered on top of that sum, not a mutation of it.
------------------------------------------------------------------ */

import { wordsForLevel, MAX_LEVEL, levelState, type LevelState } from './levels';
import { getAllLifetimeWords } from '../hooks/use-celebration';
import { earnTokens } from './economy';

export const MAX_PRESTIGE = 10;
export const MASTER_MAX_LEVEL = 1000;

const STORAGE_PRESTIGE = 'lok-lingu-prestige';
const STORAGE_MASTER_ENTERED = 'lok-lingu-master-prestige';
const STORAGE_PRESTIGE_WORDS_OFFSET = 'lok-lingu-prestige-words-offset';
const STORAGE_ARCHIVE_PREFIX = 'lok-lingu-prestige-archive-';

export function currentPrestige(): number {
  return parseInt(localStorage.getItem(STORAGE_PRESTIGE) || '0');
}

export function isMasterPrestige(): boolean {
  return localStorage.getItem(STORAGE_MASTER_ENTERED) === 'true';
}

function wordsOffset(): number {
  return parseInt(localStorage.getItem(STORAGE_PRESTIGE_WORDS_OFFSET) || '0');
}

/**
 * Requirement multiplier for the *next* prestige — how much more words
 * level 100 costs at this prestige tier than the base curve. Escalates
 * linearly (1 + prestige * 0.35), so Prestige 10 needs roughly 4.15x the
 * base ~6,001 words to re-hit level 100 — a real lengthening, not a
 * token gate.
 */
export function prestigeWordsMultiplier(prestige: number): number {
  return 1 + prestige * 0.35;
}

/** Words required to reach level 100 at the given prestige tier. */
export function wordsForPrestigeLevel100(prestige: number): number {
  return Math.round(wordsForLevel(MAX_LEVEL) * prestigeWordsMultiplier(prestige));
}

/**
 * Words banked *within the current cycle* — total lifetime words minus
 * everything earned in prior cycles. This is what levelState() should be
 * fed post-prestige, never raw currentWords().
 */
export function wordsInCurrentCycle(totalWords: number): number {
  return Math.max(0, totalWords - wordsOffset());
}

/**
 * The level state that should actually be displayed/gated on, composing
 * the prestige offset with the base curve (or the master curve once
 * Master Prestige is entered). Every display/gating surface that used to
 * call levelState(currentWords()) directly should call this instead —
 * kept here (not levels.ts) so levels.ts stays prestige-agnostic and
 * this file is the only place that knows about the offset.
 */
export function effectiveLevelState(totalWords: number): LevelState {
  const cycleWords = wordsInCurrentCycle(totalWords);
  if (isMasterPrestige()) {
    const level = masterLevelFromWords(cycleWords);
    if (level >= MASTER_MAX_LEVEL) {
      return { level, words: cycleWords, into: 0, span: 0, progress: 1, nextAt: null };
    }
    const base = wordsForMasterLevel(level);
    const next = wordsForMasterLevel(level + 1);
    const span = Math.max(1, next - base);
    const into = Math.max(0, cycleWords - base);
    return { level, words: cycleWords, into, span, progress: Math.min(1, into / span), nextAt: next };
  }
  return levelState(cycleWords);
}

export function canPrestige(totalWords: number): boolean {
  if (currentPrestige() >= MAX_PRESTIGE || isMasterPrestige()) return false;
  const prestige = currentPrestige();
  const required = wordsForPrestigeLevel100(prestige);
  return wordsInCurrentCycle(totalWords) >= required;
}

interface PrestigeArchive {
  prestige: number;
  completedAt: number;
  wordsByLanguage: Record<string, number>;
  totalWords: number;
}

function getArchive(prestige: number): PrestigeArchive | null {
  const raw = localStorage.getItem(STORAGE_ARCHIVE_PREFIX + prestige);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PrestigeArchive;
  } catch {
    return null;
  }
}

export function getAllPrestigeArchives(): PrestigeArchive[] {
  const result: PrestigeArchive[] = [];
  // +1 covers the final archive written by enterMasterPrestige (prestige
  // index MAX_PRESTIGE + 1), which marks the Prestige-10-to-Master handoff.
  for (let p = 1; p <= MAX_PRESTIGE + 1; p++) {
    const archive = getArchive(p);
    if (archive) result.push(archive);
  }
  return result.sort((a, b) => a.prestige - b.prestige);
}

/**
 * Snapshot this cycle's per-language contribution (not the running
 * lifetime total) before the offset resets it to zero. Computed as the
 * current lifetime breakdown minus the previous archive's cumulative
 * breakdown, so each archive holds only what was earned in that cycle.
 */
function archiveCurrentCycle(prestige: number, totalWords: number): void {
  const currentByLanguage = getAllLifetimeWords();
  // Roll forward: each archive's wordsByLanguage should represent only
  // that cycle's delta, so accumulate previous cycles' deltas to know
  // what to subtract from the current running lifetime totals.
  const priorArchives = getAllPrestigeArchives().filter((a) => a.prestige < prestige);
  const cumulativeBefore: Record<string, number> = {};
  for (const archive of priorArchives) {
    for (const [lang, count] of Object.entries(archive.wordsByLanguage)) {
      cumulativeBefore[lang] = (cumulativeBefore[lang] || 0) + count;
    }
  }
  const wordsByLanguage: Record<string, number> = {};
  for (const [lang, count] of Object.entries(currentByLanguage)) {
    wordsByLanguage[lang] = Math.max(0, count - (cumulativeBefore[lang] || 0));
  }

  const archive: PrestigeArchive = {
    prestige,
    completedAt: Date.now(),
    wordsByLanguage,
    totalWords: wordsInCurrentCycle(totalWords),
  };
  localStorage.setItem(STORAGE_ARCHIVE_PREFIX + prestige, JSON.stringify(archive));
}

/** Token reward paid out immediately on every prestige (escalating). */
export function prestigeTokenReward(prestige: number): number {
  return 250 * prestige;
}

/**
 * Perform the prestige: archive the current cycle, bank the current
 * total as the new offset, bump the counter, pay the token reward.
 * Returns the new prestige number, or null if not eligible.
 */
export function doPrestige(totalWords: number): number | null {
  if (!canPrestige(totalWords)) return null;
  const nextPrestige = currentPrestige() + 1;
  archiveCurrentCycle(nextPrestige, totalWords);
  localStorage.setItem(STORAGE_PRESTIGE_WORDS_OFFSET, String(totalWords));
  localStorage.setItem(STORAGE_PRESTIGE, String(nextPrestige));
  earnTokens(prestigeTokenReward(nextPrestige));
  return nextPrestige;
}

/**
 * Escalating re-earn bonus: crossing a milestone threshold again after
 * prestiging (companion/badge already unlocked from a prior cycle) pays
 * a scaling token bonus instead of silently no-op'ing. Called by
 * updateCompanionUnlocks/badge-check functions when the id is already
 * unlocked but the threshold was just crossed again this cycle.
 */
export function payReearnBonus(): number {
  const prestige = currentPrestige();
  if (prestige <= 0) return 0;
  const bonus = 250 * prestige;
  earnTokens(bonus);
  return bonus;
}

/* ------------------------- Prestige icons ------------------------- */

export interface PrestigeIcon {
  prestige: number;
  glyph: string;
  name: string;
}

export const PRESTIGE_ICONS: PrestigeIcon[] = [
  { prestige: 1,  glyph: '🥉', name: 'Bronze Circuit' },
  { prestige: 2,  glyph: '🥈', name: 'Silver Current' },
  { prestige: 3,  glyph: '🥇', name: 'Gold Wire' },
  { prestige: 4,  glyph: '💠', name: 'Prism Core' },
  { prestige: 5,  glyph: '⚡', name: 'Voltage' },
  { prestige: 6,  glyph: '🔷', name: 'Sapphire Array' },
  { prestige: 7,  glyph: '🔶', name: 'Amber Reactor' },
  { prestige: 8,  glyph: '💎', name: 'Diamond Lattice' },
  { prestige: 9,  glyph: '🌠', name: 'Comet Trail' },
  { prestige: 10, glyph: '🌌', name: 'Nova' },
];

export function prestigeIcon(prestige: number): PrestigeIcon | null {
  return PRESTIGE_ICONS.find((p) => p.prestige === prestige) ?? null;
}

/* ------------------------- Master Prestige ------------------------- */

/**
 * Enter Master Prestige — the final, permanent state after Prestige 10.
 * One-way: archives the last cycle, resets the offset one final time,
 * flips the master flag. Level curve switches to masterLevelFromWords().
 */
export function enterMasterPrestige(totalWords: number): void {
  if (isMasterPrestige()) return;
  archiveCurrentCycle(MAX_PRESTIGE + 1, totalWords);
  localStorage.setItem(STORAGE_PRESTIGE_WORDS_OFFSET, String(totalWords));
  localStorage.setItem(STORAGE_MASTER_ENTERED, 'true');
}

/**
 * Master level curve: intentionally much longer than the base 1-100
 * curve (~8-10x the per-level word cost) so hitting 1000 is a genuine,
 * multi-cycle-length grind rather than a quick lap. Exact balancing is a
 * follow-up pass — this establishes the numeric ladder and shape.
 */
export function wordsForMasterLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(9 * wordsForLevel(100) * Math.pow(level / 100, 1.5));
}

export function masterLevelFromWords(words: number): number {
  if (words <= 0) return 1;
  let level = 1;
  while (level < MASTER_MAX_LEVEL && words >= wordsForMasterLevel(level + 1)) level += 1;
  return level;
}

export interface MasterTier {
  level: number;
  title: string;
  glyph: string;
}

export const MASTER_TIERS: MasterTier[] = [
  { level: 1,    title: 'Vanguard',     glyph: '🛡️' },
  { level: 100,  title: 'Ironclad',     glyph: '⚙️' },
  { level: 250,  title: 'Ascendant',    glyph: '🌟' },
  { level: 500,  title: 'Sovereign',    glyph: '👑' },
  { level: 750,  title: 'Transcendent', glyph: '🔥' },
  { level: 1000, title: 'Apex',         glyph: '🏆' },
];

export function masterTierTitle(level: number): string {
  let title = MASTER_TIERS[0].title;
  for (const tier of MASTER_TIERS) {
    if (level >= tier.level) title = tier.title;
  }
  return title;
}

/* ------------------------- Retire / buyout ------------------------- */

const STORAGE_RETIRED = 'lok-lingu-retired';

/** Player chose Path A at Prestige 10: stay put, unlock buy-everything. */
export function retire(): void {
  localStorage.setItem(STORAGE_RETIRED, 'true');
}

export function isRetired(): boolean {
  return localStorage.getItem(STORAGE_RETIRED) === 'true';
}

export { type PrestigeArchive };
