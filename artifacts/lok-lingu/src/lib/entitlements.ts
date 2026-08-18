/* ------------------------------------------------------------------
   Entitlements — what a paid tier actually unlocks.

   Before this module the three tier cards in the shop were decorative:
   no onClick, no state, no gate anywhere in the codebase. This gives them
   something real to control.

   One rule governs what may sit behind a tier:

     **Paid tiers buy cosmetics and convenience. They never buy pedagogy.**

   Review scheduling, attempt tracking, the weak-word list, session
   summaries and every word in the app stay free for everyone, permanently.
   An app that charges for the thing that makes it teach is not a learning
   app with a subscription attached — it is a paywall with vocabulary in
   it. Gating any of that would undo the entire point of the review work.

   Payments are deliberately not wired here. Every purchase path funnels
   through `beginCheckout`, which is the single function to replace when a
   real processor is connected.
------------------------------------------------------------------ */

import { isDevMode } from './dev-mode';

export type TierId = 'free' | 'pass' | 'passport' | 'lifetime';

/** Ascending order of privilege; index doubles as the comparison rank. */
const TIER_RANK: TierId[] = ['free', 'pass', 'passport', 'lifetime'];

export type BillingPeriod = 'monthly' | 'annual';

export interface TierDef {
  id: TierId;
  name: string;
  blurb: string;
  monthly: number | null;
  /** Annual price. Cheaper per month than paying monthly. */
  annual: number | null;
  /** One-off price, for lifetime only. */
  oneTime?: number;
  perks: string[];
  highlight?: boolean;
}

export const TIERS: TierDef[] = [
  {
    id: 'free',
    name: 'Free',
    blurb: 'The whole language app. Genuinely.',
    monthly: 0,
    annual: 0,
    perks: [
      'Every language, every word',
      'Review scheduling & weak-word tracking',
      'Voice and Draw modes',
      'Levels, prestige and achievements',
      'Earn tokens and spend them on cosmetics',
    ],
  },
  {
    id: 'pass',
    name: 'Lok Pass',
    blurb: 'Dress the place up.',
    monthly: 2.99,
    annual: 24.99,
    perks: [
      'No ads',
      'Full seasons library',
      'Premium theme categories',
      'Cursor cosmetics',
      'Monthly token stipend',
    ],
  },
  {
    id: 'passport',
    name: 'Lok Passport',
    blurb: 'Everything here, plus the rest of the ecosystem.',
    monthly: 10,
    annual: 89.99,
    perks: [
      'Everything in Lok Pass',
      'Premium vault physics & motion variants',
      'Exclusive token looks',
      'Mythic theme tier',
      'Access across all Lok apps',
    ],
    highlight: true,
  },
  {
    id: 'lifetime',
    name: 'Lifetime Passport',
    blurb: 'Once. Then never again.',
    monthly: null,
    annual: null,
    oneTime: 500,
    perks: [
      'Everything in Lok Passport, permanently',
      'All future apps and updates included',
      'Legacy supporter badge',
      'No recurring anything',
    ],
  },
];

export const TIER_BY_ID = new Map(TIERS.map((t) => [t.id, t]));

/** Monthly-equivalent saving from paying annually, as a percentage. */
export function annualSaving(tier: TierDef): number | null {
  if (!tier.monthly || !tier.annual) return null;
  const monthlyTotal = tier.monthly * 12;
  if (monthlyTotal <= 0) return null;
  return Math.round(((monthlyTotal - tier.annual) / monthlyTotal) * 100);
}

const K = {
  tier: 'lok-lingu-tier',
  period: 'lok-lingu-tier-period',
} as const;

export const ENTITLEMENT_EVENT = 'lok-entitlement';

function announce(): void {
  try {
    window.dispatchEvent(new CustomEvent(ENTITLEMENT_EVENT));
  } catch {
    /* non-browser context */
  }
}

export function currentTier(): TierId {
  if (isDevMode()) return 'lifetime';
  try {
    const stored = localStorage.getItem(K.tier) as TierId | null;
    if (stored && TIER_RANK.includes(stored)) return stored;
  } catch {
    /* fall through */
  }
  return 'free';
}

export function currentPeriod(): BillingPeriod {
  try {
    return localStorage.getItem(K.period) === 'annual' ? 'annual' : 'monthly';
  } catch {
    return 'monthly';
  }
}

/** True when the active tier is at least `required`. */
export function hasTier(required: TierId): boolean {
  return TIER_RANK.indexOf(currentTier()) >= TIER_RANK.indexOf(required);
}

/**
 * Grants a tier locally. This exists so the UI is testable and so a real
 * processor has an obvious place to call on webhook confirmation — it is
 * NOT proof of purchase and nothing security-sensitive should trust it.
 */
export function grantTier(tier: TierId, period: BillingPeriod = 'monthly'): void {
  try {
    localStorage.setItem(K.tier, tier);
    localStorage.setItem(K.period, period);
  } catch {
    /* private mode */
  }
  announce();
}

export interface CheckoutResult {
  ok: boolean;
  reason?: 'unconfigured';
}

/**
 * The single seam where a payment processor gets connected.
 *
 * Nothing is wired today, so this reports back that checkout is
 * unavailable rather than pretending a purchase succeeded. The caller
 * shows that state honestly instead of silently unlocking.
 */
export async function beginCheckout(
  _tier: TierId,
  _period: BillingPeriod,
): Promise<CheckoutResult> {
  return { ok: false, reason: 'unconfigured' };
}

/* ---------------------- what each tier gates ---------------------- */

/**
 * Cosmetic surfaces only. If something here ever starts affecting what a
 * player can learn or how well they learn it, it belongs in the free tier
 * instead — see the note at the top of this file.
 */
export const GATES = {
  /** Theme tiers above the general categories. */
  premiumThemes: 'pass' as TierId,
  /** The mythic animated theme collection. */
  mythicThemes: 'passport' as TierId,
  /** Ad removal. */
  adFree: 'pass' as TierId,
  /** Cursor glass and trail cosmetics. */
  cursors: 'pass' as TierId,
  /** The heavier vault physics and motion variants. */
  premiumMotions: 'passport' as TierId,
} as const;
