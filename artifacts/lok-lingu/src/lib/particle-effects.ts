/* ------------------------------------------------------------------
   Ambient particle effects — the falling-blossoms layer shown behind
   the home screen. Cosmetic only, no gameplay impact. Cherry Blossoms
   ships free; the rest are token-purchasable in the shop.
------------------------------------------------------------------ */

import { spendTokens } from './economy';
import type { ParticleType } from '@/components/falling-blossoms';

export interface ParticleEffect {
  id: ParticleType;
  name: string;
  blurb: string;
  cost: number;
  sample: string;
}

export const PARTICLE_EFFECTS: ParticleEffect[] = [
  { id: 'blossoms', name: 'Cherry Blossoms', blurb: 'Soft pink petals, always in season.', cost: 0, sample: '🌸' },
  { id: 'leaves', name: 'Autumn Leaves', blurb: 'A slow amber drift across the screen.', cost: 500, sample: '🍁' },
  { id: 'snowflakes', name: 'Snowflakes', blurb: 'Quiet winter hush over the home screen.', cost: 500, sample: '❄️' },
  { id: 'stars', name: 'Stardust', blurb: 'Twinkling motes drifting down like wishes.', cost: 500, sample: '✨' },
];

const STORAGE_OWNED = 'lok-lingu-particle-owned';
const STORAGE_SELECTED = 'lok-lingu-particle-type';

export function getOwnedEffects(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_OWNED);
    const owned: string[] = stored ? JSON.parse(stored) : [];
    // Free effects are always owned.
    const free = PARTICLE_EFFECTS.filter((e) => e.cost === 0).map((e) => e.id);
    return Array.from(new Set([...free, ...owned]));
  } catch {
    return PARTICLE_EFFECTS.filter((e) => e.cost === 0).map((e) => e.id);
  }
}

export function ownsEffect(id: string): boolean {
  return getOwnedEffects().includes(id);
}

function grantEffect(id: string): void {
  const owned = getOwnedEffects();
  if (!owned.includes(id)) {
    localStorage.setItem(STORAGE_OWNED, JSON.stringify([...owned, id]));
  }
}

export function getSelectedEffect(): ParticleType {
  return (localStorage.getItem(STORAGE_SELECTED) as ParticleType) || 'blossoms';
}

export function setSelectedEffect(id: ParticleType): void {
  localStorage.setItem(STORAGE_SELECTED, id);
}

/** Buys and equips an effect. Returns false if the player can't afford it. */
export function purchaseEffect(id: string): boolean {
  const effect = PARTICLE_EFFECTS.find((e) => e.id === id);
  if (!effect) return false;
  if (ownsEffect(id)) {
    setSelectedEffect(effect.id);
    return true;
  }
  if (!spendTokens(effect.cost)) return false;
  grantEffect(id);
  setSelectedEffect(effect.id);
  return true;
}
