import type { Theme } from '@/hooks/use-theme';

export interface ThemeVariant {
  id: string;
  themeId: Theme;
  name: string;
  label: string;
  desc: string;
  tier: 'common' | 'rare' | 'epic' | 'legendary';
  changes: {
    bg?: string;
    wordColor?: string;
    wordGlow?: string;
    subColor?: string;
    border?: string;
    font?: string;
  };
}

export const THEME_VARIANTS: ThemeVariant[] = [
  {
    id: 'neon-retro-red',
    themeId: 'theme-neon',
    name: 'RETRO RED',
    label: 'Retro Red',
    desc: 'Classic arcade red-orange glow. Hot and aggressive.',
    tier: 'rare',
    changes: {
      wordColor: '#ff0044',
      wordGlow: '0 0 18px #ff0044, 0 0 40px #cc0033',
      subColor: 'rgba(255,0,68,0.5)',
      border: '#ff0044',
    },
  },
  {
    id: 'neon-cyber-yellow',
    themeId: 'theme-neon',
    name: 'CYBER YELLOW',
    label: 'Cyber Yellow',
    desc: 'Neon yellow-green. Toxic electric pulse.',
    tier: 'rare',
    changes: {
      bg: '#0a0a0f',
      wordColor: '#ccff00',
      wordGlow: '0 0 18px #ccff00, 0 0 40px #88aa00',
      subColor: 'rgba(204,255,0,0.5)',
      border: '#ccff00',
    },
  },
  {
    id: 'neon-violet-storm',
    themeId: 'theme-neon',
    name: 'VIOLET STORM',
    label: 'Violet Storm',
    desc: 'Deep purple neon. Electric storm atmosphere.',
    tier: 'epic',
    changes: {
      wordColor: '#aa44ff',
      wordGlow: '0 0 20px #aa44ff, 0 0 50px #7722cc',
      subColor: 'rgba(170,68,255,0.5)',
      border: '#aa44ff',
    },
  },
  {
    id: 'baskin-strawberry-swirl',
    themeId: 'theme-baskin',
    name: 'STRAWBERRY SWIRL',
    label: 'Strawberry Swirl',
    desc: 'Sweet pink gradient. Creamy strawberry tones.',
    tier: 'epic',
    changes: {
      wordColor: '#ff6b9d',
      wordGlow: '0 0 20px #ff6b9d, 0 0 45px #ff2288',
      subColor: 'rgba(255,107,157,0.6)',
      border: '#ff2288',
    },
  },
  {
    id: 'baskin-mint-chip',
    themeId: 'theme-baskin',
    name: 'MINT CHIP',
    label: 'Mint Chip',
    desc: 'Cool green-teal. Refreshing mint chocolate.',
    tier: 'rare',
    changes: {
      wordColor: '#44ddaa',
      wordGlow: '0 0 18px #44ddaa, 0 0 35px #22aa77',
      subColor: 'rgba(68,221,170,0.5)',
      border: '#44ddaa',
    },
  },
  {
    id: 'baskin-berry-blast',
    themeId: 'theme-baskin',
    name: 'BERRY BLAST',
    label: 'Berry Blast',
    desc: 'Deep purple-berry. Bold fruit punch flavor.',
    tier: 'common',
    changes: {
      wordColor: '#cc44aa',
      wordGlow: '0 0 15px #cc44aa, 0 0 30px #992288',
      subColor: 'rgba(204,68,170,0.5)',
      border: '#cc44aa',
    },
  },
  {
    id: 'matrix-amber',
    themeId: 'theme-matrix',
    name: 'AMBER MATRIX',
    label: 'Amber Matrix',
    desc: 'Warm amber phosphor. Vintage terminal glow.',
    tier: 'epic',
    changes: {
      wordColor: '#ff8800',
      wordGlow: '0 0 20px #ff8800, 0 0 45px #cc6600',
      subColor: 'rgba(255,136,0,0.5)',
      border: '#ff8800',
    },
  },
  {
    id: 'matrix-blue-pill',
    themeId: 'theme-matrix',
    name: 'BLUE PILL',
    label: 'Blue Pill',
    desc: 'Cyan-blue code stream. The story ends.',
    tier: 'rare',
    changes: {
      wordColor: '#00aaff',
      wordGlow: '0 0 18px #00aaff, 0 0 40px #0077cc',
      subColor: 'rgba(0,170,255,0.5)',
      border: '#00aaff',
    },
  },
  {
    id: 'matrix-pink-code',
    themeId: 'theme-matrix',
    name: 'PINK CODE',
    label: 'Pink Code',
    desc: 'Hot pink digital rain. Glitch neon override.',
    tier: 'legendary',
    changes: {
      wordColor: '#ff44aa',
      wordGlow: '0 0 25px #ff44aa, 0 0 55px #cc1177, 0 0 85px #880055',
      subColor: 'rgba(255,68,170,0.5)',
      border: '#ff44aa',
    },
  },
  {
    id: 'void-cosmic-dust',
    themeId: 'theme-void',
    name: 'COSMIC DUST',
    label: 'Cosmic Dust',
    desc: 'Teal-cyan stardrift. Nebula particle glow.',
    tier: 'epic',
    changes: {
      wordColor: '#44ddcc',
      wordGlow: '0 0 20px #44ddcc, 0 0 50px #226688',
      subColor: 'rgba(68,221,204,0.5)',
      border: '#44ddcc',
    },
  },
  {
    id: 'void-blood-moon',
    themeId: 'theme-void',
    name: 'BLOOD MOON',
    label: 'Blood Moon',
    desc: 'Deep crimson eclipse. Ritual red glow.',
    tier: 'rare',
    changes: {
      wordColor: '#cc2244',
      wordGlow: '0 0 18px #cc2244, 0 0 40px #881122',
      subColor: 'rgba(204,34,68,0.5)',
      border: '#cc2244',
    },
  },
  {
    id: 'void-silver-lining',
    themeId: 'theme-void',
    name: 'SILVER LINING',
    label: 'Silver Lining',
    desc: 'Precious silver-white. Hope in the dark.',
    tier: 'legendary',
    changes: {
      wordColor: '#cccccc',
      wordGlow: '0 0 20px rgba(204,204,204,0.6), 0 0 45px rgba(204,204,204,0.3)',
      subColor: 'rgba(204,204,204,0.5)',
      border: '#cccccc',
    },
  },
  {
    id: 'ultimate-onyx-glass',
    themeId: 'theme-ultimate',
    name: 'ONYX GLASS',
    label: 'Onyx Glass',
    desc: 'Darkened liquid glass. Submerged obsidian.',
    tier: 'common',
    changes: {
      bg: '#060608',
      wordColor: '#00ccaa',
      wordGlow: '0 0 15px #00ccaa, 0 0 40px #007766',
      subColor: 'rgba(0,204,170,0.4)',
      border: '#007766',
    },
  },
  {
    id: 'ultimate-rose-glass',
    themeId: 'theme-ultimate',
    name: 'ROSE GLASS',
    label: 'Rose Glass',
    desc: 'Pink-tinted liquid crystal. Elegant warmth.',
    tier: 'rare',
    changes: {
      wordColor: '#ff77aa',
      wordGlow: '0 0 20px #ff77aa, 0 0 50px #cc4488',
      subColor: 'rgba(255,119,170,0.5)',
      border: '#ff77aa',
    },
  },
  {
    id: 'ultimate-apple-silver',
    themeId: 'theme-ultimate',
    name: 'APPLE SILVER',
    label: 'Apple Silver',
    desc: 'True Apple aesthetic. Brushed aluminum glass.',
    tier: 'legendary',
    changes: {
      wordColor: '#e8e8e8',
      wordGlow: '0 0 25px rgba(232,232,232,0.5), 0 0 60px rgba(232,232,232,0.2)',
      subColor: 'rgba(232,232,232,0.5)',
      border: '#e8e8e8',
      font: "'Inter', sans-serif",
    },
  },
];

export function getVariantsForTheme(themeId: string): ThemeVariant[] {
  return THEME_VARIANTS.filter((v) => v.themeId === themeId);
}

export function getVariantById(id: string): ThemeVariant | undefined {
  return THEME_VARIANTS.find((v) => v.id === id);
}

export const ACTIVE_VARIANT_KEY = 'lok-lingu-theme-variant';

export function getActiveVariant(themeId: string): ThemeVariant | null {
  try {
    const raw = localStorage.getItem(ACTIVE_VARIANT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.themeId === themeId) {
      return getVariantById(parsed.variantId) ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export function setActiveVariant(themeId: string, variantId: string | null): void {
  try {
    if (variantId === null) {
      localStorage.removeItem(ACTIVE_VARIANT_KEY);
    } else {
      localStorage.setItem(
        ACTIVE_VARIANT_KEY,
        JSON.stringify({ themeId, variantId }),
      );
    }
  } catch {
    // localStorage may be unavailable
  }
}
