import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { gameWordFontSize } from '@/lib/word-sizing';

export type WordFeedback = 'idle' | 'hit' | 'miss';

/**
 * The big prompt word, shared by both game modes.
 *
 * This was previously written inline in `game.tsx` only, and draw mode had
 * grown its own divergent copy — different markup, different feedback (draw
 * had none on the word at all), and a `GlitchText` wrapper that voice mode
 * never had. Anything that reads "the word you're being asked for" now
 * renders through here so the two modes cannot drift apart again.
 *
 * Feedback states, matching voice mode exactly:
 *   idle → theme glow, `--word-color`
 *   hit  → primary, a 1.12 scale pop with a brightness flash
 *   miss → destructive. No shake, no scale — just the colour swap.
 *
 * `theme-ultimate`'s glitch and every other per-theme treatment ride along
 * for free via the `.game-word` class, so there is deliberately no
 * theme-specific branch in here.
 */
export function GameWord({
  word,
  translation,
  pronunciation,
  feedback,
  animKey,
  scale = 1,
  className = '',
}: {
  word: string;
  translation?: string;
  pronunciation?: string;
  feedback: WordFeedback;
  /** Remounts the block so each new word animates in. */
  animKey: string | number;
  /**
   * Multiplier on the font-size ceiling. Draw mode passes <1 because the
   * word shares the screen with a canvas; voice mode leaves it at 1, where
   * the word is the only thing on screen.
   */
  scale?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const size = gameWordFontSize(word ?? '');

  // Scale the clamp ceiling rather than the whole expression, so the
  // viewport-responsive floor and vw term still behave.
  const scaleCeiling = (value: string) =>
    scale === 1
      ? value
      : value.replace(/([\d.]+)rem\)$/, (_m, rem) => `${(parseFloat(rem) * scale).toFixed(2)}rem)`);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.22 }}
        className={`flex flex-col items-center ${className}`}
      >
        <motion.h1
          className={`game-word font-black tracking-tighter capitalize leading-none transition-colors duration-200 ${
            feedback === 'hit'
              ? 'text-primary'
              : feedback === 'miss'
                ? 'text-destructive'
                : 'word-glow'
          }`}
          style={{
            // Must be undefined rather than '' on hit/miss, or this inline
            // value beats the Tailwind colour class.
            color: feedback === 'idle' ? 'var(--word-color)' : undefined,
            ['--word-size-mobile' as string]: scaleCeiling(size.mobile),
            ['--word-size-desktop' as string]: scaleCeiling(size.desktop),
          }}
          animate={
            prefersReducedMotion
              ? {}
              : feedback === 'hit'
                ? { scale: [1, 1.12, 1], filter: ['brightness(1)', 'brightness(1.7)', 'brightness(1)'] }
                : { scale: 1, filter: 'brightness(1)' }
          }
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {word}
        </motion.h1>

        {translation !== undefined && (
          <p className="text-xl md:text-3xl italic opacity-50 mt-5">{translation || '—'}</p>
        )}

        {pronunciation && (
          <p className="text-sm md:text-base font-mono opacity-40 mt-2 tracking-wide">
            {pronunciation}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
