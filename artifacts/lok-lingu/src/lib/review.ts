/* ------------------------------------------------------------------
   Review scheduling — the difference between testing and teaching.

   Before this module the app had no memory of failure at all. A missed
   word flashed red for 500ms and was then discarded; words were served
   by `wordIndex++`, so a player learned the *order* of the list rather
   than the words in it. Nothing ever came back sooner because you got
   it wrong.

   This is a Leitner box scheduler adapted for an arcade pace. Classic
   Leitner uses day-scale intervals, which are useless inside a
   five-minute session, so scheduling works on two timescales:

     - *Within a session*, box number becomes a selection weight. A word
       you just missed sits in box 0 and is ~8x more likely to be drawn
       than one you have mastered. This is what makes the loop teach.
     - *Across sessions*, box number maps to a day interval that decides
       what counts as "due" for the review queue and the weak-word list.

   Sequential order is preserved where it is genuinely meaningful — the
   infinite number generator is ordinal, and shuffling counting would be
   nonsense. Callers opt in via `shouldSchedule()`.
------------------------------------------------------------------ */

import { getWordNote, saveWordNote, type WordNote } from './journal';

/** Box 0 = just missed, box 4 = mastered. */
export const MAX_BOX = 4;

/** Selection weight per box. Steep on purpose: struggling words dominate. */
const BOX_WEIGHT = [8, 5, 3, 2, 1];

/** Weight for a word with no record yet — new material matters too. */
const UNSEEN_WEIGHT = 6;

/** Days before a word in each box is considered due again. */
const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 21];

const DAY_MS = 86_400_000;

/**
 * Categories that are inherently ordered. Counting to twenty in order is
 * the point; drawing "seventeen" before "three" is not review, it's noise.
 */
const SEQUENTIAL_CATEGORIES = new Set(['numbers']);

export function shouldSchedule(category: string): boolean {
  return !SEQUENTIAL_CATEGORIES.has(category);
}

/**
 * The box a word currently sits in. Records predate this field, so it is
 * derived from the hit history when absent rather than defaulting to 0 —
 * otherwise every previously-mastered word would suddenly look urgent.
 */
export function boxOf(note: WordNote | null): number {
  if (!note) return -1; // unseen
  if (typeof note.box === 'number') return Math.min(MAX_BOX, Math.max(0, note.box));
  const misses = note.attempts - note.correctCount;
  if (misses > 0 && note.correctCount === 0) return 0;
  return Math.min(MAX_BOX, note.correctCount);
}

/**
 * Records one attempt and moves the word between boxes.
 *
 * Note this deliberately supersedes `journal.recordWordAttempt`, which
 * silently did nothing when the word had no note yet — meaning it could
 * never record a first attempt, which is the only one that matters for a
 * word you have never seen.
 */
export function recordAttempt(lang: string, word: string, correct: boolean): void {
  const existing = getWordNote(lang, word);
  const prevBox = boxOf(existing);

  const note: WordNote = existing ?? {
    lang,
    word,
    firstSeen: Date.now(),
    notes: '',
    starred: false,
    attempts: 0,
    correctCount: 0,
  };

  note.attempts += 1;
  if (correct) note.correctCount += 1;
  // A miss drops straight to box 0. Promotion is one step at a time.
  note.box = correct ? Math.min(MAX_BOX, Math.max(0, prevBox) + 1) : 0;
  note.lastSeen = Date.now();
  saveWordNote(note);
}

/** True when enough time has passed for this word to be worth revisiting. */
export function isDue(note: WordNote): boolean {
  const box = boxOf(note);
  if (box <= 0) return true;
  const interval = BOX_INTERVAL_DAYS[Math.min(box, MAX_BOX)] * DAY_MS;
  return Date.now() - (note.lastSeen ?? note.firstSeen) >= interval;
}

/** Accuracy in 0–1. Unattempted words report 0. */
export function accuracy(note: WordNote): number {
  return note.attempts > 0 ? note.correctCount / note.attempts : 0;
}

/**
 * Picks the next word index, weighted so struggling words resurface.
 *
 * `recent` holds the last few indices served; they are excluded so the
 * same word never appears twice in a row, which would otherwise happen
 * often once a word is stuck in box 0.
 */
