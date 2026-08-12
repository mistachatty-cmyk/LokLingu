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
 * Reads the active token skin from localStorage to change appearance.
 */
export function TokenEarnedLabel({ animKey, label }: TokenEarnedLabelProps) {
  const prefersReducedMotion = useReducedMotion();

  // When animKey is 0 the game hasn't started yet — show nothing.
  if (prefersReducedMotion || animKey === 0) return null;

  const isMilestone = label.includes('🎁');
  const activeSkin = localStorage.getItem('lok-lingu-token-skin') || 'classic';

  // Choose coin emoji based on skin
  const coinEmoji =
    activeSkin === 'baguette'    ? '🥖' :
    activeSkin === 'sushi-roll'  ? '🍣' :
    '🪙';

  // Visual filter for glow/neon skins
  const skinFilter =
    activeSkin === 'aurora-glow'
      ? 'drop-shadow(0 0 6px rgba(100,200,255,0.85))'
      : activeSkin === 'neon-outline'
        ? 'drop-shadow(0 0 4px rgba(255,50,255,0.9)) drop-shadow(0 0 8px rgba(50,255,255,0.7))'
        : undefined;

  const isJumbo      = activeSkin === 'jumbo';
  const isSupernova  = activeSkin === 'supernova';
  const isFreefall   = activeSkin === 'freefall';

  const initialScale = isMilestone ? 0.5 : isJumbo ? 1.0 : 0.7;
  const finalScale   = isMilestone ? 1.5 : isJumbo ? 2.2 : 1.1;
  const rotations    = isSupernova ? 2880 : isMilestone ? 1080 : 720;
  const flyY         = isMilestone ? -64 : isJumbo ? -80 : isFreefall ? 40 : -48;
  const flyDuration  = isMilestone ? 0.9 : isFreefall ? 0.55 : 0.65;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animKey}
        className="pointer-events-none absolute right-0 top-0 flex flex-col items-center gap-0.5 select-none z-20"
        style={{ perspective: '300px' }}
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 0, y: flyY }}
        transition={{ duration: flyDuration, ease: isFreefall ? 'easeIn' : 'easeOut' }}
        aria-hidden
      >
        {/* 3D spinning coin */}
        <motion.div
          initial={{ rotateY: 0, scale: initialScale }}
          animate={{ rotateY: rotations, scale: finalScale }}
          transition={{ duration: flyDuration * 0.9, ease: 'easeOut' }}
          style={{ display: 'inline-block', transformStyle: 'preserve-3d', filter: skinFilter }}
          className="text-2xl leading-none"
        >
          {coinEmoji}
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
