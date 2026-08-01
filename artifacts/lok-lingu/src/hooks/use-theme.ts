import { useEffect, useState } from 'react';

export type Theme =
  // Category A – General
  | 'theme-baskin'
  | 'theme-neon'
  | 'theme-void'
  | 'theme-matrix'
  | 'theme-rose'
  | 'theme-lavender'
  | 'theme-arctic'
  | 'theme-sakura'
  // Category B – Premium
  | 'theme-ember'
  | 'theme-crimson'
  | 'theme-sand'
  | 'theme-eink'
  | 'theme-phantom'
  | 'theme-typewriter'
  | 'theme-forest'
  // Category C – Ultimate
  | 'theme-abyss'
  | 'theme-espresso'
  | 'theme-cosmos'
  | 'theme-electric'
  | 'theme-chalk'
  | 'theme-onyx'
  | 'theme-midnight'
  | 'theme-steel'
  // Category D – Animated
  | 'theme-aurora'
  | 'theme-nebula'
  | 'theme-chrome'
  | 'theme-horizon'
  | 'theme-cyberwave'
  | 'theme-ocean'
  | 'theme-embers'
  // Category E – Lingu Tier
  | 'theme-flamenco'
  | 'theme-wabi'
  // Category F – Ultimate
  | 'theme-ultimate'
  // Category G – Feral
  | 'theme-acid-rain'
  | 'theme-vaporwave'
  | 'theme-blacklight'
  | 'theme-magma'
  | 'theme-radioactive'
  | 'theme-bubblegum'
  | 'theme-oil-slick'
  | 'theme-infrared'
  | 'theme-plasma'
  | 'theme-solar-flare'
  | 'theme-glitch'
  | 'theme-toxic-slime'
  | 'theme-deep-sea'
  | 'theme-supernova'
  | 'theme-venom'
  | 'theme-hologram'
  | 'theme-inferno'
  | 'theme-cotton-candy'
  | 'theme-circuit'
  | 'theme-eclipse'
  // Category H – Lingu Culture / Category I – Flags
  | 'theme-kanso'
  | 'theme-shinjuku'
  | 'theme-flamenco-noche'
  | 'theme-azulejo'
  | 'theme-bistro'
  | 'theme-bauhaus'
  | 'theme-rinascimento'
  | 'theme-samovar'
  | 'theme-hanbok'
  | 'theme-qinghua'
  | 'theme-zellige'
  | 'theme-holi'
  | 'theme-delftware'
  | 'theme-lagom'
  | 'theme-iznik'
  | 'theme-wat'
  | 'theme-sen'
  | 'theme-kosciuszko'
  | 'theme-flag-ultimate'
  | 'theme-flag-es'
  | 'theme-flag-ja'
  | 'theme-flag-fr'
  | 'theme-flag-de'
  | 'theme-flag-it'
  | 'theme-flag-pt'
  | 'theme-flag-br'
  | 'theme-flag-zh'
  | 'theme-flag-ko'
  | 'theme-flag-ru'
  | 'theme-flag-in'
  | 'theme-flag-sa'
  | 'theme-flag-nl'
  | 'theme-flag-se'
  | 'theme-flag-tr'
  | 'theme-flag-th'
  | 'theme-flag-vn'
  | 'theme-flag-pl'
  // Category J – Ultra
  | 'theme-aurora-borealis'
  | 'theme-liquid-gold'
  | 'theme-obsidian-prism'
  | 'theme-paper-lantern'
  | 'theme-quantum-foam';

export const ALL_THEMES = [
  'theme-baskin',
  'theme-neon',
  'theme-void',
  'theme-matrix',
  'theme-rose',
  'theme-lavender',
  'theme-arctic',
  'theme-sakura',
  'theme-ember',
  'theme-crimson',
  'theme-sand',
  'theme-eink',
  'theme-phantom',
  'theme-typewriter',
  'theme-forest',
  'theme-abyss',
  'theme-espresso',
  'theme-cosmos',
  'theme-electric',
  'theme-chalk',
  'theme-onyx',
  'theme-midnight',
  'theme-steel',
  'theme-aurora',
  'theme-nebula',
  'theme-chrome',
  'theme-horizon',
  'theme-cyberwave',
  'theme-ocean',
  'theme-embers',
  'theme-flamenco',
  'theme-wabi',
  'theme-ultimate',
  'theme-acid-rain',
  'theme-vaporwave',
  'theme-blacklight',
  'theme-magma',
  'theme-radioactive',
  'theme-bubblegum',
  'theme-oil-slick',
  'theme-infrared',
  'theme-plasma',
  'theme-solar-flare',
  'theme-glitch',
  'theme-toxic-slime',
  'theme-deep-sea',
  'theme-supernova',
  'theme-venom',
  'theme-hologram',
  'theme-inferno',
  'theme-cotton-candy',
  'theme-circuit',
  'theme-eclipse',
  'theme-kanso',
  'theme-shinjuku',
  'theme-flamenco-noche',
  'theme-azulejo',
  'theme-bistro',
  'theme-bauhaus',
  'theme-rinascimento',
  'theme-samovar',
  'theme-hanbok',
  'theme-qinghua',
  'theme-zellige',
  'theme-holi',
  'theme-delftware',
  'theme-lagom',
  'theme-iznik',
  'theme-wat',
  'theme-sen',
  'theme-kosciuszko',
  'theme-flag-ultimate',
  'theme-flag-es',
  'theme-flag-ja',
  'theme-flag-fr',
  'theme-flag-de',
  'theme-flag-it',
  'theme-flag-pt',
  'theme-flag-br',
  'theme-flag-zh',
  'theme-flag-ko',
  'theme-flag-ru',
  'theme-flag-in',
  'theme-flag-sa',
  'theme-flag-nl',
  'theme-flag-se',
  'theme-flag-tr',
  'theme-flag-th',
  'theme-flag-vn',
  'theme-flag-pl',
  'theme-aurora-borealis',
  'theme-liquid-gold',
  'theme-obsidian-prism',
  'theme-paper-lantern',
  'theme-quantum-foam',
] as const;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('lok-lingu-theme') as Theme) || 'theme-baskin';
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    const root = window.document.documentElement;
    ALL_THEMES.forEach((cls) => root.classList.remove(cls));
    root.classList.add(t);
    localStorage.setItem('lok-lingu-theme', t);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    ALL_THEMES.forEach((cls) => root.classList.remove(cls));
    root.classList.add(theme);
  }, [theme]);

  return { theme, setTheme };
}
