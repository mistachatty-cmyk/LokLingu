/* ------------------------------------------------------------------
   The ambient particle field — one canvas, one rAF loop, N particles.

   Why canvas instead of the DOM approach the old blossom layer used:
   every particle was a `<motion.div>` with its own infinite Framer
   animation, which means N independent animation drivers, N composited
   layers, and no way to add trails without another element per particle.
   A single canvas draws the same field in one pass and scales to the
   token-physics work later without changing renderer.

   Performance rules this file obeys:

     1. Glyphs are rasterised ONCE into a sprite cache and blitted with
        drawImage. `fillText` per particle per frame is the naive version
        and is meaningfully slower for emoji.
     2. `dt` is clamped. A backgrounded tab that wakes up after 30s must
        not teleport the field.
     3. The loop stops entirely when the tab is hidden — ambient decoration
        has no business draining a phone battery in the background.
     4. Nothing here allocates per frame. Particles are a fixed pool,
        mutated in place.
------------------------------------------------------------------ */

import type { Season } from '../seasons';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  glyph: string;
  angle: number;
  spin: number;
  /** Phase offset so particles never sway in lockstep. */
  phase: number;
  swayAmp: number;
  /** 0 = far (small, faint, slow), 1 = near. Drives parallax. */
  depth: number;
  opacity: number;
  flickerPhase: number;
}

const MAX_DT = 1 / 20; // clamp to 50ms; below this we just lose a little motion

/** Rasterised glyphs, keyed by `${glyph}@${roundedSize}`. */
const spriteCache = new Map<string, HTMLCanvasElement>();

function getSprite(glyph: string, size: number): HTMLCanvasElement | null {
  // Bucket sizes to keep the cache small — a 1px difference is invisible.
  const bucket = Math.max(6, Math.round(size / 2) * 2);
  const key = `${glyph}@${bucket}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;

  if (typeof document === 'undefined') return null;
  const pad = Math.ceil(bucket * 0.35);
  const dim = bucket + pad * 2;
  const c = document.createElement('canvas');
  c.width = dim;
  c.height = dim;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.font = `${bucket}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, dim / 2, dim / 2);
  spriteCache.set(key, c);
  return c;
}

export interface FieldHandle {
  stop(): void;
  /** Swap season/count without tearing down the canvas. */
  configure(season: Season, count: number): void;
}

export function createField(
  canvas: HTMLCanvasElement,
  season: Season,
  count: number,
): FieldHandle {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return { stop() {}, configure() {} };

  let current = season;
  let particles: Particle[] = [];
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let running = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR; 3x costs a lot for decoration
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(p: Particle, initial: boolean) {
    const s = current;
    const depth = Math.random();
    const [minS, maxS] = s.sizeRange;
    // Parallax: distant particles are smaller, fainter and slower.
    const depthScale = 0.55 + depth * 0.45;
    p.depth = depth;
    p.size = (minS + Math.random() * (maxS - minS)) * depthScale;
    p.glyph = s.glyphs[Math.floor(Math.random() * s.glyphs.length)];
    p.x = Math.random() * w;
    // Rising seasons enter from the bottom, falling ones from the top.
    const rising = s.motion.gravity < 0;
    if (initial) {
      p.y = Math.random() * h;
    } else {
      p.y = rising ? h + p.size : -p.size;
    }
    p.vx = 0;
    p.vy = rising ? -8 - Math.random() * 8 : 4 + Math.random() * 8;
    p.angle = Math.random() * Math.PI * 2;
    p.spin = ((Math.random() - 0.5) * 2 * s.motion.spinSpeed * Math.PI) / 180;
    p.phase = Math.random() * Math.PI * 2;
    p.swayAmp = s.motion.swayAmplitude * (0.5 + Math.random() * 0.5);
    p.opacity = s.opacity * (0.55 + depth * 0.45);
    p.flickerPhase = Math.random() * Math.PI * 2;
  }

  function build(n: number) {
    particles = Array.from({ length: n }, () => {
      const p: Particle = {
        x: 0, y: 0, vx: 0, vy: 0, size: 10, glyph: '·',
        angle: 0, spin: 0, phase: 0, swayAmp: 0, depth: 0.5,
        opacity: 0.5, flickerPhase: 0,
      };
      spawn(p, true);
      return p;
    });
  }

  function step(dt: number) {
    const m = current.motion;
    const rising = m.gravity < 0;
    // A slow global gust so the whole field breathes together, on top of
    // each particle's own sway. This is what stops it looking like rain.
    const gust = Math.sin(elapsed * 0.12) * 10 + Math.sin(elapsed * 0.043) * 6;

    for (const p of particles) {
      const speedScale = 0.6 + p.depth * 0.4;

      p.vy += m.gravity * dt;
      const term = m.terminalVelocity * speedScale;
      if (p.vy > term) p.vy = term;
      if (p.vy < -term) p.vy = -term;

      if (m.wander > 0) {
        p.vx += (Math.random() - 0.5) * m.wander * dt * 12;
        p.vy += (Math.random() - 0.5) * m.wander * dt * 12;
        p.vx *= 0.98; // damping keeps the walk from running away
        p.vy *= 0.98;
      }

      const sway =
        Math.sin(elapsed * m.swayFrequency * Math.PI * 2 + p.phase) * p.swayAmp;

      p.x += (p.vx + (sway + gust) * 0.35) * dt * speedScale;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;

      // Recycle once fully off the far edge.
      const margin = p.size * 2;
      if (rising ? p.y < -margin : p.y > h + margin) spawn(p, false);
      if (p.x < -margin) p.x = w + margin;
      else if (p.x > w + margin) p.x = -margin;
    }
  }

  function draw() {
    const m = current.motion;
    ctx!.clearRect(0, 0, w, h);
    for (const p of particles) {
      const sprite = getSprite(p.glyph, p.size);
      if (!sprite) continue;

      let alpha = p.opacity;
      if (m.flicker > 0) {
        const pulse = (Math.sin(elapsed * 2.4 + p.flickerPhase) + 1) / 2;
        alpha *= 1 - m.flicker + m.flicker * pulse;
      }

      ctx!.globalAlpha = alpha;
      if (p.spin !== 0) {
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.angle);
        ctx!.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
        ctx!.restore();
      } else {
        // Skip the save/restore pair entirely when nothing rotates.
        ctx!.drawImage(sprite, p.x - sprite.width / 2, p.y - sprite.height / 2);
      }
    }
    ctx!.globalAlpha = 1;
  }

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    elapsed += dt;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const onVisibility = () => (document.hidden ? pause() : start());
  const onResize = () => {
    resize();
    for (const p of particles) {
      if (p.x > w) p.x = Math.random() * w;
    }
  };

  resize();
  build(count);
  start();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize);

  return {
    stop() {
      pause();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
    },
    configure(next: Season, nextCount: number) {
      current = next;
      if (nextCount !== particles.length) build(nextCount);
      else for (const p of particles) spawn(p, true);
    },
  };
}
