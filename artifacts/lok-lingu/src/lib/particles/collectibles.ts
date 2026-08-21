/* ------------------------------------------------------------------
   The tappable collectible layer — Phase 2 of docs/COMPANIONS.md.

   createField() (field.ts) is deliberately pointer-events: none and
   recycles particles with no per-particle handle, so it cannot be made
   tappable. This is the sibling module that can: a small, bounded set of
   glyphs with stable ids, real hit-testing, and a collect callback the
   React layer turns into a reward.

   Shares field.ts's rAF/dt-clamp/visibility discipline and its sprite
   cache (getSprite), but is a genuinely different data model — items are
   individually addressable and tappable, not an anonymous recycled pool.

   Three constraints from the doc, enforced here rather than left to
   callers to remember:

     1. Forbidden zone. Items never spawn inside the caller-supplied
        rect (the word + controls, inflated). Checked at spawn time only
        — an item already on screen is not yanked mid-flight if the zone
        moves (e.g. window resize), since that would look like a glitch.
     2. Touch-sized hit radius. Hit-testing uses HIT_RADIUS (44 CSS px),
        not the glyph's visual bounds, so a small glyph is still an easy
        tap target.
     3. Reduced motion still earns. When `reducedMotion` is true, items
        spawn already at rest (no drift/growth-in) and just fade in place
        — same tap area, same rewards, no motion.
------------------------------------------------------------------ */

import { getSprite } from './field';

export interface CollectibleItem {
  id: number;
  x: number;
  y: number;
  size: number;
  glyph: string;
  bornAt: number;
  /** Set once tapped; drives the pop-out animation, then removal. */
  poppedAt: number | null;
}

export type SpawnOrigin = 'top' | 'bottom' | 'edges';

export interface CollectiblesConfig {
  glyph: string;
  /** [min, max] ms between spawns. */
  spawnEveryMs: [number, number];
  maxOnScreen: number;
  origin: SpawnOrigin;
  sizeRange: [number, number];
  /** Canvas-local rect (word + controls, inflated) that items must never spawn inside. */
  forbiddenRect: () => { x: number; y: number; width: number; height: number } | null;
  onCollect: (id: number) => void;
  reducedMotion: boolean;
}

export interface CollectiblesHandle {
  stop(): void;
  /** Milestone celebration: instantly spawns `count` glyphs with random
   *  velocity that bounce off the floor/edges and fade — visual/sound
   *  only, never tap-collected, never calls onCollect. See companion-layer.tsx. */
  burst(count: number): void;
}

const MAX_DT = 1 / 20;
/** Touch-sized hit radius in CSS px, independent of the glyph's own size. */
const HIT_RADIUS = 44;
const POP_MS = 260;
/** Bamboo-style grow-in for a freshly spawned item, skipped under reduced motion. */
const GROW_MS = 500;

interface BurstItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  angle: number;
  bornAt: number;
}

const GRAVITY = 900; // px/s^2
const BOUNCE_DAMPING = 0.55;
const FRICTION = 0.85; // applied to vx on each floor bounce
const BURST_LIFETIME_S = 2.5;

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return ax < b.x + b.width && ax + aw > b.x && ay < b.y + b.height && ay + ah > b.y;
}

