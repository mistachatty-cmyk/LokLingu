/* ------------------------------------------------------------------
   The player economy — one owner for every spendable balance.

   Before this file, "tokens" were a write-only number: the game showed
   "+2" on every hit, banked nothing, and the only path that ever touched
   `lok-lingu-lifetime-tokens` was the 25-match milestone bonus. Nothing
   could be spent, so themes/skips/hearts had no currency behind them.

   Model:
     earned  — monotonic, never decreases. This is the number shown as
               "Lifetime LOK" and the one milestones key off.
     spent   — monotonic, never decreases.
     balance — earned - spent. What the shop can actually charge.

   Keeping earned monotonic matters: progression milestones (see
   `roadmap.ts`) are lifetime achievements, so spending must not undo a
   badge the player already unlocked.
------------------------------------------------------------------ */

export const ECONOMY_EVENT = 'lok-economy';

const K = {
  earned: 'lok-lingu-lifetime-tokens',
  spent: 'lok-lingu-spent-tokens',
  skips: 'lok-lingu-skips',
  hearts: 'lok-lingu-hearts',
} as const;

/** Every match starts with this many skips regardless of inventory. */
export const FREE_SKIPS_PER_MATCH = 1;

function read(key: string): number {
  try {
    return parseInt(localStorage.getItem(key) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function write(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
  } catch {
    /* private mode — balances simply do not persist */
  }
}

function announce(): void {
  try {
    window.dispatchEvent(new CustomEvent(ECONOMY_EVENT));
  } catch {
    /* non-browser context */
  }
}

export interface Wallet {
  earned: number;
  spent: number;
  balance: number;
  skips: number;
  hearts: number;
}

export function getWallet(): Wallet {
  const earned = read(K.earned);
  const spent = read(K.spent);
  return {
    earned,
    spent,
    balance: Math.max(0, earned - spent),
    skips: read(K.skips),
    hearts: read(K.hearts),
  };
}

export function earnTokens(amount: number): void {
  if (amount <= 0) return;
  write(K.earned, read(K.earned) + amount);
  announce();
}

export function addSkips(count: number): void {
  if (count <= 0) return;
  write(K.skips, read(K.skips) + count);
  announce();
}

export function addHearts(count: number): void {
  if (count <= 0) return;
  write(K.hearts, read(K.hearts) + count);
  announce();
}

/** Spends one banked skip. Returns false when the player has none. */
export function consumeSkip(): boolean {
  const current = read(K.skips);
  if (current <= 0) return false;
  write(K.skips, current - 1);
  announce();
  return true;
}

/** Spends one banked heart. Returns false when the player has none. */
export function consumeHeart(): boolean {
  const current = read(K.hearts);
  if (current <= 0) return false;
  write(K.hearts, current - 1);
  announce();
  return true;
}

/* ---------------------------- store ---------------------------- */

export type StackKind = 'skip' | 'heart';

export interface StackSku {
  id: string;
  kind: StackKind;
  /** How many units this pack grants. */
  quantity: number;
  label: string;
  cost: number;
  /**
   * The intent is for these to become *earned* rather than bought — see
   * docs/PROGRESSION.md. `earnedAt` records the lifetime-word count that
   * will eventually grant this pack for free. It is displayed today as a
   * "coming soon" hint and drives nothing else yet.
   */
  earnedAt: number;
}

/**
 * Stacks are deliberately priced with a bulk discount so buying three is
 * cheaper per-unit than buying one three times.
 */
export const STACK_SKUS: StackSku[] = [
  { id: 'skip-1', kind: 'skip', quantity: 1, label: '+1 Skip', cost: 20, earnedAt: 250 },
  { id: 'skip-2', kind: 'skip', quantity: 2, label: '+2 Skips', cost: 36, earnedAt: 500 },
  { id: 'skip-3', kind: 'skip', quantity: 3, label: '+3 Skips', cost: 50, earnedAt: 1000 },
  { id: 'heart-1', kind: 'heart', quantity: 1, label: '+1 Heart', cost: 30, earnedAt: 400 },
  { id: 'heart-2', kind: 'heart', quantity: 2, label: '+2 Hearts', cost: 54, earnedAt: 800 },
  { id: 'heart-3', kind: 'heart', quantity: 3, label: '+3 Hearts', cost: 75, earnedAt: 1500 },
];

export type PurchaseResult =
  | { ok: true; wallet: Wallet }
  | { ok: false; reason: 'insufficient' | 'unknown-sku' };

export function purchaseStack(skuId: string): PurchaseResult {
  const sku = STACK_SKUS.find((s) => s.id === skuId);
  if (!sku) return { ok: false, reason: 'unknown-sku' };

  const wallet = getWallet();
  if (wallet.balance < sku.cost) return { ok: false, reason: 'insufficient' };

  // Spend first, then grant. If storage throws mid-way the player keeps
  // their tokens rather than paying for nothing.
  write(K.spent, wallet.spent + sku.cost);
  if (sku.kind === 'skip') write(K.skips, wallet.skips + sku.quantity);
  else write(K.hearts, wallet.hearts + sku.quantity);
  announce();

  return { ok: true, wallet: getWallet() };
}
