export type CelebrationIntensity = 'mini' | 'big' | 'suBang';

export type CelebrationAnimType = 'burst' | 'rain' | 'float' | 'wave' | 'bounce' | 'shake' | 'stampede' | 'glass';

export type SoundProfile = 'burst' | 'thud' | 'clink' | 'whoosh' | 'boing' | 'chime' | 'splash' | 'gong' | 'rattle' | 'ascend' | 'tri-tone' | 'pop' | 'swoosh' | 'lock' | 'complete';

export interface CelebrationDef {
  id: string;
  name: string;
  label: string;
  desc: string;
  tier: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  emojiList: string[];
  type: CelebrationAnimType;
  soundProfile: SoundProfile;
  bgColor: string;
  /** Gated behind a prestige tier — undefined means always available. */
  unlockPrestige?: number;
}

export const INTENSITY_CONFIG = {
  mini: { count: 15, duration: 1.5, emojiScale: 1.5 },
  big: { count: 35, duration: 3, emojiScale: 2 },
  suBang: { count: 70, duration: 5, emojiScale: 3 },
} as const;

export const CELEBRATIONS: CelebrationDef[] = [
  {
    id: 'pinata',
    name: 'PIÑATA',
    label: 'Piñata Burst',
    desc: 'A rainbow piñata cracks open, showering candy everywhere.',
    tier: 'A',
    emojiList: ['🍬', '🍭', '🍫', '🍩', '🎠'],
    type: 'burst',
    soundProfile: 'burst',
    bgColor: '#ff6b9d',
  },
  {
    id: 'stampede',
    name: 'STAMPEDE',
    label: 'Animal Stampede',
    desc: 'A wild herd thunders across the screen.',
    tier: 'A',
    emojiList: ['🐄', '🐑', '🐖', '🐔', '🦊'],
    type: 'stampede',
    soundProfile: 'thud',
    bgColor: '#8B6914',
  },
  {
    id: 'tsunami',
    name: 'TSUNAMI',
    label: 'Tsunami Wave',
    desc: 'A giant wave crashes with sea creatures riding it.',
    tier: 'B',
    emojiList: ['🌊', '🐟', '🐠', '🐡', '🦈'],
    type: 'wave',
    soundProfile: 'splash',
    bgColor: '#1a6b9d',
  },
  {
    id: 'ghostly',
    name: 'GHOSTLY',
    label: 'Ghostly Float',
    desc: 'Ghosts and lanterns drift through the air.',
    tier: 'B',
    emojiList: ['👻', '🏮', '🎑', '🕯️', '✨'],
    type: 'float',
    soundProfile: 'whoosh',
    bgColor: '#2a1a3a',
  },
  {
    id: 'pogo',
    name: 'POGO',
    label: 'Pogo Party',
    desc: 'Everything bounces wildly like pogo sticks.',
    tier: 'C',
    emojiList: ['🏀', '🎉', '❗', '💥', '🔄'],
    type: 'bounce',
    soundProfile: 'boing',
    bgColor: '#cc4422',
  },
  {
    id: 'cup-rain',
    name: 'CUP RAIN',
    label: 'Cup Rain',
    desc: 'Cups of tea and coffee rain down from the sky.',
    tier: 'C',
    emojiList: ['☕', '💦', '🥤', '🧊', '🍵'],
    type: 'rain',
    soundProfile: 'clink',
    bgColor: '#5a3a1a',
  },
  {
    id: 'balloons',
    name: 'BALLOONS',
    label: 'Balloon Ascension',
    desc: 'A bouquet of balloons rises triumphantly.',
    tier: 'D',
    emojiList: ['🎈', '🎉', '🎊', '🎈', '🎀'],
    type: 'float',
    soundProfile: 'ascend',
    bgColor: '#882288',
  },
  {
    id: 'jelly',
    name: 'JELLY',
    label: 'Jelly Wobble',
    desc: 'Everything wobbles like jelly on a plate.',
    tier: 'D',
    emojiList: ['🍮', '✨', '🔮', '🫧', '🌈'],
    type: 'shake',
    soundProfile: 'rattle',
    bgColor: '#cc4488',
  },
  {
    id: 'dragon',
    name: 'DRAGON',
    label: 'Eastern Dragon',
    desc: 'A fiery dragon coils through the screen.',
    tier: 'E',
    emojiList: ['🐉', '🔥', '🏯', '🎇', '🎴'],
    type: 'burst',
    soundProfile: 'gong',
    bgColor: '#661100',
  },
  {
    id: 'kami',
    name: 'KAMI',
    label: 'Kami Blessing',
    desc: 'Torii gates and paper cranes float peacefully.',
    tier: 'E',
    emojiList: ['⛩️', '🏮', '🕊️', '🎋', '🌸'],
    type: 'float',
    soundProfile: 'chime',
    bgColor: '#2a1a0a',
  },
  {
    id: 'apple-note',
    name: 'APPLE NOTE',
    label: 'Apple Note',
    desc: 'A crisp musical note celebration — clean, precise, satisfying.',
    tier: 'F',
    emojiList: ['🎵', '🎶', '🔊', '♪', '♫'],
    type: 'glass',
    soundProfile: 'tri-tone',
    bgColor: '#1a1a2e',
  },
  {
    id: 'apple-sparkle',
    name: 'APPLE SPARKLE',
    label: 'Apple Sparkle',
    desc: 'A shimmering burst of light, like a perfectly polished Apple animation.',
    tier: 'F',
    emojiList: ['✨', '💫', '⭐', '🌟', '🪩'],
    type: 'glass',
    soundProfile: 'pop',
    bgColor: '#16213e',
  },
  {
    id: 'apple-memoji',
    name: 'APPLE MEMOJI',
    label: 'Apple Memoji',
    desc: 'An explosion of memoji-style faces — vibrant, smooth, fun.',
    tier: 'F',
    emojiList: ['😊', '🥳', '🎉', '💎', '🌟'],
    type: 'glass',
    soundProfile: 'complete',
    bgColor: '#0f3460',
  },
  // Prestige-exclusive celebrations — gated by unlockPrestige, checked in
  // the celebrations.tsx picker. Reuses existing animation types/sounds;
  // no new effect machinery, just prestige-tier flavor entries.
  {
    id: 'prestige-circuit',
    name: 'CIRCUIT SURGE',
    label: 'Circuit Surge',
    desc: 'Bronze-to-gold current arcs across the screen. Prestige exclusive.',
    tier: 'F',
    emojiList: ['⚡', '🥉', '🥈', '🥇', '💠'],
    type: 'burst',
    soundProfile: 'ascend',
    bgColor: '#3a2a1a',
    unlockPrestige: 3,
  },
  {
    id: 'prestige-lattice',
    name: 'DIAMOND LATTICE',
    label: 'Diamond Lattice',
    desc: 'A crystalline shockwave, faceted light everywhere. Prestige exclusive.',
    tier: 'F',
    emojiList: ['💎', '🔷', '🔶', '✨', '🌠'],
    type: 'glass',
    soundProfile: 'gong',
    bgColor: '#1a2a3a',
    unlockPrestige: 6,
  },
  {
    id: 'prestige-nova',
    name: 'NOVA',
    label: 'Nova',
    desc: 'The screen goes supernova — the last and brightest celebration. Prestige 10 exclusive.',
    tier: 'F',
    emojiList: ['🌌', '🌠', '💫', '⭐', '✨'],
    type: 'wave',
    soundProfile: 'ascend',
    bgColor: '#0a0a2a',
    unlockPrestige: 10,
  },
];

