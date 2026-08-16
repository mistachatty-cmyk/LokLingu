/* ------------------------------------------------------------------
   Seasons — the ambient weather layer that drifts behind the app.

   This replaces the old one-off "falling blossoms" component. Cherry
   blossoms are now simply one season among many, and every season is
   described as *data* so the renderer stays a single generic simulation
   rather than a switch statement per effect.

   Design constraints, in priority order:

     1. It must never compete with the game. Everything here is low
        opacity, slow, and behind the content. Density is deliberately
        conservative — a screen full of confetti is noise, not weather.
     2. Motion is described physically (gravity, wind, sway) rather than
        as keyframes, so particles never move in visible lockstep the way
        a shared CSS animation does.
     3. `gravity` may be negative. Embers rise; ash falls. Fireflies use
        ~zero gravity plus a wander term and never settle.
------------------------------------------------------------------ */

export interface SeasonMotion {
  /** px/s². Negative values rise (embers, fireflies drifting up). */
  gravity: number;
  /** Cap on fall speed so heavy gravity still reads as "drifting". */
  terminalVelocity: number;
  /** Horizontal oscillation, in px. This is what sells "fluttering". */
  swayAmplitude: number;
  /** Oscillations per second. Kept under ~0.5Hz or it reads as jitter. */
  swayFrequency: number;
  /** deg/s. 0 disables rotation entirely (snow shouldn't spin). */
  spinSpeed: number;
  /** Random-walk strength. Only fireflies want this. */
  wander: number;
  /** Opacity pulse depth, 0–1. Embers and fireflies flicker. */
  flicker: number;
}

export interface Season {
  id: string;
  name: string;
  blurb: string;
  /** Glyphs cycled across particles. Repeat one to weight it heavier. */
  glyphs: string[];
  motion: SeasonMotion;
  /** Particle count at 'medium' intensity. Scaled by the density setting. */
  baseCount: number;
  /** px, before per-particle jitter and parallax scaling. */
  sizeRange: [number, number];
  /** Base opacity ceiling. Nothing here goes above 0.75. */
  opacity: number;
  /** Token cost. 0 = free / owned by default. */
  cost: number;
  /** Months this season auto-selects in (1–12), for `auto` mode. */
  months?: number[];
}

export const SEASONS: Season[] = [
  {
    id: 'blossoms',
    name: 'Cherry Blossoms',
    blurb: 'Soft pink petals on a spring breeze.',
    glyphs: ['🌸', '🌸', '🌸', '🏵️'],
    motion: {
      gravity: 14,
      terminalVelocity: 46,
      swayAmplitude: 34,
      swayFrequency: 0.22,
      spinSpeed: 34,
      wander: 0,
      flicker: 0,
    },
    baseCount: 18,
    sizeRange: [13, 24],
    opacity: 0.72,
    cost: 0,
    months: [3, 4, 5],
  },
  {
    id: 'fireflies',
    name: 'Fireflies',
    blurb: 'Warm summer motes that drift and blink.',
    glyphs: ['✨', '🟡', '💛'],
    motion: {
      // Near-weightless with a faint upward bias, so they hover rather
      // than fall. Wander does the rest of the work.
      gravity: -3,
      terminalVelocity: 16,
      swayAmplitude: 22,
      swayFrequency: 0.16,
      spinSpeed: 0,
      wander: 9,
      flicker: 0.65,
    },
    baseCount: 14,
    sizeRange: [8, 15],
    opacity: 0.7,
    cost: 500,
    months: [6, 7, 8],
  },
  {
    id: 'leaves',
    name: 'Autumn Leaves',
    blurb: 'Amber and rust, tumbling end over end.',
    glyphs: ['🍁', '🍂', '🍃'],
    motion: {
      gravity: 24,
      terminalVelocity: 62,
      swayAmplitude: 46,
      swayFrequency: 0.3,
      // Leaves are the one thing that should visibly tumble.
      spinSpeed: 96,
      wander: 0,
      flicker: 0,
    },
    baseCount: 16,
    sizeRange: [14, 26],
    opacity: 0.72,
    cost: 500,
    months: [9, 10, 11],
  },
  {
    id: 'snow',
    name: 'Snowfall',
    blurb: 'Quiet flakes settling over everything.',
    glyphs: ['❄️', '❅', '❆', '·'],
    motion: {
      gravity: 12,
      terminalVelocity: 38,
      swayAmplitude: 18,
      swayFrequency: 0.14,
      // Real snowflakes don't cartwheel.
      spinSpeed: 0,
      wander: 2,
      flicker: 0,
    },
    baseCount: 26,
    sizeRange: [7, 18],
    opacity: 0.75,
    cost: 500,
    months: [12, 1, 2],
  },
  {
    id: 'roses',
    name: "Valentine's Roses",
    blurb: 'Petals and hearts, falling slow.',
    glyphs: ['🌹', '💖', '🌷', '💕'],
    motion: {
      gravity: 16,
      terminalVelocity: 44,
      swayAmplitude: 30,
      swayFrequency: 0.2,
      spinSpeed: 28,
      wander: 0,
      flicker: 0,
    },
    baseCount: 16,
    sizeRange: [12, 22],
    opacity: 0.7,
    cost: 500,
    months: [2],
  },
  {
    id: 'embers',
    name: 'Ash & Embers',
    blurb: 'Cinders lifting on the heat, ash drifting down.',
    glyphs: ['🔥', '·', '✦', '•'],
    motion: {
      // Rises. The mixed glyph set (fire + specks) reads as a fire's
      // updraft carrying sparks while finer ash settles.
      gravity: -20,
      terminalVelocity: 40,
      swayAmplitude: 26,
      swayFrequency: 0.34,
      spinSpeed: 0,
      wander: 6,
      flicker: 0.75,
    },
    baseCount: 20,
    sizeRange: [6, 16],
    opacity: 0.66,
    cost: 750,
    months: [10],
  },
];

