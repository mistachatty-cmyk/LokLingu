/* ------------------------------------------------------------------
   Token physics — a real integrator for coin bodies.

   What existed before: `y: [-vh*0.75, 0, -10, 0]` with a hand-tuned
   `times` array. That is a pre-baked keyframe path pretending to be a
   bounce; it cannot respond to anything, cannot vary, and cannot support
   trails without adding a DOM element per trail sample per coin.

   This is semi-implicit Euler with floor/wall collision and restitution.
   It is not a general rigid-body engine and deliberately has no
   body-vs-body collision — coins passing through each other is unnoticeable
   at these speeds and stable stacking is a genuinely hard problem that
   would buy nothing visually.

   Budget discipline:
     - Bodies live in a fixed pool; spawning past the cap evicts the oldest.
     - Trails are ring buffers of plain numbers, not objects.
     - dt is clamped so a backgrounded tab can't integrate a huge step and
       fling everything off-screen.
------------------------------------------------------------------ */

import { getSprite } from './sprites';
import type { TokenMotionDef } from '../token-motions';

export interface SpawnRequest {
  /** Screen-space launch origin. Physics needs a real coordinate — the old
   *  API was an incrementing integer that carried no position at all. */
  x: number;
  y: number;
  glyph: string;
  size: number;
  motion: TokenMotionDef;
}

interface Body {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  size: number;
  glyph: string;
  life: number;
  maxLife: number;
  bounces: number;
  maxBounces: number;
  gravity: number;
  restitution: number;
  drag: number;
  /** Interleaved x,y ring buffer. Length = trailLen * 2. */
  trail: number[];
  trailLen: number;
  trailHead: number;
  trailCount: number;
  /** Explodes on first floor contact when set. */
  fragmentsOnImpact: number;
  isFragment: boolean;
}

const MAX_BODIES = 90;
const MAX_DT = 1 / 20;

function blankBody(): Body {
  return {
    active: false, x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0,
    size: 24, glyph: '🪙', life: 0, maxLife: 1, bounces: 0, maxBounces: 0,
    gravity: 0, restitution: 0, drag: 1, trail: [], trailLen: 0,
    trailHead: 0, trailCount: 0, fragmentsOnImpact: 0, isFragment: false,
  };
}

export interface TokenSimHandle {
  spawn(req: SpawnRequest): void;
  stop(): void;
  /** Live body count, for the perf budget to react to. */
  count(): number;
}

