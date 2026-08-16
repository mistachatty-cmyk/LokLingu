/**
 * Rasterised glyph cache, shared by every canvas particle surface.
 *
 * Drawing an emoji with `fillText` is meaningfully more expensive than
 * blitting a pre-rendered bitmap, and the cost is paid per particle per
 * frame. Rendering each glyph once and reusing it turns that into a
 * `drawImage`, which is close to free.
 */

const cache = new Map<string, HTMLCanvasElement>();

const EMOJI_FONT =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/**
 * Returns a canvas containing `glyph` drawn at roughly `size` px.
 *
 * Sizes are bucketed to even numbers: a one-pixel difference is invisible
 * at these scales and would otherwise let the cache grow without bound as
 * particles pick continuous random sizes.
 */
export function getSprite(glyph: string, size: number): HTMLCanvasElement | null {
  const bucket = Math.max(6, Math.round(size / 2) * 2);
  const key = `${glyph}@${bucket}`;
  const hit = cache.get(key);
  if (hit) return hit;

  if (typeof document === 'undefined') return null;
  // Emoji routinely overflow their nominal em box, so pad generously
  // rather than clipping the glyph's edges.
  const pad = Math.ceil(bucket * 0.35);
  const dim = bucket + pad * 2;
  const c = document.createElement('canvas');
  c.width = dim;
  c.height = dim;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.font = `${bucket}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, dim / 2, dim / 2);
  cache.set(key, c);
  return c;
}
