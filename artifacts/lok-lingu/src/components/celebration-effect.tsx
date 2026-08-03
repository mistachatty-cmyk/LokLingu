import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CelebrationDef, CelebrationIntensity, CelebrationAnimType } from '@/lib/celebrations';
import { INTENSITY_CONFIG } from '@/lib/celebrations';

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  delay: number;
  rotate: number;
  scale: number;
}

interface Props {
  celebration: CelebrationDef;
  intensity: CelebrationIntensity;
  onComplete: () => void;
}

function ease(v: string): 'easeIn' | 'easeOut' | 'easeInOut' | 'linear' {
  return v as 'easeIn' | 'easeOut' | 'easeInOut' | 'linear';
}

function getAnim(type: CelebrationAnimType, p: Particle, count: number, duration: number) {
  switch (type) {
    case 'burst':
      return {
        initial: { x: '50%', y: '50%', scale: 0, opacity: 1, rotate: 0 } as const,
        animate: {
          x: `calc(50% + ${(p.x - 0.5) * count * 8}px)`,
          y: `calc(50% + ${(p.y - 0.5) * count * 8}px)`,
          scale: p.scale,
          opacity: 0,
          rotate: p.rotate,
        },
        transition: { duration: duration * 0.8, delay: p.delay, ease: ease('easeOut') },
      };
    case 'rain':
      return {
        initial: { x: `${p.x * 100}%`, y: '-5%', opacity: 0.5, rotate: 0, scale: 0.5 } as const,
        animate: {
          x: `${(p.x + (Math.random() - 0.5) * 0.08) * 100}%`,
          y: '105%',
          opacity: [0.5, 1, 1, 0],
          rotate: p.rotate % 360,
          scale: p.scale,
        },
        transition: { duration: duration * (0.4 + p.x * 0.6), delay: p.delay * 0.3, ease: ease('easeIn') },
      };
    case 'float':
      return {
        initial: { x: `${p.x * 100}%`, y: '105%', opacity: 0, scale: 0.3 } as const,
        animate: {
          x: `${(p.x + Math.sin(p.id * 1.5) * 0.06) * 100}%`,
          y: '-5%',
          opacity: [0, 1, 1, 0],
          scale: [0.3, p.scale, p.scale, 0.5],
        },
        transition: { duration: duration * 0.9, delay: p.delay, ease: ease('easeOut') },
      };
    case 'wave':
      return {
        initial: { x: '-5%', y: `${p.y * 60 + 15}%`, opacity: 0, scale: 0.5 } as const,
        animate: {
          x: '105%',
          y: `${p.y * 60 + 15 + Math.sin(p.x * 10) * 20}%`,
          opacity: [0, 1, 1, 0],
          scale: p.scale,
        },
        transition: { duration, delay: p.delay * 0.2, ease: ease('linear') },
      };
    case 'bounce':
      return {
        initial: { x: `${p.x * 80 + 10}%`, y: 0, scale: 0, opacity: 1 } as const,
        animate: {
          y: [0, -200 - Math.random() * 100, 0, -120, 0, -60, 0],
          scale: [0, p.scale, p.scale * 0.8, p.scale, p.scale * 0.9, p.scale, 0],
          opacity: [1, 1, 1, 1, 1, 1, 0],
        },
        transition: {
          duration,
          delay: p.delay * 0.3,
          ease: ease('easeInOut'),
          times: [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1],
        },
      };
    case 'shake':
      return {
        initial: { x: `${p.x * 90 + 5}%`, y: `${p.y * 75 + 10}%`, scale: 0, opacity: 1, rotate: 0 } as const,
        animate: {
          scale: [0, p.scale, p.scale, p.scale, p.scale * 0.8],
          opacity: [1, 1, 1, 1, 0],
          rotate: [0, p.rotate * 0.2, -p.rotate * 0.2, p.rotate * 0.2, 0],
        },
        transition: { duration, delay: p.delay, ease: ease('linear') },
      };
    case 'stampede':
      return {
        initial: { x: '-5%', y: `${p.y * 35 + 10}%`, scale: 0.3, opacity: 0 } as const,
        animate: {
          x: '105%',
          y: `${p.y * 35 + 10 + Math.sin(p.x * 8) * 8}%`,
          scale: [0.3, p.scale, p.scale, p.scale],
          opacity: [0, 1, 1, 0],
        },
        transition: { duration: duration * (0.2 + p.x * 0.8), delay: p.delay * 0.1, ease: ease('linear') },
      };
    case 'glass': {
      const angle = (p.id / count) * Math.PI * 2;
      const radius = 20 + Math.random() * 40;
      return {
        initial: { x: '50%', y: '50%', scale: 0, opacity: 0, rotate: 0 } as const,
        animate: {
          x: `calc(50% + ${Math.cos(angle) * radius}px)`,
          y: `calc(50% + ${Math.sin(angle) * radius}px)`,
          scale: [0, p.scale * 0.8, p.scale, p.scale * 0.6, 0],
          opacity: [0, 0.8, 1, 0.6, 0],
          rotate: [0, p.rotate * 0.3, p.rotate * 0.5, p.rotate * 0.8, p.rotate],
        },
        transition: {
          duration: duration * 0.7,
          delay: p.delay * 0.15,
          ease: ease('easeInOut'),
          times: [0, 0.15, 0.35, 0.65, 1],
        },
      };
    }
  }
}

export function CelebrationEffect({ celebration, intensity, onComplete }: Props) {
  const [show, setShow] = useState(true);
  const [shakeScreen, setShakeScreen] = useState(false);
  const cfg = INTENSITY_CONFIG[intensity];

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setShakeScreen(false);
      onComplete();
    }, cfg.duration * 1000 + 300);
    return () => clearTimeout(timer);
  }, [cfg.duration, onComplete]);

  useEffect(() => {
    if (intensity === 'suBang') {
      setShakeScreen(true);
    }
  }, [intensity]);

  const particles = useMemo(() => {
    const items: Particle[] = [];
    for (let i = 0; i < cfg.count; i++) {
      items.push({
        id: i,
        emoji: celebration.emojiList[i % celebration.emojiList.length],
        x: Math.random(),
        y: Math.random(),
        delay: Math.random() * cfg.duration * 0.25,
        rotate: Math.random() * 720 - 360,
        scale: 0.4 + Math.random() * 0.4,
      });
    }
    return items;
  }, [celebration.emojiList, cfg.count, cfg.duration]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {shakeScreen && (
        <motion.div
          className="fixed inset-0"
          animate={{ x: [0, -6, 6, -4, 4, -2, 2, 0], y: [0, 3, -3, 2, -2, 1, -1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ backgroundColor: 'rgba(0,0,0,0.12)' }}
        />
      )}
      <div className="absolute inset-0">
        <AnimatePresence>
          {particles.map((p) => {
            const anim = getAnim(celebration.type, p, cfg.count, cfg.duration);
            return (
              <motion.span
                key={p.id}
                className="absolute select-none"
                style={{ fontSize: `${cfg.emojiScale * p.scale}rem`, willChange: 'transform' }}
                initial={anim.initial}
                animate={anim.animate}
                exit={{ opacity: 0, scale: 0 }}
                transition={anim.transition}
              >
                {p.emoji}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
