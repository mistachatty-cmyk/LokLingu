/* ------------------------------------------------------------------
   Word effects — the shared animation vocabulary for the prompt word.

   Before this, the word had exactly two states: a brightness flash on a
   hit and a colour swap on a miss. Everything expressive in the app
   lived in particles *around* the word while the word itself sat still.

   This is the opposite approach: the word is the thing the player is
   actually looking at, so it should be the thing that moves. One
   vocabulary of named effects, rendered by `GameWord`, drawn on by three
   different callers:

     - base feedback   — ripple on a hit, melt on a miss, tumble on entry
     - companions      — a signature flourish per companion (see
                         companion-traits.ts)
     - events          — a beat's own presentation (blur, glitch, drift)

   Two render modes:

     per-letter  — the word is split into spans and each gets a staggered
                   delay. Covers everything below except `bend`.
     whole-word  — a single transform on the block (stretch/squash).

   `bend` deserves a note: a true arc wants an SVG <textPath>, which
   means duplicating the font-size/colour/theme cascade that `.game-word`
   already owns. A per-letter parabola (vertical offset + rotation
   proportional to distance from centre) reads as a genuine arc at these
   sizes for a fraction of the complexity, so that is what this does.

   THE RULE (docs/COMPANIONS.md, as amended): a passive effect may never
   reduce legibility at any frame. Every keyframe below returns the
   letter to full opacity and readable position. Only an *event* may
   obscure the word, and only while answering is blocked.
------------------------------------------------------------------ */

import type { TargetAndTransition, Transition } from 'framer-motion';

export type WordEffect =
  | 'none'
  | 'wave'
  | 'bend'
  | 'ripple'
  | 'stretch'
  | 'squash'
  | 'jitter'
  | 'drift'
  | 'orbit'
  | 'tumble'
  | 'typewriter'
  | 'melt'
  | 'rise'
  | 'shatter'
  | 'glitch'
  | 'chunk';

/**
 * How the word is shown for one turn. Display-only: nothing here can
 * change what counts as a correct answer — `game.tsx` matches against
 * `currentWordRef.current.word`, which this never touches.
 */
export interface WordPresentation {
  /** Display-only override of the rendered string. */
  text?: string;
  effect?: WordEffect;
  /** px of blur. */
  blur?: number;
  /** Multiplier on the font-size ceiling (GameWord's existing `scale`). */
  scale?: number;
  flipX?: boolean;
  invert?: boolean;
  /** 0–1 coverage of an obscuring mask (scratch card, fog). Event-only. */
  maskPct?: number;
  /** Big-Mi: render these groups as units instead of single letters. */
  chunks?: string[];
  tint?: string;
}

/** Effects that run continuously rather than playing once and settling. */
const LOOPING: ReadonlySet<WordEffect> = new Set(['wave', 'jitter', 'orbit']);

export function isLoopingEffect(effect: WordEffect | undefined): boolean {
  return !!effect && LOOPING.has(effect);
}

/** Effects rendered as one transform on the whole block, not per letter. */
const WHOLE_WORD: ReadonlySet<WordEffect> = new Set(['stretch', 'squash']);

export function isWholeWordEffect(effect: WordEffect | undefined): boolean {
  return !!effect && WHOLE_WORD.has(effect);
}

/**
 * Deterministic pseudo-random in [0,1) from an integer seed. Used by the
 * scatter-style effects so a given letter jitters the same way on every
 * frame of the same animation instead of thrashing between renders.
 */
