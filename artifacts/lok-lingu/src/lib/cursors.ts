import type { CursorId } from "../hooks/use-settings";

// ─────────────────────────────────────────────────────────────────────────────
// SVG cursor data-URIs.  Hotspot is (x y) after the closing quote.
// ─────────────────────────────────────────────────────────────────────────────

const dot = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='5' fill='%2300e5ff' opacity='.9'/%3E%3Ccircle cx='10' cy='10' r='3' fill='white'/%3E%3C/svg%3E") 10 10, crosshair`;

const neonArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='28'%3E%3Cpolygon points='4,4 4,22 9,17 13,25 16,23.5 12,16 19,16' fill='%2300e5ff' stroke='%23003344' stroke-width='1'/%3E%3C/svg%3E") 4 4, pointer`;

const pixel = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='20'%3E%3Crect x='0' y='0' width='3' height='3' fill='white'/%3E%3Crect x='3' y='3' width='3' height='3' fill='white'/%3E%3Crect x='0' y='3' width='3' height='12' fill='white'/%3E%3Crect x='3' y='6' width='3' height='3' fill='white'/%3E%3Crect x='6' y='9' width='3' height='3' fill='white'/%3E%3C/svg%3E") 0 0, default`;

const star = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpolygon points='12,2 14.9,9 22,9.5 16.5,14.5 18.5,21.5 12,17.5 5.5,21.5 7.5,14.5 2,9.5 9.1,9' fill='%23ffdd00' stroke='%23cc8800' stroke-width='1'/%3E%3C/svg%3E") 12 12, pointer`;

const wand = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cline x1='3' y1='21' x2='17' y2='7' stroke='%23aa77ff' stroke-width='2.5' stroke-linecap='round'/%3E%3Cpolygon points='17,7 21,3 22,7 18,8' fill='%23aa77ff'/%3E%3Ccircle cx='5' cy='4' r='1.8' fill='%23ffe066'/%3E%3Ccircle cx='20' cy='15' r='1.2' fill='%23ffe066'/%3E%3Ccircle cx='2' cy='13' r='1' fill='%23ffe066'/%3E%3C/svg%3E") 3 21, pointer`;

export const CURSOR_CSS: Record<CursorId, string> = {
  "default":    "auto",
  "crosshair":  "crosshair",
  "dot":        dot,
  "neon-arrow": neonArrow,
  "pixel":      pixel,
  "star":       star,
  "wand":       wand,
};

// ─────────────────────────────────────────────────────────────────────────────
// Cursor catalogue (for the shop)
// ─────────────────────────────────────────────────────────────────────────────

export interface CursorDef {
  id: CursorId;
  name: string;
  desc: string;
  price: number;       // 0 = free
  emoji: string;       // thumbnail stand-in
  tier: "free" | "standard" | "ultimate";
}

export const CURSORS: CursorDef[] = [
  {
    id: "default", name: "Default", emoji: "↖",
    desc: "Classic OS arrow. Familiar and reliable.",
    price: 0, tier: "free",
  },
  {
    id: "crosshair", name: "Crosshair", emoji: "⊕",
    desc: "Precision targeting reticle. Ready to lock on.",
    price: 0, tier: "free",
  },
  {
    id: "dot", name: "Neon Dot", emoji: "●",
    desc: "Glowing cyan orb. Subtle and modern.",
    price: 500, tier: "standard",
  },
  {
    id: "neon-arrow", name: "Neon Arrow", emoji: "↖̈",
    desc: "Electric cyan pointer with a halo glow.",
    price: 750, tier: "standard",
  },
  {
    id: "pixel", name: "Pixel", emoji: "◻",
    desc: "Retro pixel-art cursor. Old-school vibes.",
    price: 1000, tier: "standard",
  },
  {
    id: "star", name: "Gold Star", emoji: "⭐",
    desc: "Brilliant gold star. You're a winner.",
    price: 1250, tier: "standard",
  },
  {
    id: "wand", name: "Magic Wand", emoji: "🪄",
    desc: "Enchanted wand with sparkles. Ultimate tier.",
    price: 2000, tier: "ultimate",
  },
];

/** Apply a cursor ID to the root element */
export function applyCursor(id: CursorId) {
  const css = CURSOR_CSS[id] ?? "auto";
  document.documentElement.style.cursor = css;
  // Also propagate to all interactive elements via custom property
  document.documentElement.style.setProperty("--cursor", css);
}
