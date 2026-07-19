import { useEffect, useState } from "react";

export type Theme = "theme-neon" | "theme-sand" | "theme-eink";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("lok-lingu-theme") as Theme) || "theme-neon";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("theme-neon", "theme-sand", "theme-eink");
    root.classList.add(theme);
    localStorage.setItem("lok-lingu-theme", theme);
  }, [theme]);

  return { theme, setTheme };
}
