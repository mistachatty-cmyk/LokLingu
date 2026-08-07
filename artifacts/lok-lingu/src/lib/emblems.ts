/* ------------------------------------------------------------------
   Emblems — small animated icons earned by levelling.

   Distinct from token skins on purpose. A token skin is a *purchase*
   that changes an effect you see dozens of times a match. An emblem is
   *earned only*, cannot be bought at any price, and is a quiet status
   mark sitting beside your name. Keeping the two economies separate is
   what stops levels from feeling like a second shop.

   Each emblem names a CSS animation defined in index.css. The animations
   are transform/opacity only and run on a single small element, so an
   emblem is effectively free to display — it can sit in the HUD during a
   match without competing with the game for frames.
------------------------------------------------------------------ */

export interface Emblem {
  id: string;
  /** Level at which this is earned. Never purchasable. */
  level: number;
  name: string;
  glyph: string;
  blurb: string;
  /** CSS animation name from index.css, or null for a static emblem. */
  animation: string | null;
}

export const EMBLEMS: Emblem[] = [
  {
    id: 'spark',
    level: 5,
    name: 'Spark',
    glyph: '✦',
    blurb: 'Your first mark. Pulses softly.',
    animation: 'emblem-pulse',
  },
  {
    id: 'ember',
    level: 12,
    name: 'Ember',
    glyph: '🔥',
    blurb: 'Flickers like something still burning.',
    animation: 'emblem-flicker',
  },
  {
    id: 'prism',
    level: 25,
    name: 'Prism',
    glyph: '🔷',
    blurb: 'Cycles through the spectrum, slowly.',
    animation: 'emblem-prism',
  },
  {
    id: 'comet',
    level: 40,
    name: 'Comet',
    glyph: '☄️',
    blurb: 'Drifts on a long elliptical path.',
    animation: 'emblem-orbit',
  },
  {
    id: 'halo',
    level: 60,
    name: 'Halo',
    glyph: '◎',
    blurb: 'Turns steadily. Never stops.',
    animation: 'emblem-spin',
  },
  {
    id: 'eternal',
    level: 84,
    name: 'Eternal',
    glyph: '♾️',
    blurb: 'Awarded alongside the Eternal Vault. Breathes.',
    animation: 'emblem-breathe',
  },
  {
    id: 'crown',
    level: 100,
    name: 'Crown',
    glyph: '👑',
    blurb: 'Level one hundred. A shimmer that does not repeat quickly.',
    animation: 'emblem-shimmer',
  },
];

export const EMBLEM_SELECTED_KEY = 'lok-lingu-emblem';
export const EMBLEM_EVENT = 'lok-emblem';

export function earnedEmblems(level: number): Emblem[] {
  return EMBLEMS.filter((e) => level >= e.level);
}

export function getSelectedEmblem(level: number): Emblem | null {
  try {
    const id = localStorage.getItem(EMBLEM_SELECTED_KEY);
    if (!id) return null;
    const found = EMBLEMS.find((e) => e.id === id);
    // Never display an emblem the player has not actually reached.
    return found && level >= found.level ? found : null;
  } catch {
    return null;
  }
}

export function setSelectedEmblem(id: string | null): void {
  try {
    if (id) localStorage.setItem(EMBLEM_SELECTED_KEY, id);
    else localStorage.removeItem(EMBLEM_SELECTED_KEY);
    window.dispatchEvent(new CustomEvent(EMBLEM_EVENT));
  } catch {
    /* private mode */
  }
}