export function createCollectibles(
  canvas: HTMLCanvasElement,
  config: CollectiblesConfig,
): CollectiblesHandle {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return { stop() {}, burst() {} };

  let items: CollectibleItem[] = [];
  let bursts: BurstItem[] = [];
  let nextId = 1;
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let nextSpawnAt = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let running = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function randomSpawnDelay(): number {
    const [min, max] = config.spawnEveryMs;
    return min + Math.random() * (max - min);
  }

  /** Tries a handful of candidate spots outside the forbidden zone; gives up
   *  silently if none land clean (the field just spawns one fewer this tick,
   *  rather than ever covering the word). */
  function pickSpawnPoint(size: number): { x: number; y: number } | null {
    const forbidden = config.forbiddenRect();
    for (let attempt = 0; attempt < 8; attempt++) {
      let x: number;
      let y: number;
      if (config.origin === 'bottom') {
        x = size + Math.random() * Math.max(1, w - size * 2);
        y = h - size * (0.5 + Math.random() * 0.5);
      } else if (config.origin === 'top') {
        x = size + Math.random() * Math.max(1, w - size * 2);
        y = size * (0.5 + Math.random() * 0.5);
      } else {
        // edges: left or right margin strip only
        const onLeft = Math.random() < 0.5;
        x = onLeft ? size * (0.5 + Math.random() * 0.5) : w - size * (0.5 + Math.random() * 0.5);
        y = size + Math.random() * Math.max(1, h - size * 2);
      }
      if (!forbidden || !rectsOverlap(x - size / 2, y - size / 2, size, size, forbidden)) {
        return { x, y };
      }
    }
    return null;
  }

  function trySpawn() {
    const alive = items.filter((it) => it.poppedAt === null);
    if (alive.length >= config.maxOnScreen) return;
    const [minS, maxS] = config.sizeRange;
    const size = minS + Math.random() * (maxS - minS);
    const point = pickSpawnPoint(size);
    if (!point) return;
    items.push({
      id: nextId++,
      x: point.x,
      y: point.y,
      size,
      glyph: config.glyph,
      bornAt: elapsed,
      poppedAt: null,
    });
  }

  function stepBursts(dt: number) {
    if (bursts.length === 0) return;
    for (const b of bursts) {
      b.vy += GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.spin * dt;
      const floor = h - b.size / 2;
      if (b.y >= floor && b.vy > 0) {
        b.y = floor;
        b.vy = -b.vy * BOUNCE_DAMPING;
        b.vx *= FRICTION;
      }
      if (b.x < b.size / 2) {
        b.x = b.size / 2;
        b.vx = Math.abs(b.vx) * BOUNCE_DAMPING;
      } else if (b.x > w - b.size / 2) {
        b.x = w - b.size / 2;
        b.vx = -Math.abs(b.vx) * BOUNCE_DAMPING;
      }
    }
    bursts = bursts.filter((b) => elapsed - b.bornAt < BURST_LIFETIME_S);
  }

  function step(dt: number) {
    elapsed += dt;
    if (elapsed >= nextSpawnAt) {
      trySpawn();
      nextSpawnAt = elapsed + randomSpawnDelay() / 1000;
    }
    // Drop fully-popped items once their animation has finished.
    items = items.filter((it) => it.poppedAt === null || elapsed - it.poppedAt < POP_MS / 1000);
    stepBursts(dt);
  }

  function draw() {
    ctx!.clearRect(0, 0, w, h);
    for (const it of items) {
      const age = elapsed - it.bornAt;
      const growT = config.reducedMotion ? 1 : Math.min(1, age / (GROW_MS / 1000));
      let scale = growT;
      let alpha = growT;
      if (it.poppedAt !== null) {
        const popT = Math.min(1, (elapsed - it.poppedAt) / (POP_MS / 1000));
        scale = growT * (1 + popT * 0.6);
        alpha = growT * (1 - popT);
      }
      const sprite = getSprite(it.glyph, it.size * scale);
      if (!sprite || alpha <= 0) continue;
      ctx!.globalAlpha = alpha;
      ctx!.drawImage(sprite, it.x - sprite.width / 2, it.y - sprite.height / 2);
    }
    for (const b of bursts) {
      const age = elapsed - b.bornAt;
      // Fades over the last third of its life rather than popping out abruptly.
      const fadeStart = BURST_LIFETIME_S * 0.66;
      const alpha = age <= fadeStart ? 1 : Math.max(0, 1 - (age - fadeStart) / (BURST_LIFETIME_S - fadeStart));
      const sprite = getSprite(config.glyph, b.size);
      if (!sprite || alpha <= 0) continue;
      ctx!.globalAlpha = alpha;
      ctx!.save();
      ctx!.translate(b.x, b.y);
      ctx!.rotate(b.angle);
      ctx!.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
      ctx!.restore();
    }
    ctx!.globalAlpha = 1;
  }

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
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

  function pointFromEvent(e: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: PointerEvent) {
    const p = pointFromEvent(e);
    // Most-recently-spawned first: with overlapping items, the one on top
    // visually is also the one a tap most plausibly meant.
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.poppedAt !== null) continue;
      const dx = it.x - p.x;
      const dy = it.y - p.y;
      if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) {
        it.poppedAt = elapsed;
        config.onCollect(it.id);
        break;
      }
    }
  }

  function burst(count: number) {
    const [minS, maxS] = config.sizeRange;
    // Launched from a point near the bottom-center — reads as "coming from
    // the ground" rather than raining from off-screen.
    const originX = w / 2;
    const originY = h * 0.85;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 260 + Math.random() * 260;
      bursts.push({
        x: originX + (Math.random() - 0.5) * 40,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: minS + Math.random() * (maxS - minS),
        spin: (Math.random() - 0.5) * 8,
        angle: 0,
        bornAt: elapsed,
      });
    }
  }

  const onVisibility = () => (document.hidden ? pause() : start());
  const onResize = () => resize();

  resize();
  start();
  // The canvas itself stays pointer-events: none (set by the caller) so it
  // never steals a tap meant for a real control underneath — hit-testing
  // listens on window instead and simply no-ops when nothing was hit.
  window.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize);

  return {
    stop() {
      pause();
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
    },
    burst,
  };
}