export interface LengthBias {
  prefer: 'short' | 'long' | 'random';
  /** 0 = no effect, 1 = the strongest nudge allowed. */
  strength: number;
}

/**
 * Multiplier applied to a word's selection weight for a length-biased
 * companion (the Mi family).
 *
 * Bounded to [0.5, 1.5] by construction, and **never zero**. That bound
 * is the guard rail, not a tuning choice: a companion may nudge which of
 * the eligible words comes up next, but it must never be able to remove
 * one from consideration. A word that is genuinely due for review stays
 * reachable no matter who is equipped.
 */
function lengthFactor(bias: LengthBias, word: string, minLen: number, maxLen: number): number {
  const s = Math.max(0, Math.min(1, bias.strength));
  if (s === 0) return 1;
  // Rando-Mi: the swing is the mechanic, so it is re-rolled per word
  // rather than derived from length at all.
  if (bias.prefer === 'random') return 1 + s * (Math.random() * 2 - 1) * 0.5;
  if (maxLen === minLen) return 1;
  const t = (word.length - minLen) / (maxLen - minLen);
  const want = bias.prefer === 'long' ? t : 1 - t;
  return 1 + s * (want * 2 - 1) * 0.5;
}

export function pickNextIndex(
  lang: string,
  words: string[],
  recent: number[] = [],
  lengthBias?: LengthBias,
): number {
  if (words.length === 0) return 0;
  if (words.length === 1) return 0;

  // Never exclude so much that nothing is left to choose from.
  const blocked = new Set(recent.slice(-Math.min(recent.length, Math.floor(words.length / 2))));

  const lengths = words.map((w) => w.length);
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);

  let total = 0;
  const weights = words.map((word, i) => {
    if (blocked.has(i)) return 0;
    const note = getWordNote(lang, word);
    const box = boxOf(note);
    const base = box < 0 ? UNSEEN_WEIGHT : BOX_WEIGHT[Math.min(box, MAX_BOX)];
    // Length bias is a tiebreaker *inside* the eligible set, applied on
    // top of the Leitner weight rather than replacing it — the scheduler
    // stays in charge of what needs reviewing.
    const w = lengthBias ? base * lengthFactor(lengthBias, word, minLen, maxLen) : base;
    total += w;
    return w;
  });

  if (total <= 0) return (recent[recent.length - 1] ?? -1) + 1 >= words.length ? 0 : words.length - 1;

  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.findIndex((w) => w > 0);
}

export interface WeakWord {
  word: string;
  lang: string;
  attempts: number;
  correctCount: number;
  accuracy: number;
  box: number;
}

/**
 * Words the player keeps getting wrong, worst first. Only words with a
 * real miss are included — a word answered correctly on its only attempt
 * is not a weakness, it just has a small sample.
 */
export function getWeakWords(notes: WordNote[], limit = 20): WeakWord[] {
  return notes
    .filter((n) => n.attempts > 0 && n.correctCount < n.attempts)
    .map((n) => ({
      word: n.word,
      lang: n.lang,
      attempts: n.attempts,
      correctCount: n.correctCount,
      accuracy: accuracy(n),
      box: boxOf(n),
    }))
    // Worst accuracy first; break ties by who has struggled more often.
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, limit);
}

/* ------------------------- session tracking ------------------------- */

export interface SessionEntry {
  word: string;
  correct: boolean;
}

export interface SessionSummary {
  total: number;
  correct: number;
  accuracy: number;
  missed: string[];
}

/**
 * A run's attempts, held in memory only. Voice mode had no end state at
 * all — a run simply stopped when the mic did — so there was never a
 * moment to reflect on what just happened. This backs that moment.
 */
export function summarise(entries: SessionEntry[]): SessionSummary {
  const total = entries.length;
  const correct = entries.filter((e) => e.correct).length;
  const missed: string[] = [];
  for (const e of entries) {
    if (!e.correct && !missed.includes(e.word)) missed.push(e.word);
  }
  return {
    total,
    correct,
    accuracy: total > 0 ? correct / total : 0,
    missed,
  };
}
