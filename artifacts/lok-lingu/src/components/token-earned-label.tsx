import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface TokenEarnedLabelProps {
  /** Incremented each time a new token reward fires; drives re-animation. */
  animKey: number;
  /** "+2", "+4", "+25 🎁", etc. */
  label: string;
}

/**
 * A spinning 3D coin that bursts upward from the streak counter after each
 * correct word, showing the tokens earned. Fades and drifts upward, then
 * unmounts. Suppressed automatically when prefers-reduced-motion is active.
 */
export function TokenEarnedLabel({ animKey, label }: TokenEarnedLabelProps) {
  const prefersReducedMotion = useReducedMotion();

  // When animKey is 0 the game hasn't started yet — show nothing.
  if (prefersReducedMotion || animKey === 0) return null;

  const isMilestone = label.includes('🎁');

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animKey}
        className="pointer-events-none absolute right-0 top-0 flex flex-col items-center gap-0.5 select-none z-20"
        style={{ perspective: '300px' }}
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 0, y: isMilestone ? -64 : -48 }}
        transition={{ duration: isMilestone ? 0.9 : 0.65, ease: 'easeOut' }}
        aria-hidden
      >
        {/* 3D spinning coin */}
        <motion.div
          initial={{ rotateY: 0, scale: isMilestone ? 0.5 : 0.7 }}
          animate={{ rotateY: isMilestone ? 1080 : 720, scale: isMilestone ? 1.5 : 1.1 }}
          transition={{ duration: isMilestone ? 0.85 : 0.6, ease: 'easeOut' }}
          style={{ display: 'inline-block', transformStyle: 'preserve-3d' }}
          className="text-2xl leading-none"
        >
          🪙
        </motion.div>

        {/* Amount label */}
        <motion.span
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15, delay: 0.05 }}
          className="text-[11px] font-black uppercase tracking-widest leading-none"
          style={{ color: 'var(--word-color)' }}
        >
          {label}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
}