export const CELEBRATION_BY_ID = Object.fromEntries(
  CELEBRATIONS.map((c) => [c.id, c]),
) as Record<string, CelebrationDef>;

// ── Purchasable shop items ───────────────────────────────────────────────────

export interface ShopCelebrationDef {
  id: string;
  name: string;
  emoji: string;
  price: number;
  desc: string;
  /** Animation type borrowed from CelebrationAnimType, for if it ever plays */
  type: CelebrationAnimType;
  bgColor: string;
}

export const SHOP_CELEBRATIONS: ShopCelebrationDef[] = [
  { id: 'jollof-rice', name: 'JOLLOF RICE', emoji: '🍲', price: 150, desc: 'A heaping bowl of jollof rice. The pride of West Africa, bringing warmth to every winning streak.', type: 'burst', bgColor: '#8B2200' },
  { id: 'pizza-slice', name: 'PIZZA SLICE', emoji: '🍕', price: 100, desc: 'A slice of authentic Italian pizza. Timeless, universally loved, and worth every word.', type: 'burst', bgColor: '#994411' },
  { id: 'taco', name: 'TACO', emoji: '🌮', price: 100, desc: 'A delicious taco. The spirit of Mexico in every correct answer.', type: 'burst', bgColor: '#886622' },
  { id: 'dumpling', name: 'DUMPLING', emoji: '🥟', price: 120, desc: 'A steamed dumpling. Brought to you by the cultures of East and Southeast Asia.', type: 'burst', bgColor: '#557788' },
  { id: 'fleur-de-lis', name: 'FLEUR-DE-LIS', emoji: '⚜️', price: 180, desc: 'An ornate golden flower. Symbol of elegance and nobility across cultures.', type: 'float', bgColor: '#665500' },
  { id: 'lotus-blossom', name: 'LOTUS BLOSSOM', emoji: '🪷', price: 180, desc: 'A sacred lotus in full bloom. Representing enlightenment and purity.', type: 'float', bgColor: '#883388' },
  { id: 'disco-ball', name: 'DISCO BALL', emoji: '🪩', price: 200, desc: 'A shimmering disco ball. Let the good times roll with every correct word.', type: 'burst', bgColor: '#334455' },
  { id: 'matryoshka', name: 'MATRYOSHKA', emoji: '🪆', price: 150, desc: 'A Russian nesting doll. Layers of tradition in every answer.', type: 'burst', bgColor: '#992211' },
  { id: 'diamond', name: 'DIAMOND', emoji: '💎', price: 250, desc: 'A brilliant diamond. Eternal, precious, and earned through dedication.', type: 'burst', bgColor: '#224466' },
  { id: 'rosette', name: 'ROSETTE', emoji: '🏵️', price: 160, desc: 'A delicate rose badge. For those who appreciate the finer things.', type: 'float', bgColor: '#664422' },
  { id: 'star', name: 'STAR', emoji: '⭐', price: 100, desc: 'A shining star. Reach for it with every word you master.', type: 'burst', bgColor: '#664400' },
  { id: 'cherry-blossom', name: 'CHERRY BLOSSOM', emoji: '🌸', price: 140, desc: 'A delicate sakura petal. Beauty in impermanence.', type: 'float', bgColor: '#882244' },
  { id: 'sunflower', name: 'SUNFLOWER', emoji: '🌻', price: 140, desc: 'A field of sunflowers reaching for the sky. Optimism in every word.', type: 'float', bgColor: '#886600' },
  { id: 'anatomical-heart', name: 'ANATOMICAL HEART', emoji: '🫀', price: 180, desc: 'The heart of a true linguist. Raw, vital, and beating for every language.', type: 'burst', bgColor: '#880022' },
  { id: 'peace-fingers', name: 'PEACE FINGERS', emoji: '✌️', price: 120, desc: 'A hand making peace. Spread positivity with every correct answer.', type: 'burst', bgColor: '#226644' },
  { id: 'love-gesture', name: 'LOVE GESTURE', emoji: '🤟', price: 130, desc: 'A hand making the love shape. Celebrate every triumph with heart.', type: 'burst', bgColor: '#882266' },
  { id: 'shaking-power', name: 'SHAKING POWER', emoji: '😤', price: 110, desc: 'A trembling face of determination. Raw energy in action.', type: 'shake', bgColor: '#664433' },
  { id: 'brain-power', name: 'BRAIN POWER', emoji: '🧠', price: 200, desc: 'The ultimate symbol of learning. Every word makes you brighter.', type: 'burst', bgColor: '#553366' },
  { id: 'yuan-bag', name: 'YUAN MONEY BAG', emoji: '💴', price: 175, desc: 'A bag of yuan. Worth its weight in linguistic treasure.', type: 'rain', bgColor: '#226633' },
  { id: 'euro-bag', name: 'EURO MONEY BAG', emoji: '💶', price: 175, desc: 'A bag of euros. European sophistication in token form.', type: 'rain', bgColor: '#003366' },
  { id: 'pound-bag', name: 'POUND MONEY BAG', emoji: '💷', price: 175, desc: 'A bag of pounds. British elegance and value.', type: 'rain', bgColor: '#224466' },
  { id: 'yen-bag', name: 'YEN MONEY BAG', emoji: '💴', price: 175, desc: 'A bag of yen. Eastern prosperity in every answer.', type: 'rain', bgColor: '#664400' },
  { id: 'book-stack', name: 'BOOK STACK', emoji: '📚', price: 190, desc: 'A tower of knowledge. The foundation of every word you learn.', type: 'burst', bgColor: '#334411' },
];

