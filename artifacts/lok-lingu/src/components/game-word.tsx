import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { gameWordFontSize } from '@/lib/word-sizing';
import {
  blockMotion,
  feedbackEffect,
  isWholeWordEffect,
  letterMotion,
  splitWord,
  type WordPresentation,
} from '@/lib/word-effects';

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
 * Feedback states:
 *   idle → theme glow, `--word-color`
 *   hit  → primary, plus a per-letter `ripple`
 *   miss → destructive, plus a per-letter `melt`
 *
 * The word is split into per-letter spans so `lib/word-effects.ts`'s
 * vocabulary can animate it. A plain string still renders identically when
 * no effect is active — the spans are inline and carry no styling of their
 * own, so `.game-word`'s theme treatments (including `theme-ultimate`'s
 * glitch) still cascade exactly as before.
 *
 * `presentation` is display-only. `game.tsx` matches spoken input against
 * `currentWordRef.current.word`, which this component never touches, so an
 * event can freely substitute or obscure what is drawn without ever
 * changing what counts as a correct answer.
 */
export function GameWord({
  word,
  translation,
  pronunciation,
  feedback,
  animKey,
  scale = 1,
  className = '',
  presentation,
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
  /** Per-turn display treatment — see lib/word-effects.ts. */
  presentation?: WordPresentation;
}) {
  const prefersReducedMotion = useReducedMotion();

  // Display string and answer target are deliberately separate.
  const shown = presentation?.text ?? word;
  const size = gameWordFontSize(shown ?? '');

  // An explicit effect from a companion or event wins; otherwise the base
  // game's own hit/miss feedback drives the animation.
  const effect = presentation?.effect ?? feedbackEffect(feedback);

  // Reduced motion collapses every effect to a static render. The word is
  // always legible — that rule outranks all of this.
  const active = prefersReducedMotion ? 'none' : effect;
  const perLetter = active !== 'none' && !isWholeWordEffect(active);
  const block = isWholeWordEffect(active) ? blockMotion(active) : null;

  const units = splitWord(shown ?? '', presentation?.chunks);
  const effectiveScale = scale * (presentation?.scale ?? 1);

  // Scale the clamp ceiling rather than the whole expression, so the
  // viewport-responsive floor and vw term still behave.
  const scaleCeiling = (value: string) =>
    effectiveScale === 1
      ? value
      : value.replace(
          /([\d.]+)rem\)$/,
          (_m, rem) => `${(parseFloat(rem) * effectiveScale).toFixed(2)}rem)`,
        );

  const filters = [
    presentation?.blur ? `blur(${presentation.blur}px)` : '',
    presentation?.invert ? 'invert(1)' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.22 }}
        className={`relative flex flex-col items-center ${className}`}
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
            color: presentation?.tint ?? (feedback === 'idle' ? 'var(--word-color)' : undefined),
            ['--word-size-mobile' as string]: scaleCeiling(size.mobile),
            ['--word-size-desktop' as string]: scaleCeiling(size.desktop),
            filter: filters || undefined,
          }}
          // flipX rides in `animate`, not `style` — framer-motion writes the
          // element's `transform` itself, so an inline transform here would
          // be clobbered the moment any effect animates.
          animate={{
            ...(presentation?.flipX ? { scaleX: -1 } : {}),
            ...(prefersReducedMotion
              ? {}
              : block
                ? block.animate
                : feedback === 'hit'
                  ? { filter: ['brightness(1)', 'brightness(1.7)', 'brightness(1)'] }
                  : { filter: 'brightness(1)' }),
          }}
          transition={block ? block.transition : { duration: 0.22, ease: 'easeOut' }}
        >
          {perLetter ? (
            units.map((unit, i) => {
              const m = letterMotion(active, i, units.length);
              return (
                <motion.span
                  // Keyed on the animation identity too, so a new effect
                  // restarts one-shots instead of resuming mid-flight.
                  key={`${animKey}-${active}-${i}`}
                  className="inline-block whitespace-pre"
                  animate={m.animate}
                  transition={m.transition}
                >
                  {unit}
                </motion.span>
              );
            })
          ) : (
            shown
          )}
        </motion.h1>

        {/* Obscuring mask. Event-only: the amendment in docs/EVENTS.md allows
            hiding the word solely while answering is blocked and clearing it
            is the event's win condition. */}
        {presentation?.maskPct !== undefined && presentation.maskPct > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg bg-muted"
            style={{ opacity: Math.min(1, presentation.maskPct) }}
          />
        )}

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
