/* ------------------------------------------------------------------
   Backing flags for the three "special" cards in data/achievements.ts
   (Speed Demon, Perfectionist, Night Owl) whose conditions used to be
   unrelated stand-ins for what their label/desc actually promised:

     speed-demon:   condition was `totalWords >= 10` (any 10 words,
                    ever) but the card reads "10 words in 30 seconds".
     perfectionist: condition was `totalGames >= 1` (any game at all)
                    but the card reads "zero mistakes".
     night-owl:     condition was `lifetimeTokens > 0` (any tokens at
                    all) but the card reads "play after midnight".

   Each now has a real check, called from the two play screens
   (game.tsx, draw.tsx) at the point the behaviour actually happens,
   and persisted as a simple earned-once flag — matching how every
   other one-shot unlock in this app is stored (see e.g.
   STORAGE_BOOST_UNLOCKED in use-celebration.ts).
------------------------------------------------------------------ */

const PERFECT_GAME_KEY = 'lok-lingu-perfect-game';
const SPEED_DEMON_KEY = 'lok-lingu-speed-demon';
const NIGHT_OWL_KEY = 'lok-lingu-night-owl';

export function hasPerfectGame(): boolean {
  return localStorage.getItem(PERFECT_GAME_KEY) === 'true';
}

export function hasSpeedDemon(): boolean {
  return localStorage.getItem(SPEED_DEMON_KEY) === 'true';
}

export function hasNightOwl(): boolean {
  return localStorage.getItem(NIGHT_OWL_KEY) === 'true';
}

/** A run needs at least this many attempts to count — otherwise stopping
 *  after one lucky word would trivially "complete a perfect game". */
const MIN_PERFECT_ATTEMPTS = 5;

/** Call once when a run ends (commitRun in game.tsx, hearts-exhausted in
 *  draw.tsx), with the run's full attempt log. */
export function checkPerfectGame(log: { correct: boolean }[]): void {
  if (log.length >= MIN_PERFECT_ATTEMPTS && log.every((e) => e.correct)) {
    localStorage.setItem(PERFECT_GAME_KEY, 'true');
  }
}

const SPEED_WINDOW_MS = 30_000;
const SPEED_COUNT = 10;

/** Call on every correct hit, after pushing Date.now() onto the caller's
 *  own timestamp ref. Checks whether SPEED_COUNT hits landed within the
 *  trailing SPEED_WINDOW_MS window ending at the most recent hit. */
export function checkSpeedDemon(hitTimestamps: number[]): void {
  if (hitTimestamps.length < SPEED_COUNT) return;
  const now = hitTimestamps[hitTimestamps.length - 1];
  const windowStart = now - SPEED_WINDOW_MS;
  const inWindow = hitTimestamps.filter((t) => t >= windowStart).length;
  if (inWindow >= SPEED_COUNT) {
    localStorage.setItem(SPEED_DEMON_KEY, 'true');
  }
}

/** Call once on mount. "After midnight" reads as the small hours, not
 *  literally 00:00:00 — local time 00:00-03:59. */
export function checkNightOwl(): void {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 4) {
    localStorage.setItem(NIGHT_OWL_KEY, 'true');
  }
}