// ── Collaboration items ──────────────────────────────────────────────────────

export interface CollabDef {
  id: string;
  name: string;
  emoji: string;
  price: number;
  desc: string;
  collab: string;
}

export const COLLAB_ITEMS: CollabDef[] = [
  {
    id: 'llamaste',
    name: 'LLAMASTE',
    emoji: '🦙',
    price: 2000,
    desc: 'A mystical llama in a state of zen. A collaboration with The Haicuu Experience — for those who honor the alpaca within. Always glows with inner peace.',
    collab: 'The Haicuu Experience',
  },
];

// ── Vault items ──────────────────────────────────────────────────────────────

export interface VaultDef {
  id: string;
  name: string;
  price: number | null; // null = cannot be bought (level-gated)
  requiredLevel?: number;
  desc: string;
  tag: string;
}

export const VAULT_ITEMS: VaultDef[] = [
  {
    id: 'vault',
    name: 'THE VAULT',
    price: 400,
    desc: 'Every coin you earn falls to the floor of the screen and stays there, piling up as you play. Clears when the run ends.',
    tag: 'ULTIMATE',
  },
  {
    id: 'eternal-vault',
    name: 'THE ETERNAL VAULT',
    price: null,
    requiredLevel: 84,
    desc: 'Your hoard never clears. Coins carry over from match to match and keep stacking for as long as you keep counting. Earned at level 84 — it cannot be bought.',
    tag: 'ULTIMATE',
  },
];

