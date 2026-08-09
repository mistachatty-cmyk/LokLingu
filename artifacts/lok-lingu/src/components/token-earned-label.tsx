import { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTokenSkin } from '@/hooks/use-token-skin';
import { usePerfBudget } from '@/hooks/use-perf-budget';
import type { TokenSkin } from '@/lib/token-skins';

interface TokenEarnedLabelProps {
  /** Incremented each time a new token reward fires; drives re-animation. */
  animKey: number;
  /** "+2", "+4", "+25 🎁", etc. */
  label: string;
  /** Override the equipped skin — used by the shop's live preview. */
  skinOverride?: TokenSkin;
  /** Preview mode: centered and fades back to origin. */
  contained?: boolean;
}

/** Pre-computed so the ring is identical every burst and costs nothing per frame. */
const BURST_DIRS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { id: i, x: Math.cos(a), y: Math.sin(a) };
});

/**
 * The coin that pops when tokens are earned, rendered according to the
 * equipped token skin.
 *
 * The `pile` motion is intentionally NOT handled here — it needs to draw
 * across the whole screen and outlive this component's animation, so it
 * lives in `<TokenVaultLayer />`. This returns null for it.
 *
 * Every animation below is transform/opacity only, and particle counts
 * come from the catalog rather than from the score, so the cost of a hit
 * is constant no matter how long the run gets.
 */
export function TokenEarnedLabel({ animKey, label, skinOverride, contained = false }: TokenEarnedLabelProps) {
  const prefersReducedMotion = useReducedMotion();
  const { skin: equipped } = useTokenSkin();
  const skin = skinOverride ?? equipped;

  // Only pay for the frame-time guard when a skin can actually spend it.
  const budget = usePerfBudget(!prefersReducedMotion && skin.motion === 'burst');

  const isMilestone = label.includes('🎁');

  const particles = useMemo(() => {
    if (skin.motion !== 'burst') return [];
    // Halve the ring on a struggling device rather than dropping the
    // effect entirely — the player still gets the skin they paid for.
    const want = skin.particles ?? 0;
    const allowed = budget === 'reduced' ? Math.ceil(want / 2) : want;
    return BURST_DIRS.slice(0, allowed);
  }, [skin.motion, skin.particles, budget]);

  // The vault draws itself elsewhere; nothing to show in the corner.
  if (skin.motion === 'pile') return null;
  if (animKey === 0) return null;

  // Reduced motion still deserves feedback — just static feedback.
  if (prefersReducedMotion) {
    return (
      <span
        key={animKey}
        className={`pointer-events-none select-none text-[11px] font-black uppercase tracking-widest ${
          contained ? 'absolute inset-0 flex items-center justify-center' : 'absolute right-0 top-0'
        }`}
        style={{ color: 'var(--word-color)' }}
        aria-hidden
      >
        {label}
      </span>
    );
  }

  // Preview mode: centered, subtle scale and fade animation
  if (contained) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={animKey}
          className="pointer-events-none absolute inset-0 z-20 flex select-none items-center justify-center flex-col gap-0.5"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: skin.duration, ease: 'easeOut' }}
          aria-hidden
        >
          <div className="relative flex items-center justify-center">
            <span className="text-3xl" style={{ textShadow: skin.outline }}>
              {skin.glyph}
            </span>
          </div>
          <span className="text-[10px] font-bold text-center">{label}</span>
        </motion.div>
      </AnimatePresence>
    );
  }

  const rise = isMilestone ? -64 : -48;
  const target =
    skin.motion === 'fall'
      ? // Thrown up, stalls, then gravity wins. Keyframes with a late
        // easing point read as weight without a physics engine.
        { opacity: [1, 1, 0], y: [0, rise, 140] }
      : { opacity: 0, y: rise };

  const coinScale = skin.scale * (isMilestone ? 1.4 : 1);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animKey}
        className="pointer-events-none absolute right-0 top-0 z-20 flex select-none flex-col items-center gap-0.5"
        style={{ perspective: '300px' }}
        initial={{ opacity: 1, y: 0 }}
        animate={target}
        transition={
          skin.motion === 'fall'
            ? { duration: skin.duration, times: [0, 0.35, 1], ease: ['easeOut', 'easeIn'] }
            : { duration: isMilestone ? skin.duration * 1.3 : skin.duration, ease: 'easeOut' }
        }
        aria-hidden
      >
        <div className="relative flex items-center justify-center">
          {/* Halo — a static gradient behind a moving element. No filter,
              no per-frame paint of its own. */}
          {skin.halo && (
            <motion.span
              className="absolute rounded-full"
              style={{ width: 56, height: 56, backgroundImage: skin.halo, opacity: 0.55 }}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: skin.duration, ease: 'easeOut' }}
            />
          )}

          {/* Burst ring. Fixed count, transform-only, unmounts with the parent. */}
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--word-color)' }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: p.x * 34, y: p.y * 34, opacity: 0, scale: 0.3 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          ))}

          {/* The coin itself. */}
          <motion.div
            initial={{ rotateY: 0, scale: coinScale * 0.6 }}
            animate={{ rotateY: isMilestone ? 1080 : 720, scale: coinScale }}
            transition={{ duration: skin.duration * 0.9, ease: 'easeOut' }}
            style={{
              display: 'inline-block',
              transformStyle: 'preserve-3d',
              textShadow: skin.outline,
            }}
            className="text-2xl leading-none"
          >
            {skin.glyph}
          </motion.div>
        </div>

        <motion.span
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15, delay: 0.05 }}
          className="text-[11px] font-black uppercase leading-none tracking-widest"
          style={{ color: 'var(--word-color)', textShadow: skin.outline }}
        >
          {label}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
}
