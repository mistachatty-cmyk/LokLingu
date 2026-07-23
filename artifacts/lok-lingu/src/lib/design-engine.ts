import { animate, createTimeline, createTimer, utils } from 'animejs';

interface WordRevealOpts {
  duration?: number;
  delay?: number;
}

interface CelebrationPopOpts {
  duration?: number;
  spread?: number;
}

interface PageTransitionOpts {
  duration?: number;
}

interface ScorePopOpts {
  duration?: number;
  color?: string;
}

interface ShakeElementOpts {
  intensity?: number;
  duration?: number;
}

interface RainbowGlowOpts {
  duration?: number;
  loop?: boolean;
}

class DesignEngine {
  private pulses = new Map<HTMLElement | string, any>();

  wordReveal(element: HTMLElement | string, opts?: WordRevealOpts) {
    const duration = opts?.duration ?? 600;
    const delay = opts?.delay ?? 0;
    utils.set(element, { scale: 0, opacity: 0 });
    return animate(element, {
      scale: 1,
      opacity: 1,
      duration,
      delay,
      ease: 'outBack',
    });
  }

  celebrationPop(elements: (HTMLElement | string)[], opts?: CelebrationPopOpts) {
    const duration = opts?.duration ?? 800;
    const spread = opts?.spread ?? 150;
    return animate(elements, {
      translateX: () => (Math.random() - 0.5) * spread * 2,
      translateY: () => (Math.random() - 0.5) * spread * 2,
      rotate: () => Math.random() * 720 - 360,
      opacity: 0,
      scale: 0,
      duration,
      ease: 'outCubic',
    });
  }

  pageTransition(element: HTMLElement | string, direction: 'in' | 'out' = 'in', opts?: PageTransitionOpts) {
    const duration = opts?.duration ?? 400;
    if (direction === 'in') {
      utils.set(element, { opacity: 0, translateY: 40 });
      return animate(element, {
        opacity: 1,
        translateY: 0,
        duration,
        ease: 'outExpo',
      });
    }
    return animate(element, {
      opacity: 0,
      translateY: -40,
      duration,
      ease: 'inExpo',
    });
  }

  micPulse(element: HTMLElement | string, isActive: boolean) {
    const existing = this.pulses.get(element);
    if (isActive) {
      if (existing) existing.pause();
      const anim = animate(element, {
        scale: [1, 1.15, 1],
        duration: 1000,
        ease: 'inOutSine',
        loop: true,
      });
      this.pulses.set(element, anim);
      return anim;
    }
    if (existing) {
      existing.pause();
      this.pulses.delete(element);
    }
    return animate(element, {
      scale: 1,
      duration: 200,
      ease: 'outQuad',
    });
  }

  themeTransition(callback?: () => void, opts?: { duration?: number }) {
    const duration = opts?.duration ?? 400;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;background:rgba(255,255,255,0)';
    document.body.appendChild(overlay);

    const tl = createTimeline({
      onComplete: () => overlay.remove(),
    });

    tl.add(overlay, {
      opacity: [0, 1],
      backgroundColor: ['rgba(255,255,255,0)', 'rgba(0,0,0,1)'],
      duration: duration / 2,
      ease: 'inQuad',
    });

    tl.call(() => callback?.());

    tl.add(overlay, {
      opacity: [1, 0],
      backgroundColor: ['rgba(0,0,0,1)', 'rgba(255,255,255,0)'],
      duration: duration / 2,
      ease: 'outQuad',
    });

    return tl;
  }

  scorePop(element: HTMLElement | string, opts?: ScorePopOpts) {
    const duration = opts?.duration ?? 600;
    const color = opts?.color ?? '#FFD700';
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    const originalColor = el ? getComputedStyle(el).color : undefined;

    return animate(element, {
      translateY: [
        { to: -40, ease: 'outQuad', duration: duration * 0.35 },
        { to: 0, ease: 'outBounce', duration: duration * 0.65 },
      ],
      scale: [
        { to: 1.4, duration: duration * 0.35 },
        { to: 1, duration: duration * 0.65 },
      ],
      color: originalColor
        ? [
            { to: color, duration: duration * 0.35 },
            { to: originalColor, duration: duration * 0.65 },
          ]
        : color,
      duration,
    });
  }

  shakeElement(element: HTMLElement | string, opts?: ShakeElementOpts) {
    const intensity = opts?.intensity ?? 8;
    const duration = opts?.duration ?? 400;
    return animate(element, {
      translateX: [
        { to: -intensity },
        { to: intensity },
        { to: -intensity * 0.6 },
        { to: intensity * 0.6 },
        { to: -intensity * 0.3 },
        { to: intensity * 0.3 },
        { to: 0 },
      ],
      duration,
      ease: 'inOutSine',
    });
  }

  rainbowGlow(element: HTMLElement | string, opts?: RainbowGlowOpts) {
    const duration = opts?.duration ?? 2000;
    const loop = opts?.loop ?? true;
    const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff', '#ff0088'];
    return animate(element, {
      textShadow: colors.map((c) => `0 0 10px ${c}, 0 0 20px ${c}`),
      duration,
      loop,
      ease: 'linear',
    });
  }
}

export const engine = new DesignEngine();
