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
  | 'theme-ultimate';

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