export const SEASON_BY_ID = new Map(SEASONS.map((s) => [s.id, s]));

export type SeasonIntensity = 'low' | 'medium' | 'high';

/** Multiplier applied to `baseCount`. */
export const INTENSITY_SCALE: Record<SeasonIntensity, number> = {
  low: 0.5,
  medium: 1,
  high: 1.6,
};

/* ------------------------- selection ------------------------- */

const K = {
  enabled: 'lok-lingu-season-enabled',
  mode: 'lok-lingu-season-mode', // 'auto' | 'pinned'
  pinned: 'lok-lingu-season-pinned',
  intensity: 'lok-lingu-season-intensity',
  inGame: 'lok-lingu-season-in-game',
  owned: 'lok-lingu-season-owned',
  /* legacy keys from the previous particle-effects module */
  legacyOwned: 'lok-lingu-particle-owned',
  legacyType: 'lok-lingu-particle-type',
} as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode — settings simply don't persist */
  }
}

/** Which season the calendar suggests today. Falls back to blossoms. */
export function seasonForToday(): Season {
  const month = new Date().getMonth() + 1;
  return SEASONS.find((s) => s.months?.includes(month)) ?? SEASONS[0];
}

export function isSeasonEnabled(): boolean {
  // Off unless explicitly turned on — ambient motion should be opt-in.
  return read(K.enabled) === 'true';
}

export function setSeasonEnabled(on: boolean): void {
  write(K.enabled, String(on));
}

/** Whether the layer keeps running during /game and /draw. Default off. */
export function seasonsInGame(): boolean {
  return read(K.inGame) === 'true';
}

export function setSeasonsInGame(on: boolean): void {
  write(K.inGame, String(on));
}

export function getSeasonMode(): 'auto' | 'pinned' {
  return read(K.mode) === 'pinned' ? 'pinned' : 'auto';
}

export function setSeasonMode(mode: 'auto' | 'pinned'): void {
  write(K.mode, mode);
}

export function getIntensity(): SeasonIntensity {
  const v = read(K.intensity);
  return v === 'low' || v === 'high' ? v : 'medium';
}

export function setIntensity(v: SeasonIntensity): void {
  write(K.intensity, v);
}

/** The season actually in effect right now, honouring auto vs pinned. */
export function activeSeason(): Season {
  if (getSeasonMode() === 'auto') return seasonForToday();
  const pinned = read(K.pinned) ?? read(K.legacyType);
  return (pinned && SEASON_BY_ID.get(pinned)) || SEASONS[0];
}

export function pinSeason(id: string): void {
  write(K.pinned, id);
  write(K.mode, 'pinned');
}

/* ------------------------- ownership ------------------------- */

export function getOwnedSeasons(): string[] {
  const free = SEASONS.filter((s) => s.cost === 0).map((s) => s.id);
  let stored: string[] = [];
  try {
    // Carry over anything bought under the old particle-effects keys so
    // nobody loses a purchase in the rename.
    const raw = read(K.owned) ?? read(K.legacyOwned);
    stored = raw ? JSON.parse(raw) : [];
  } catch {
    stored = [];
  }
  return Array.from(new Set([...free, ...stored]));
}

export function ownsSeason(id: string): boolean {
  return getOwnedSeasons().includes(id);
}

export function grantSeason(id: string): void {
  const owned = getOwnedSeasons();
  if (!owned.includes(id)) write(K.owned, JSON.stringify([...owned, id]));
}
