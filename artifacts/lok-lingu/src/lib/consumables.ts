export interface ConsumableBundle {
  qty: number;
  cost: number;
  earnFreeAt: number; // lifetime word threshold to earn free
}

export interface ConsumableDef {
  id: 'skips' | 'hearts';
  name: string;
  icon: string;
  desc: string;
  storageKey: string;
  bundles: ConsumableBundle[];
}

export const SKIPS_KEY = 'lok-lingu-skips';
export const HEARTS_KEY = 'lok-lingu-hearts';

export const CONSUMABLES: ConsumableDef[] = [
  {
    id: 'skips',
    name: 'SKIPS',
    icon: '⏭',
    desc: 'Jump past a word you are stuck on. Every match already includes one free skip.',
    storageKey: SKIPS_KEY,
    bundles: [
      { qty: 1, cost: 20, earnFreeAt: 250 },
      { qty: 2, cost: 36, earnFreeAt: 500 },
      { qty: 3, cost: 50, earnFreeAt: 1000 },
    ],
  },
  {
    id: 'hearts',
    name: 'HEARTS',
    icon: '♥',
    desc: 'Extra lives in Draw mode. Banked hearts carry between matches.',
    storageKey: HEARTS_KEY,
    bundles: [
      { qty: 1, cost: 30, earnFreeAt: 400 },
      { qty: 2, cost: 54, earnFreeAt: 800 },
      { qty: 3, cost: 75, earnFreeAt: 1500 },
    ],
  },
];

export function getConsumableCount(key: string): number {
  return parseInt(localStorage.getItem(key) || '0');
}

export function setConsumableCount(key: string, count: number): void {
  localStorage.setItem(key, String(Math.max(0, count)));
}
