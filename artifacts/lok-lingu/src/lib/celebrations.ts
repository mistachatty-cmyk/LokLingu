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
