import { useEffect } from 'react';

/**
 * Re-applies the player's custom font overrides on every mount, not just
 * while the Font Overrides panel happens to be open.
 *
 * `FontPicker` applies these inline the moment the player picks one, but
 * that component only exists a few clicks deep in the home screen's
 * Options panel. Without this hook, a hard refresh — or opening /game
 * directly, or just closing and reopening the tab — silently dropped
 * back to the theme's default font, because nothing else in the app ever
 * re-read the saved choice. Call this once near the app root (see
 * `App.tsx`, alongside `useTheme()`) so it runs on every route.
 */
const KEYS = {
  sans: 'lok-lingu-font-sans',
  mono: 'lok-lingu-font-mono',
  word: 'lok-lingu-font-word',
  accent: 'lok-lingu-accent-color',
} as const;

const PROPS = {
  sans: '--app-font-sans',
  mono: '--app-font-mono',
  word: '--word-font',
  accent: '--primary',
} as const;

const EMPHASIS_KEY = 'lok-lingu-word-emphasis';
const EMPHASIS_CLASS = 'word-emphasis-pulse';

export function useCustomFonts(): void {
  useEffect(() => {
    const root = document.documentElement;
    try {
      for (const key of Object.keys(KEYS) as (keyof typeof KEYS)[]) {
        const value = localStorage.getItem(KEYS[key]);
        if (value) root.style.setProperty(PROPS[key], value);
      }
      root.classList.toggle(EMPHASIS_CLASS, localStorage.getItem(EMPHASIS_KEY) === 'true');
    } catch {
      /* storage unavailable — theme defaults apply, nothing to restore */
    }
  }, []);
}
