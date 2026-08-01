/* ------------------------------------------------------------------
   Flag palettes — the source data behind every flag-derived theme.

   Colours are the official/spec flag colours, ordered by how much of the
   flag they cover. `deriveFlagTheme()` turns any entry here into a full
   theme palette, so adding a country is one row, not a hand-tuned theme.
------------------------------------------------------------------ */

export interface FlagPalette {
  /** ISO 3166-1 alpha-2, which is also what the emoji is built from. */
  country: string;
  name: string;
  /** LokLingu language this flag belongs to, when there is one. */
  language?: string;
  /** Dominant first. Two to four entries. */
  colors: string[];
}

export const FLAG_PALETTES: FlagPalette[] = [
  { country: 'ES', name: 'Spain', language: 'es', colors: ['#C60B1E', '#FFC400'] },
  { country: 'MX', name: 'Mexico', language: 'es', colors: ['#006847', '#CE1126', '#FFFFFF'] },
  { country: 'AR', name: 'Argentina', language: 'es', colors: ['#74ACDF', '#FFFFFF', '#F6B40E'] },
  { country: 'CO', name: 'Colombia', language: 'es', colors: ['#FCD116', '#003893', '#CE1126'] },
  { country: 'JP', name: 'Japan', language: 'ja', colors: ['#FFFFFF', '#BC002D'] },
  { country: 'FR', name: 'France', language: 'fr', colors: ['#0055A4', '#FFFFFF', '#EF4135'] },
  { country: 'DE', name: 'Germany', language: 'de', colors: ['#000000', '#DD0000', '#FFCE00'] },
  { country: 'IT', name: 'Italy', language: 'it', colors: ['#009246', '#FFFFFF', '#CE2B37'] },
  { country: 'PT', name: 'Portugal', language: 'pt', colors: ['#006600', '#FF0000', '#FFE900'] },
  { country: 'BR', name: 'Brazil', language: 'pt', colors: ['#009C3B', '#FFDF00', '#002776'] },
  { country: 'CN', name: 'China', language: 'zh', colors: ['#DE2910', '#FFDE00'] },
  { country: 'KR', name: 'South Korea', language: 'ko', colors: ['#FFFFFF', '#CD2E3A', '#0047A0'] },
  { country: 'RU', name: 'Russia', language: 'ru', colors: ['#FFFFFF', '#0039A6', '#D52B1E'] },
  { country: 'IN', name: 'India', language: 'hi', colors: ['#FF9933', '#FFFFFF', '#138808'] },
  { country: 'SA', name: 'Saudi Arabia', language: 'ar', colors: ['#006C35', '#FFFFFF'] },
  { country: 'EG', name: 'Egypt', language: 'ar', colors: ['#CE1126', '#FFFFFF', '#000000'] },
  { country: 'NL', name: 'Netherlands', language: 'nl', colors: ['#AE1C28', '#FFFFFF', '#21468B'] },
  { country: 'SE', name: 'Sweden', language: 'sv', colors: ['#006AA7', '#FECC00'] },
  { country: 'TR', name: 'Turkey', language: 'tr', colors: ['#E30A17', '#FFFFFF'] },
  { country: 'TH', name: 'Thailand', language: 'th', colors: ['#A51931', '#FFFFFF', '#2D2A4A'] },
  { country: 'VN', name: 'Vietnam', language: 'vi', colors: ['#DA251D', '#FFFF00'] },
  { country: 'PL', name: 'Poland', language: 'pl', colors: ['#FFFFFF', '#DC143C'] },
  { country: 'GB', name: 'United Kingdom', language: 'en', colors: ['#012169', '#FFFFFF', '#C8102E'] },
  { country: 'US', name: 'United States', language: 'en', colors: ['#3C3B6E', '#B22234', '#FFFFFF'] },
  { country: 'GR', name: 'Greece', colors: ['#0D5EAF', '#FFFFFF'] },
  { country: 'IE', name: 'Ireland', colors: ['#169B62', '#FFFFFF', '#FF883E'] },
  { country: 'ZA', name: 'South Africa', colors: ['#007A4D', '#FFB612', '#DE3831', '#002395'] },
  { country: 'KE', name: 'Kenya', colors: ['#006600', '#BB0000', '#000000'] },
  { country: 'NG', name: 'Nigeria', colors: ['#008751', '#FFFFFF'] },
  { country: 'ID', name: 'Indonesia', colors: ['#FF0000', '#FFFFFF'] },
  { country: 'PH', name: 'Philippines', colors: ['#0038A8', '#CE1126', '#FCD116'] },
  { country: 'UA', name: 'Ukraine', colors: ['#0057B7', '#FFD700'] },
  { country: 'IL', name: 'Israel', colors: ['#FFFFFF', '#0038B8'] },
  { country: 'NO', name: 'Norway', colors: ['#BA0C2F', '#FFFFFF', '#00205B'] },
  { country: 'CH', name: 'Switzerland', colors: ['#FF0000', '#FFFFFF'] },
];

