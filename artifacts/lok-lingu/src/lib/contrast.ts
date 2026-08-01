/* ------------------------------------------------------------------
   Readability helpers.

   Brand colours are chosen to identify a thing, not to be read as small
   text on a dark ground. Thai red on near-black measured 1.28:1, which is
   effectively invisible. These functions keep the hue — so the colour still
   identifies the language — while lifting lightness until the text is
   actually legible.
------------------------------------------------------------------ */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): Rgb | null {
  const m = hex.trim().replace('#', '');
  if (m.length !== 6 && m.length !== 8) return null;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return { r, g, b };
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const c = parseHex(hex);
  if (!c) return 0;
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function toHsl({ r, g, b }: Rgb) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) * 60;
    else if (max === gg) h = ((bb - rr) / d + 2) * 60;
    else h = ((rr - gg) / d + 4) * 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const seg = Math.floor(((h % 360) + 360) % 360 / 60) % 6;
  const [r1, g1, b1] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][seg];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r1)}${to(g1)}${to(b1)}`;
}

/**
 * Returns `color` if it already meets `min` contrast against `background`,
 * otherwise the same hue lightened (or darkened, on light grounds) until it
 * does. Falls back to plain white/black if the hue cannot get there.
 */
export function readableOn(color: string, background: string, min = 4.5): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  if (contrastRatio(color, background) >= min) return color;

  const { h, s } = toHsl(rgb);
  const bgIsDark = relativeLuminance(background) < 0.18;

  // Walk lightness towards the readable end in small steps.
  for (let step = 0; step <= 100; step += 2) {
    const l = bgIsDark ? Math.min(50 + step, 97) : Math.max(50 - step, 4);
    const candidate = hslToHex(h, Math.max(s, 45), l);
    if (contrastRatio(candidate, background) >= min) return candidate;
  }
  return bgIsDark ? '#ffffff' : '#000000';
}
