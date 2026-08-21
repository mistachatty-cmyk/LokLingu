/* ------------------------------------------------------------------
   Weighted reward table for companion collectibles (docs/COMPANIONS.md's
   bamboo table, generalised to any CompanionKit.collectible).

   Only 'tokens' | 'skip' | 'heart' are implemented — the doc's "bonus
   points toward the current run", "guest word", and "rare cosmetic drop"
   slots need hooks (a run-score callback, the cross-language counterpart
   lookup, a skin-grant target) that don't exist yet. Their weight is
   folded into 'tokens' rather than left unhandled, so the table's total
   payout rate matches the doc even though the payout shape is narrower
   for now.
------------------------------------------------------------------ */

import { earnTokens, addSkips, addHearts } from './economy';

export interface RewardRoll {
  weight: number;
  kind: 'tokens' | 'skip' | 'heart';
  /** tokens only — [min, max] inclusive. */
  amount?: [number, number];
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

/** Applies the roll via economy.ts and returns a short label for a toast/label. */
export function grantReward(roll: RewardRoll): string {
  switch (roll.kind) {
    case 'skip':
      addSkips(1);
      return '+1 skip';
    case 'heart':
      addHearts(1);
      return '+1 heart';
    case 'tokens':
    default: {
      const [min, max] = roll.amount ?? [3, 12];
      const amount = min + Math.floor(Math.random() * (max - min + 1));
      earnTokens(amount);
      return `+${amount}`;
    }
  }
}