/** 🇪🇸 from "ES" — regional indicators are 0x1F1E6 + letter index. */
export function flagEmoji(alpha2: string): string {
  const code = alpha2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '🏳️';
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65)),
  );
}

/* ── colour maths ───────────────────────────────────────────────── */

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): Hsl {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Relative luminance, for contrast decisions. */
export function luminance(hex: string): number {
  const m = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(m.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export interface DerivedTheme {
  id: string;
  label: string;
  emoji: string;
  language?: string;
  /** CSS custom property values, ready to write into a stylesheet. */
  vars: Record<string, string>;
  /** Swatch values for the theme picker card. */
  bgHex: string;
  wordHex: string;
  accentHex: string;
}

/**
 * Turns a flag into a usable dark-UI palette.
 *
 * Flags are designed for contrast against sky and cloth, not for reading
 * text on a screen, so we do not use them literally: the darkest colour
 * becomes the ground, the most saturated becomes the accent, and the word
 * colour is whichever remaining colour stays legible on that ground.
 */
export function deriveFlagTheme(p: FlagPalette): DerivedTheme {
  const withMeta = p.colors.map((hex) => ({ hex, hsl: hexToHsl(hex), lum: luminance(hex) }));

  // Ground: darkest colour, pushed well down so any flag works as a backdrop.
  const darkest = [...withMeta].sort((a, b) => a.lum - b.lum)[0];
  const bg = { h: darkest.hsl.h, s: Math.min(darkest.hsl.s, 45), l: 6 };

  // Accent: the most saturated colour that is not near-white.
  const accent =
    [...withMeta]
      .filter((c) => c.hsl.l < 92)
      .sort((a, b) => b.hsl.s - a.hsl.s)[0] ?? withMeta[0];

  // Word: brightest colour with enough saturation to read as "coloured",
  // else a light tint of the accent.
  const bright = [...withMeta].sort((a, b) => b.lum - a.lum)[0];
  const wordHex =
    bright.lum > 0.5 ? bright.hex : `hsl(${accent.hsl.h} ${Math.max(accent.hsl.s, 70)}% 72%)`;

  const primary = { h: accent.hsl.h, s: Math.max(accent.hsl.s, 65), l: 55 };
  const secondaryBase = withMeta.find((c) => c.hsl.h !== accent.hsl.h) ?? accent;
  const secondary = { h: secondaryBase.hsl.h, s: Math.max(secondaryBase.hsl.s, 55), l: 58 };

  const vars: Record<string, string> = {
    '--background': `${bg.h} ${bg.s}% ${bg.l}%`,
    '--foreground': `${bg.h} 15% 94%`,
    '--card': `${bg.h} ${bg.s}% ${bg.l + 5}%`,
    '--card-foreground': `${bg.h} 15% 94%`,
    '--popover': `${bg.h} ${bg.s}% ${bg.l + 5}%`,
    '--popover-foreground': `${bg.h} 15% 94%`,
    '--border': `${primary.h} ${primary.s}% ${Math.max(primary.l - 30, 12)}%`,
    '--card-border': `${primary.h} ${primary.s}% ${Math.max(primary.l - 26, 14)}%`,
    '--popover-border': `${primary.h} ${primary.s}% ${Math.max(primary.l - 26, 14)}%`,
    '--input': `${primary.h} ${Math.min(primary.s, 55)}% ${Math.max(primary.l - 36, 10)}%`,
    '--ring': `${primary.h} ${primary.s}% ${primary.l}%`,
    '--primary': `${primary.h} ${primary.s}% ${primary.l}%`,
    '--primary-foreground': `${bg.h} ${bg.s}% ${bg.l}%`,
    '--secondary': `${secondary.h} ${secondary.s}% ${secondary.l}%`,
    '--secondary-foreground': `${bg.h} ${bg.s}% ${bg.l}%`,
    '--muted': `${bg.h} ${bg.s}% ${bg.l + 10}%`,
    '--muted-foreground': `${bg.h} 10% 62%`,
    '--accent': `${primary.h} ${primary.s}% ${Math.max(primary.l - 34, 10)}%`,
    '--accent-foreground': `${primary.h} ${primary.s}% 90%`,
    '--destructive': '0 90% 55%',
    '--destructive-foreground': '0 0% 100%',
    '--word-color': wordHex,
    '--word-glow': `0 0 20px ${accent.hex}, 0 0 46px ${p.colors[p.colors.length - 1]}`,
  };

  return {
    id: `flag-${p.country.toLowerCase()}`,
    label: `${p.name} · Flag`,
    emoji: flagEmoji(p.country),
    language: p.language,
    vars,
    bgHex: darkest.hex,
    wordHex,
    accentHex: accent.hex,
  };
}

export const DERIVED_FLAG_THEMES = FLAG_PALETTES.map(deriveFlagTheme);
