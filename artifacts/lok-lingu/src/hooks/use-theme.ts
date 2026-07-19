import { useEffect, useState } from "react";

export type Theme =
  // Category A – General
  | "theme-neon"
  | "theme-void"
  | "theme-matrix"
  | "theme-rose"
  | "theme-lavender"
  | "theme-arctic"
  // Category B – Premium
  | "theme-ember"
  | "theme-crimson"
  | "theme-sand"
  | "theme-eink"
  | "theme-phantom"
  | "theme-typewriter"
  // Category C – Ultimate
  | "theme-abyss"
  | "theme-espresso"
  | "theme-cosmos"
  | "theme-electric"
  | "theme-chalk"
  | "theme-onyx"
  // Category D – Animated
  | "theme-aurora"
  | "theme-nebula"
  | "theme-chrome";

export const ALL_THEMES = [
  "theme-neon", "theme-void", "theme-matrix", "theme-rose", "theme-lavender", "theme-arctic",
  "theme-ember", "theme-crimson", "theme-sand", "theme-eink", "theme-phantom", "theme-typewriter",
  "theme-abyss", "theme-espresso", "theme-cosmos", "theme-electric", "theme-chalk", "theme-onyx",
  "theme-aurora", "theme-nebula", "theme-chrome",
] as const;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("lok-lingu-theme") as Theme) || "theme-neon";
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    const root = window.document.documentElement;
    ALL_THEMES.forEach((cls) => root.classList.remove(cls));
    root.classList.add(t);
    localStorage.setItem("lok-lingu-theme", t);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    ALL_THEMES.forEach((cls) => root.classList.remove(cls));
    root.classList.add(theme);
  }, [theme]);

  return { theme, setTheme };
}