function seeded(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Motion for one letter of a per-letter effect.
 *
 * @param i     letter index
 * @param total letter count, so effects can measure from the centre
 */
export function letterMotion(
  effect: WordEffect,
  i: number,
  total: number,
): { animate: TargetAndTransition; transition: Transition } {
  // Signed distance from the word's centre, normalised to roughly [-1, 1].
  const centre = (total - 1) / 2;
  const fromCentre = centre === 0 ? 0 : (i - centre) / centre;
  const rand = seeded(i);

  switch (effect) {
    case 'wave':
      return {
        animate: { y: [0, -8, 0] },
        transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.07 },
      };

    case 'bend':
      // Parabolic drop plus a matching tilt — the ends hang lower and lean
      // outward, which is what sells it as an arc rather than a bounce.
      return {
        animate: {
          y: (1 - fromCentre * fromCentre) * -10,
          rotate: fromCentre * 12,
        },
        transition: { duration: 0.45, ease: 'easeOut' },
      };

    case 'ripple':
      return {
        animate: { scale: [1, 1.35, 1], y: [0, -6, 0] },
        transition: { duration: 0.45, ease: 'easeOut', delay: i * 0.045 },
      };

    case 'jitter':
      return {
        animate: { x: [0, -1.5, 1.5, -1, 0], y: [0, 1, -1, 0.5, 0] },
        transition: { duration: 0.35, repeat: Infinity, ease: 'linear', delay: rand * 0.2 },
      };

    case 'drift':
      return {
        animate: { x: [0, fromCentre * 22, 0], opacity: [1, 0.75, 1] },
        transition: { duration: 1.1, ease: 'easeInOut' },
      };

    case 'orbit':
      return {
        animate: {
          y: [0, -6, 0, 6, 0],
          x: [0, 4, 0, -4, 0],
          rotate: [0, 8, 0, -8, 0],
        },
        transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 },
      };

    case 'tumble':
      return {
        animate: { y: [-24, 0], rotate: [-35, 0], opacity: [0, 1] },
        transition: { duration: 0.4, ease: 'backOut', delay: i * 0.045 },
      };

    case 'typewriter':
      return {
        animate: { opacity: [0, 1] },
        transition: { duration: 0.12, ease: 'linear', delay: i * 0.05 },
      };

    case 'melt':
      // Sags and dims, then recovers — a miss should feel deflating but
      // must not leave the word unreadable (see THE RULE above).
      return {
        animate: { y: [0, 9 + rand * 5, 0], opacity: [1, 0.55, 1], rotate: [0, rand * 8 - 4, 0] },
        transition: { duration: 0.6, ease: 'easeInOut', delay: i * 0.03 },
      };

    case 'rise':
      return {
        animate: { y: [0, -12, 0], scale: [1, 1.1, 1] },
        transition: { duration: 0.5, ease: 'easeOut', delay: i * 0.04 },
      };

    case 'shatter':
      return {
        animate: {
          x: [0, fromCentre * 60 + (rand * 20 - 10), 0],
          y: [0, rand * 50 - 25, 0],
          rotate: [0, rand * 90 - 45, 0],
        },
        transition: { duration: 0.8, ease: 'easeOut' },
      };

    case 'glitch':
      return {
        animate: { x: [0, -3, 3, 0], opacity: [1, 0.4, 1, 0.7, 1] },
        transition: { duration: 0.3, repeat: 3, ease: 'linear', delay: rand * 0.15 },
      };

    case 'chunk':
      // Groups breathe apart so the syllable boundaries read clearly —
      // Big-Mi's reading aid. Rendered over chunks, not letters.
      return {
        animate: { x: [0, fromCentre * 10, 0] },
        transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
      };

    case 'none':
    default:
      return { animate: {}, transition: { duration: 0 } };
  }
}

/** Motion for a whole-word effect (`stretch` / `squash`). */
export function blockMotion(
  effect: WordEffect,
): { animate: TargetAndTransition; transition: Transition } {
  switch (effect) {
    case 'stretch':
      return {
        animate: { scaleX: [1, 1.25, 1] },
        transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'squash':
      return {
        animate: { scaleY: [1, 0.8, 1], scaleX: [1, 1.1, 1] },
        transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
      };
    default:
      return { animate: {}, transition: { duration: 0 } };
  }
}

/**
 * Splits a word for per-letter rendering. Spaces are kept as their own
 * units so multi-word prompts ("hasta luego") don't collapse.
 * `chunks` wins when present — that's Big-Mi handing us a syllable split.
 */
export function splitWord(word: string, chunks?: string[]): string[] {
  if (chunks && chunks.length > 0) return chunks;
  return Array.from(word);
}

/** Maps base game feedback onto the effect vocabulary. */
export function feedbackEffect(feedback: 'idle' | 'hit' | 'miss'): WordEffect {
  if (feedback === 'hit') return 'ripple';
  if (feedback === 'miss') return 'melt';
  return 'none';
}