// ── Ownership helpers ────────────────────────────────────────────────────────

export const OWNED_SHOP_CELEBRATIONS_KEY = 'lok-lingu-owned-shop-celebrations';
export const OWNED_COLLABS_KEY = 'lok-lingu-owned-collabs';
export const OWNED_VAULTS_KEY = 'lok-lingu-owned-vaults';

function readOwnedSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function addToOwnedSet(key: string, id: string): void {
  const s = readOwnedSet(key);
  s.add(id);
  localStorage.setItem(key, JSON.stringify([...s]));
}

export const getOwnedShopCelebrations = () => readOwnedSet(OWNED_SHOP_CELEBRATIONS_KEY);
export const addOwnedShopCelebration = (id: string) => addToOwnedSet(OWNED_SHOP_CELEBRATIONS_KEY, id);

export const getOwnedCollabs = () => readOwnedSet(OWNED_COLLABS_KEY);
export const addOwnedCollab = (id: string) => addToOwnedSet(OWNED_COLLABS_KEY, id);

export const getOwnedVaults = () => readOwnedSet(OWNED_VAULTS_KEY);
export const addOwnedVault = (id: string) => addToOwnedSet(OWNED_VAULTS_KEY, id);

// ── Token balance (separate from lifetime cumulative total) ───────────────────

export const TOKEN_BALANCE_KEY = 'lok-lingu-tokens';

/** Returns spendable balance. First call migrates existing lifetime tokens. */
export function getTokenBalance(): number {
  if (localStorage.getItem(TOKEN_BALANCE_KEY) === null) {
    // Seed from lifetime tokens so existing players keep their earned balance
    const lifetime = parseInt(localStorage.getItem('lok-lingu-lifetime-tokens') || '0');
    localStorage.setItem(TOKEN_BALANCE_KEY, String(lifetime));
    return lifetime;
  }
  return parseInt(localStorage.getItem(TOKEN_BALANCE_KEY) || '0');
}

export function addTokenBalance(amount: number): void {
  const current = getTokenBalance();
  localStorage.setItem(TOKEN_BALANCE_KEY, String(Math.max(0, current + amount)));
}

export function spendTokenBalance(amount: number): boolean {
  const current = getTokenBalance();
  if (current < amount) return false;
  localStorage.setItem(TOKEN_BALANCE_KEY, String(current - amount));
  return true;
}

// ── Shop celebration → CelebrationDef converter ───────────────────────────────

function soundForAnimType(type: CelebrationAnimType): SoundProfile {
  switch (type) {
    case 'burst': return 'burst';
    case 'float': return 'whoosh';
    case 'rain':  return 'splash';
    case 'shake': return 'rattle';
    case 'stampede': return 'thud';
    case 'wave':  return 'splash';
    case 'bounce': return 'boing';
    case 'glass': return 'clink';
    default:      return 'burst';
  }
}

export function shopCelebToDef(item: ShopCelebrationDef): CelebrationDef {
  const word = item.name.charAt(0) + item.name.slice(1).toLowerCase();
  return {
    id:   item.id,
    name: item.name,
    label: word,
    desc: item.desc,
    tier: 'A',
    emojiList: [item.emoji, item.emoji, item.emoji, item.emoji, item.emoji],
    type: item.type,
    soundProfile: soundForAnimType(item.type),
    bgColor: item.bgColor,
  };
}

/** All celebrations including purchasable shop items. */
export const ALL_CELEBRATIONS: CelebrationDef[] = [
  ...CELEBRATIONS,
  ...SHOP_CELEBRATIONS.map(shopCelebToDef),
];

/** Lookup map covering both base and shop celebrations. */
export const ALL_CELEBRATION_BY_ID: Record<string, CelebrationDef> = {
  ...CELEBRATION_BY_ID,
  ...Object.fromEntries(SHOP_CELEBRATIONS.map((item) => [item.id, shopCelebToDef(item)])),
};
