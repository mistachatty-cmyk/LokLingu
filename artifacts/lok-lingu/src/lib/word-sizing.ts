/* ------------------------------------------------------------------
   Responsive sizing for the big game word.

   `.game-word` used a fixed `text-7xl md:text-9xl` regardless of what was
   actually being displayed. That was fine for short entries like "dos" or
   "hola", but every theme applies its own font at wildly different
   character widths (Unbounded and Major Mono Display run far wider per
   letter than Outfit or Barlow Condensed), and several categories —
   greetings especially, after this session's expansion — now include
   real multi-word phrases like "buenas noches" and "guten Nachmittag".
   A fixed size has no way to accommodate both "sí" and a compound German
   greeting in the same box; one of them was always going to be wrong.

   The fix scales the ceiling down as the word gets longer rather than
   picking one size that compromises for everything. `clamp()` still
   drives the viewport-responsive floor/ceiling — this only pulls the
   ceiling in when the content demands it.
------------------------------------------------------------------ */

/** Below this length, the word gets the full display size. */
const FULL_SIZE_CHARS = 8;
/** Above this length, sizing stops shrinking further — it wraps instead. */
const MIN_SIZE_CHARS = 24;

const MOBILE_MAX_REM = 4.5; // text-7xl
const DESKTOP_MAX_REM = 8; // text-9xl
const FLOOR_REM = 2.25; // never smaller than this, however long the word

function shrinkFactor(length: number): number {
  if (length <= FULL_SIZE_CHARS) return 1;
  if (length >= MIN_SIZE_CHARS) return FLOOR_REM / DESKTOP_MAX_REM;
  const t = (length - FULL_SIZE_CHARS) / (MIN_SIZE_CHARS - FULL_SIZE_CHARS);
  // Ease out — the first extra characters cost more size than the last,
  // which matches how cramped a box actually feels.
  return 1 - t * t * (1 - FLOOR_REM / DESKTOP_MAX_REM);
}

/**
 * Two CSS custom-property values — mobile and desktop — matching the
 * `text-7xl` / `md:text-9xl` breakpoint the game word already used, each
 * pulled in by `shrinkFactor` when the content is long. Returned as CSS
 * variables rather than a single value because Tailwind's original sizing
 * was a hard breakpoint swap, not a fluid clamp, and preserving that step
 * (rather than inventing a new fluid curve) is what keeps short words
 * looking exactly like they did before this change.
 */
export function gameWordFontSize(word: string): { mobile: string; desktop: string } {
  const factor = shrinkFactor(word.length);
  const mobile = Math.max(FLOOR_REM, MOBILE_MAX_REM * factor);
  const desktop = Math.max(FLOOR_REM, DESKTOP_MAX_REM * factor);
  return {
    mobile: `clamp(${FLOOR_REM}rem, 15vw, ${mobile}rem)`,
    desktop: `clamp(${FLOOR_REM}rem, 11vw, ${desktop}rem)`,
  };
}
