/* ------------------------------------------------------------------
   Weighted reward table for companion collectibles (docs/COMPANIONS.md's
   bamboo table, generalised to any CompanionKit.collectible).

   'tokens' | 'skip' | 'heart' | 'skin' are implemented. The doc's "bonus
   points toward the current run" and "guest word" slots still need hooks
   (a run-score callback, the cross-language counterpart lookup — the
   latter now exists for Sir Baguette specifically, see
   companion-guest-word.ts, but isn't wired as a generic reward-table
   entry) that don't exist for arbitrary collectibles yet. Their weight
   stays folded into 'tokens' so the table's total payout rate matches
   the doc even though those two payout shapes are narrower for now.
------------------------------------------------------------------ */

import { earnTokens, addSkips, addHearts } from './economy';
import { grantSeason, ownsSeason } from './seasons';

export interface RewardRoll {
  weight: number;
  kind: 'tokens' | 'skip' | 'heart' | 'skin';
  /** tokens only — [min, max] inclusive. */
  amount?: [number, number];
  /** skin only — a Season id from lib/seasons.ts (grantSeason target). */
  seasonId?: string;
}

const PITY_PREFIX = 'lok-lingu-companion-pity-';
/** Collects without a rare drop before one is forced — per companion, so
 *  NiNi's 8-per-run cap and Amber's 40-per-run cap both reliably clear it
 *  within a handful of runs rather than a threshold tuned for neither. */
export const PITY_THRESHOLD = 40;

function getPity(companionId: string): number {
  return parseInt(localStorage.getItem(PITY_PREFIX + companionId) || '0', 10) || 0;
}

function setPity(companionId: string, value: number): void {
  localStorage.setItem(PITY_PREFIX + companionId, String(value));
}

/**
 * Rolls a reward, but forces the table's 'skin' entry once `companionId`
 * has gone PITY_THRESHOLD collects without one — persisted across runs
 * (a per-run counter would rarely reach 40 on a collectible capped well
 * below that per run). Resets whenever a skin actually lands, natural or
 * forced.
 */
export function rollRewardWithPity(companionId: string, table: RewardRoll[]): RewardRoll {
  const rareSlot = table.find((r) => r.kind === 'skin');
  const pity = getPity(companionId);
  let roll: RewardRoll;
  if (rareSlot && pity + 1 >= PITY_THRESHOLD) {
    roll = rareSlot;
  } else {
    roll = rollReward(table);
  }
  setPity(companionId, roll.kind === 'skin' ? 0 : pity + 1);
  return roll;
}

export function rollReward(table: RewardRoll[]): RewardRoll {
  const total = table.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of table) {
    if (roll < r.weight) return r;
    roll -= r.weight;
  }
  return table[table.length - 1];
}

/** Applies the roll via economy.ts/seasons.ts and returns a short label for a toast/label. */
export function grantReward(roll: RewardRoll): string {
  switch (roll.kind) {
    case 'skip':
      addSkips(1);
      return '+1 skip';
    case 'heart':
      addHearts(1);
      return '+1 heart';
    case 'skin': {
      // Already-owned dud (bought it, or drew this same rare before): the
      // pity timer that led here shouldn't cash out as literally nothing,
      // so it pays a chunky token bonus instead — still a "you hit the
      // rare slot" moment, just not a redundant grant.
      if (roll.seasonId && !ownsSeason(roll.seasonId)) {
        grantSeason(roll.seasonId);
        return '🎁 rare skin!';
      }
      earnTokens(20);
      return '+20 🎁';
    }
    case 'tokens':
    default: {
      const [min, max] = roll.amount ?? [3, 12];
      const amount = min + Math.floor(Math.random() * (max - min + 1));
      earnTokens(amount);
      return `+${amount}`;
    }
  }
}
