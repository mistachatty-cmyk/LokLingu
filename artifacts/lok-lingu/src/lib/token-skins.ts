export interface TokenSkinDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  section: 'classic' | 'lingu';
  earnCondition?: string;
  cannotBuy?: boolean;
}

export const TOKEN_SKIN_KEY = 'lok-lingu-token-skin';
export const TOKEN_SKINS_OWNED_KEY = 'lok-lingu-token-skins-owned';

export const TOKEN_SKINS: TokenSkinDef[] = [
  // Classic Coins
  {
    id: 'classic',
    name: 'CLASSIC COIN',
    desc: 'The original spinning coin. Rises from the streak counter and fades.',
    cost: 0,
    section: 'classic',
  },
  {
    id: 'aurora-glow',
    name: 'AURORA GLOW',
    desc: 'A soft coloured halo blooms behind the coin as it climbs.',
    cost: 40,
    section: 'classic',
  },
  {
    id: 'neon-outline',
    name: 'NEON OUTLINE',
    desc: 'Hard glowing ring around the coin and the amount. Arcade-bright.',
    cost: 60,
    section: 'classic',
  },
  {
    id: 'jumbo',
    name: 'JUMBO',
    desc: 'Twice the size, twice as slow. Impossible to miss.',
    cost: 70,
    section: 'classic',
  },
  {
    id: 'supernova',
    name: 'SUPERNOVA',
    desc: 'The coin detonates into a ring of sparks before the amount rises.',
    cost: 90,
    section: 'classic',
  },
  {
    id: 'freefall',
    name: 'FREEFALL',
    desc: 'Real gravity. The coin is thrown upward, stalls, then drops away.',
    cost: 120,
    section: 'classic',
  },
  // Lingu Collection
  {
    id: 'baguette',
    name: 'BAGUETTE',
    desc: 'A tiny golden baguette instead of a coin. Earned by mastering 50 French food words — it cannot be bought.',
    cost: 0,
    section: 'lingu',
    earnCondition: '50 French food words',
    cannotBuy: true,
  },
  {
    id: 'sushi-roll',
    name: 'SUSHI ROLL',
    desc: 'A perfectly formed nigiri. Representing the culinary art of Japan, one rice grain at a time.',
    cost: 150,
    section: 'lingu',
  },
];

export function getActiveTokenSkin(): string {
  return localStorage.getItem(TOKEN_SKIN_KEY) || 'classic';
}

export function setActiveTokenSkin(id: string): void {
  localStorage.setItem(TOKEN_SKIN_KEY, id);
}

export function getOwnedTokenSkins(): Set<string> {
  try {
    const raw = localStorage.getItem(TOKEN_SKINS_OWNED_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(['classic', ...arr]);
  } catch {
    return new Set(['classic']);
  }
}

export function addOwnedTokenSkin(id: string): void {
  const owned = getOwnedTokenSkins();
  owned.add(id);
  localStorage.setItem(
    TOKEN_SKINS_OWNED_KEY,
    JSON.stringify([...owned].filter((s) => s !== 'classic')),
  );
}