export function createTokenSim(canvas: HTMLCanvasElement): TokenSimHandle {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return { spawn() {}, stop() {}, count: () => 0 };

  const pool: Body[] = Array.from({ length: MAX_BODIES }, blankBody);
  let cursor = 0;
  let raf = 0;
  let last = 0;
  let running = false;
  let w = 0;
  let h = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Claims a slot, evicting the oldest body if the pool is saturated. */
  function claim(): Body {
    for (let i = 0; i < MAX_BODIES; i++) {
      const b = pool[(cursor + i) % MAX_BODIES];
      if (!b.active) {
        cursor = (cursor + i + 1) % MAX_BODIES;
        return b;
      }
    }
    const b = pool[cursor];
    cursor = (cursor + 1) % MAX_BODIES;
    return b;
  }

  function launch(
    b: Body,
    x: number, y: number,
    glyph: string, size: number,
    m: TokenMotionDef,
    angleOverride?: number,
    speedScale = 1,
    isFragment = false,
  ) {
    const p = m.physics;
    // Cone opens upward: -90° ± spread.
    const angle = angleOverride ?? -Math.PI / 2 + (Math.random() - 0.5) * 2 * p.spread;
    const speed = p.speed * speedScale * (0.75 + Math.random() * 0.5);

    b.active = true;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.angle = 0;
    b.spin = (Math.random() - 0.5) * 8;
    b.size = isFragment ? size * 0.5 : size;
    b.glyph = glyph;
    b.life = 0;
    b.maxLife = isFragment ? p.life * 0.5 : p.life;
    b.bounces = 0;
    b.maxBounces = p.bounces;
    b.gravity = p.gravity;
    b.restitution = p.restitution;
    b.drag = p.drag;
    b.isFragment = isFragment;
    b.fragmentsOnImpact = isFragment ? 0 : (p.fragments ?? 0);

    const tl = isFragment ? Math.min(p.trail, 6) : p.trail;
    b.trailLen = tl;
    b.trailHead = 0;
    b.trailCount = 0;
    if (tl > 0 && b.trail.length !== tl * 2) b.trail = new Array(tl * 2).fill(0);
  }

  function detonate(b: Body) {
    const n = b.fragmentsOnImpact;
    b.fragmentsOnImpact = 0;
    for (let i = 0; i < n; i++) {
      const frag = claim();
      const angle = (i / n) * Math.PI * 2;
      launch(
        frag, b.x, b.y, b.glyph, b.size,
        {
          id: 'frag', name: '', blurb: '', kind: 'ballistic', cost: 0,
          physics: {
            gravity: Math.abs(b.gravity) || 800,
            restitution: 0.4, drag: 0.99, speed: 210,
            spread: 0, bounces: 1, count: 1,
            trail: b.trailLen > 0 ? 5 : 0, life: b.maxLife,
          },
        },
        angle, 1, true,
      );
    }
  }

  function step(dt: number) {
    for (const b of pool) {
      if (!b.active) continue;

      b.life += dt;
      if (b.life >= b.maxLife) {
        b.active = false;
        continue;
      }

      b.vy += b.gravity * dt;
      // Drag is defined per second; raise it to dt so behaviour is
      // frame-rate independent rather than tied to a 60Hz assumption.
      const d = Math.pow(b.drag, dt * 60);
      b.vx *= d;
      b.vy *= d;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.spin * dt;

      if (b.trailLen > 0) {
        b.trail[b.trailHead * 2] = b.x;
        b.trail[b.trailHead * 2 + 1] = b.y;
        b.trailHead = (b.trailHead + 1) % b.trailLen;
        if (b.trailCount < b.trailLen) b.trailCount++;
      }

      // Floor
      const floor = h - b.size * 0.5;
      if (b.gravity > 0 && b.y > floor) {
        if (b.fragmentsOnImpact > 0) {
          detonate(b);
          b.active = false;
          continue;
        }
        if (b.bounces >= b.maxBounces) {
          b.active = false;
          continue;
        }
        b.y = floor;
        b.vy = -b.vy * b.restitution;
        b.vx *= 0.86; // friction on contact
        b.spin *= 0.7;
        b.bounces++;
        // Below a threshold a "bounce" is just jitter — retire instead.
        if (Math.abs(b.vy) < 40) b.active = false;
      }

      // Walls
      const half = b.size * 0.5;
      if (b.x < half) {
        b.x = half;
        b.vx = Math.abs(b.vx) * b.restitution;
      } else if (b.x > w - half) {
        b.x = w - half;
        b.vx = -Math.abs(b.vx) * b.restitution;
      }

      // Zero-g bodies drift off the top; retire them there.
      if (b.y < -b.size * 2) b.active = false;
    }
  }

  function draw() {
    ctx!.clearRect(0, 0, w, h);

    for (const b of pool) {
      if (!b.active) continue;
      const fade = 1 - Math.pow(b.life / b.maxLife, 3);

      // Slipstream first, so the coin always sits on top of its own wake.
      if (b.trailLen > 0 && b.trailCount > 1) {
        ctx!.lineCap = 'round';
        for (let i = 1; i < b.trailCount; i++) {
          const iA = (b.trailHead - i + b.trailLen) % b.trailLen;
          const iB = (b.trailHead - i - 1 + b.trailLen) % b.trailLen;
          const t = 1 - i / b.trailCount;
          ctx!.globalAlpha = t * 0.42 * fade;
          ctx!.strokeStyle = 'currentColor';
          ctx!.lineWidth = b.size * 0.32 * t;
          ctx!.beginPath();
          ctx!.moveTo(b.trail[iA * 2], b.trail[iA * 2 + 1]);
          ctx!.lineTo(b.trail[iB * 2], b.trail[iB * 2 + 1]);
          ctx!.stroke();
        }
      }

      const sprite = getSprite(b.glyph, b.size);
      if (!sprite) continue;
      ctx!.globalAlpha = fade;
      ctx!.save();
      ctx!.translate(b.x, b.y);
      ctx!.rotate(b.angle);
      ctx!.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
      ctx!.restore();
    }
    ctx!.globalAlpha = 1;
  }

  function anyActive(): boolean {
    for (const b of pool) if (b.active) return true;
    return false;
  }

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    step(dt);
    draw();
    // Idle when there is nothing to simulate rather than burning a frame
    // every 16ms drawing an empty canvas.
    if (!anyActive()) {
      running = false;
      ctx!.clearRect(0, 0, w, h);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  const onResize = () => resize();
  resize();
  window.addEventListener('resize', onResize);

  return {
    spawn(req: SpawnRequest) {
      const p = req.motion.physics;
      const n = Math.max(1, p.count);
      for (let i = 0; i < n; i++) {
        launch(claim(), req.x, req.y, req.glyph, req.size, req.motion);
      }
      wake();
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      for (const b of pool) b.active = false;
    },
    count() {
      let n = 0;
      for (const b of pool) if (b.active) n++;
      return n;
    },
  };
}
