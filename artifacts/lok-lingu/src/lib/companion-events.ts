/* ------------------------------------------------------------------
   Companion events — episodic beats that interrupt or decorate a run.

   See docs/EVENTS.md for the full catalogue and the design rules. This
   file is the *registry*: pure data plus the roll logic. Rendering lives
   in components/events/, orchestration in components/event-director.tsx.

   The point of the split is that adding an event should be a data row
   and one small component, never a change to the loop. `companions.ts`
   grew one bespoke optional field per companion precisely because there
   was no seam like this.

   ── Severity tiers ──
   What an event is allowed to cost, agreed with the user:

     T0 cosmetic  costs nothing. Blur, eclipse, affective beats.
     T1 tempo     costs seconds or tokens. Scratch card, fog, word search.
     T2 resource  can cost a skip or a token stack. Bot-Loko, glitch trade.
     T3 stakes    can cost a heart or a streak — ONLY on a telegraphed,
                  opt-in, high-reward beat the player knowingly accepted.
                  Never a surprise.

   ── The invariant that never bends ──
   No event may write to the Leitner review queue (lib/review.ts),
   lifetime word counts, or per-language counters. This generalises the
   rule Sir Baguette's guest word already follows: theatrics must never
   corrupt learning data or fraudulently trip checkPolyglotBadge().

   ── The occlusion amendment ──
   docs/COMPANIONS.md's founding rule is "never occlude the word". An
   event may obscure it ONLY while answering is blocked and clearing the
   obstruction is the event's own win condition. The moment answering is
   live again, the word is fully legible.
------------------------------------------------------------------ */

import type { EventFrequency } from '@/hooks/use-settings';

export type EventTier = 'T0' | 'T1' | 'T2' | 'T3';

export type EventId = 'blurred-word' | 'scratch-card' | 'bot-loko' | 'eclipse';

export interface CompanionEventDef {
  id: EventId;
  name: string;
  /** One line, for docs and for the settings preview. */
  blurb: string;
  tier: EventTier;
  /** Relative likelihood against every other eligible event. */
  weight: number;
  /** Does this event suspend answering while it runs? */
  blocking: boolean;
  /** Not before this many words into a run — nobody gets ambushed on word 1. */
  minWords: number;
  /** Hard ceiling per run, so no event can dominate a session. */
  maxPerRun: number;
  /**
   * Auto-resolve in the player's favour after this long. Every blocking
   * event needs one: a player who cannot perform the gesture (motor
   * difficulty, a dead touch digitiser, simply not understanding) must
   * never be trapped. Non-blocking events use it as their natural length.
   */
  durationMs: number;
  /**
   * True if this event mounts a GestureSurface over the play area.
   *
   * Draw mode owns the canvas — `COMPANIONS.md`'s standing rule — so a
   * *non-blocking* pointer event there would silently swallow strokes
   * while the player is still expected to be drawing. Blocking ones are
   * fine: answering is suspended anyway, so pausing the canvas with it is
   * coherent rather than a trap.
   */
  needsPointer?: boolean;
}

export const COMPANION_EVENTS: CompanionEventDef[] = [
  {
    id: 'blurred-word',
    name: 'Blurred Word',
    blurb: 'The word goes soft for a moment, then sharpens back.',
    tier: 'T0',
    weight: 40,
    blocking: false,
    minWords: 3,
    maxPerRun: 6,
    durationMs: 3600,
  },
  {
    id: 'scratch-card',
    name: 'Scratch Card',
    blurb: 'The word hides under a scratch panel — clear it to answer.',
    tier: 'T1',
    weight: 25,
    blocking: true,
    minWords: 5,
    maxPerRun: 3,
    durationMs: 7000,
    needsPointer: true,
  },
  {
    id: 'eclipse',
    name: 'The Eclipse',
    blurb: 'A dark disc transits the word. Tap to nudge it along.',
    tier: 'T0',
    weight: 30,
    blocking: false,
    minWords: 3,
    maxPerRun: 6,
    durationMs: 4200,
    needsPointer: true,
  },
  {
    id: 'bot-loko',
    name: 'Bot-Loko',
    blurb: 'A retrieval drone comes for a skip. Slash it before it lands.',
    tier: 'T2',
    weight: 20,
    blocking: false,
    minWords: 8,
    maxPerRun: 2,
    durationMs: 5200,
    needsPointer: true,
  },
];

export const EVENT_BY_ID = new Map(COMPANION_EVENTS.map((e) => [e.id, e]));

/**
 * Base chance that *any* event fires on a given word, before per-event
 * weighting. Tuned so `normal` lands roughly one event every ~12 words —
 * frequent enough to feel alive, rare enough that it never stops being a
 * surprise.
 */
const FREQUENCY_CHANCE: Record<EventFrequency, number> = {
  off: 0,
  low: 0.035,
  normal: 0.085,
  high: 0.18,
};

export interface RollContext {
  frequency: EventFrequency;
  /** Words answered correctly this run. */
  wordCount: number;
  /** How many times each event has already fired this run. */
  firedCounts: Partial<Record<EventId, number>>;
  /** Events this companion makes more or less likely. */
  weightMults?: Partial<Record<EventId, number>>;
  /** True while another event is mid-flight, or inside the global cooldown. */
  suppressed: boolean;
  /**
   * False where the screen already owns the pointer for answering — draw
   * mode's canvas. Non-blocking pointer events are dropped from the roll
   * there rather than competing for strokes.
   */
  pointerFree?: boolean;
}

/**
 * Picks an event for this word, or null for the (usual) quiet case.
 *
 * Deliberately rolls the gate *first* and the specific event second, so
 * frequency stays honest: adding a new event to the registry makes the
 * mix richer without making interruptions more common.
 */
export function rollEvent(ctx: RollContext): CompanionEventDef | null {
  if (ctx.suppressed) return null;
  const chance = FREQUENCY_CHANCE[ctx.frequency] ?? 0;
  if (chance <= 0) return null;
  if (Math.random() >= chance) return null;

  const eligible = COMPANION_EVENTS.filter((e) => {
    if (ctx.wordCount < e.minWords) return false;
    if ((ctx.firedCounts[e.id] ?? 0) >= e.maxPerRun) return false;
    if (e.needsPointer && !e.blocking && ctx.pointerFree === false) return false;
    return (e.weight * (ctx.weightMults?.[e.id] ?? 1)) > 0;
  });
  if (eligible.length === 0) return null;

  const weights = eligible.map((e) => e.weight * (ctx.weightMults?.[e.id] ?? 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < eligible.length; i++) {
    if (roll < weights[i]) return eligible[i];
    roll -= weights[i];
  }
  return eligible[eligible.length - 1];
}

/** Quiet window after any event, so two never land back to back. */
export const EVENT_COOLDOWN_MS = 6000;
