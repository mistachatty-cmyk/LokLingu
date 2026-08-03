import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const POP_EMOJIS = ['✨', '⭐', '💫', '🎯', '💥', '🌟', '⚡'];

interface PopParticle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  angle: number;
  scale: number;
}

export function WordPop({ onComplete }: { onComplete: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onComplete();
    }, 500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const particles = useMemo(() => {
    const items: PopParticle[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      items.push({
        id: i,
        emoji: POP_EMOJIS[i % POP_EMOJIS.length],
        x: Math.cos(angle) * (40 + Math.random() * 30),
        y: Math.sin(angle) * (40 + Math.random() * 30) - 20,
        angle: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
      });
    }
    return items;
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: p.x,
              y: p.y,
              scale: [0, p.scale, p.scale * 0.5],
              opacity: [1, 1, 0],
              rotate: p.angle,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute text-lg select-none"
          >
            {p.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
