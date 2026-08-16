import { useMemo } from 'react';
import { motion } from 'framer-motion';

export type ParticleType = 'blossoms' | 'leaves' | 'snowflakes' | 'stars';

const PARTICLE_GLYPHS: Record<ParticleType, string[]> = {
  blossoms: ['🌸', '🌸', '🌸', '🏵️'],
  leaves: ['🍁', '🍂', '🍃'],
  snowflakes: ['❄️', '❅', '❆'],
  stars: ['✨', '⭐', '🌟'],
};

interface Particle {
  id: number;
  glyph: string;
  left: number;      // vw
  size: number;       // px
  duration: number;   // s
  delay: number;      // s
  drift: number;       // px horizontal sway
  rotate: number;      // deg
}

function buildParticles(count: number, type: ParticleType): Particle[] {
  const glyphs = PARTICLE_GLYPHS[type];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    glyph: glyphs[i % glyphs.length],
    left: Math.random() * 100,
    size: 14 + Math.random() * 14,
    duration: 8 + Math.random() * 6,
    delay: Math.random() * 10,
    drift: (Math.random() - 0.5) * 80,
    rotate: (Math.random() - 0.5) * 360,
  }));
}

/**
 * Ambient falling particle effect (cherry blossoms by default). Purely
 * decorative — pointer-events are disabled throughout so it never steals
 * clicks from the page underneath.
 */
export function FallingBlossoms({
  isActive,
  intensity = 'medium',
  particleType = 'blossoms',
}: {
  isActive: boolean;
  intensity?: 'low' | 'medium' | 'high';
  particleType?: ParticleType;
}) {
  const count = intensity === 'low' ? 12 : intensity === 'high' ? 32 : 20;
  const particles = useMemo(
    () => buildParticles(count, particleType),
    [count, particleType],
  );

  if (!isActive) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none z-[5]"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute select-none"
          style={{
            left: `${p.left}vw`,
            top: '-10vh',
            fontSize: p.size,
            willChange: 'transform, opacity',
          }}
          initial={{ y: 0, x: 0, opacity: 0, rotate: 0 }}
          animate={{
            y: ['0vh', '120vh'],
            x: [0, p.drift, -p.drift, 0],
            opacity: [0, 1, 1, 0],
            rotate: [0, p.rotate],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
            times: [0, 0.08, 0.92, 1],
          }}
        >
          {p.glyph}
        </motion.div>
      ))}
    </div>
  );
}
