import { useState, useRef, useCallback } from 'react';
import { CELEBRATIONS, ALL_CELEBRATION_BY_ID, INTENSITY_CONFIG } from '@/lib/celebrations';
import type { CelebrationDef, CelebrationIntensity, SoundProfile } from '@/lib/celebrations';
import { earnTokens } from '@/lib/economy';
import { isDevMode } from '@/lib/dev-mode';

const STORAGE_ACTIVE = 'lok-lingu-active-celebration';
const STORAGE_BOOST_UNLOCKED = 'lok-lingu-boost-unlocked';
const STORAGE_BEST_STREAK = 'lok-lingu-best-streak';
const STORAGE_COMPANION_PREFIX = 'lok-lingu-companion-';
const STORAGE_BADGE_PREFIX = 'lok-lingu-badge-';
const STORAGE_SESSION_BEST = 'lok-lingu-session-best-words';
const STORAGE_ACHIEVEMENT_PREFIX = 'lok-lingu-achievement-';
const STORAGE_EQUIPPED_COMPANION = 'lok-lingu-equipped-companion';

/**
 * High-water mark for the in-run "Hundred" ladder. Without this, the
 * roadmap's match-track section had no way to show real progress — the
 * in-run counter itself resets to 0 on every new match, so nothing
 * survived to read on the roadmap page. Mirrors currentWords() in
 * lib/levels.ts: read-only projection of a counter the game already
 * writes, not a second source of truth.
 */
export function currentBestStreak(): number {
  return parseInt(localStorage.getItem(STORAGE_BEST_STREAK) || '0');
}

/**
 * High-water mark for words counted within a single run (game.tsx/draw.tsx
 * commit a run via resetMatch when the mic stops or the player navigates
 * away). There is no wall-clock "session" concept anywhere in the app —
 * this piggybacks on the existing in-run counter, the closest available
 * proxy, same pattern as currentBestStreak().
 */
export function currentSessionBestWords(): number {
  return parseInt(localStorage.getItem(STORAGE_SESSION_BEST) || '0');
}

export function getCompanionUnlocked(companionId: string): boolean {
  if (isDevMode()) return true;
  return localStorage.getItem(STORAGE_COMPANION_PREFIX + companionId) === 'true';
}

export function setCompanionUnlocked(companionId: string): void {
  localStorage.setItem(STORAGE_COMPANION_PREFIX + companionId, 'true');
}

export function getUnlockedCompanions(): string[] {
  const result: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_COMPANION_PREFIX)) {
      const companionId = key.replace(STORAGE_COMPANION_PREFIX, '');
      if (localStorage.getItem(key) === 'true') {
        result.push(companionId);
      }
    }
  }
  return result;
}

export function getUnlockedBadges(): string[] {
  if (isDevMode()) {
    return ['warm', 'rolling', 'deep-run', 'polyglot', 'streak-keeper', 'archivist'];
  }
  const result: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_BADGE_PREFIX)) {
      const badgeId = key.replace(STORAGE_BADGE_PREFIX, '');
      if (localStorage.getItem(key) === 'true') {
        result.push(badgeId);
      }
    }
  }
  return result;
}

export function setBadgeUnlocked(badgeId: string): void {
  localStorage.setItem(STORAGE_BADGE_PREFIX + badgeId, 'true');
}

export function getUnlockedAchievements(): string[] {
  if (isDevMode()) {
    return ['thousand-club', 'fr-food-baguette', 'ja-animals-shiba', 'es-greetings-saludo'];
  }
  const result: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_ACHIEVEMENT_PREFIX)) {
      const achievementId = key.replace(STORAGE_ACHIEVEMENT_PREFIX, '');
      if (localStorage.getItem(key) === 'true') {
        result.push(achievementId);
      }
    }
  }
  return result;
}

export function setAchievementUnlocked(achievementId: string): void {
  localStorage.setItem(STORAGE_ACHIEVEMENT_PREFIX + achievementId, 'true');
}

/**
 * The one companion riding along on the game screen (game.tsx/draw.tsx),
 * chosen from the roadmap gallery. Mirrors STORAGE_ACTIVE (celebration
 * pick) exactly: a single id, null meaning none equipped. Equipping an
 * unlocked companion doesn't re-check unlock state here — callers (the
 * gallery) only ever call this from an already-unlocked card.
 */
export function getEquippedCompanion(): string | null {
  return localStorage.getItem(STORAGE_EQUIPPED_COMPANION) || null;
}

export function setEquippedCompanion(companionId: string | null): void {
  if (companionId) {
    localStorage.setItem(STORAGE_EQUIPPED_COMPANION, companionId);
  } else {
    localStorage.removeItem(STORAGE_EQUIPPED_COMPANION);
  }
}

// Companion milestones: at-threshold pairs (sorted by words)
export const COMPANION_MILESTONES: { at: number; id: string }[] = [
  { at: 10, id: 'wren' },
  { at: 25, id: 'sparrow' },
  { at: 50, id: 'otter' },
  { at: 250, id: 'fox' },
  { at: 500, id: 'crane' },
  { at: 1000, id: 'wolf' },
  { at: 2500, id: 'tiger' },
  { at: 5000, id: 'whale' },
  { at: 10000, id: 'dragon' },
  { at: 20000, id: 'phoenix' },
  { at: 50000, id: 'leviathan' },
];

export function updateCompanionUnlocks(totalWords: number): void {
  for (const { at, id } of COMPANION_MILESTONES) {
    if (totalWords >= at && !getCompanionUnlocked(id)) {
      setCompanionUnlocked(id);
    }
  }
}

const STORAGE_REEARN_PREFIX = 'lok-lingu-reearned-';

/**
 * After prestiging, re-crossing a threshold whose companion is already
 * unlocked used to be a silent no-op. This pays the escalating re-earn
 * bonus once per (prestige cycle, companion) pair — idempotent via a
 * dedicated flag so remounts/re-renders never double-pay. Takes
 * `cycleWords` (prestige.ts's wordsInCurrentCycle) and `prestige` as
 * params rather than importing prestige.ts directly, to avoid a circular
 * import (prestige.ts already imports getAllLifetimeWords from here).
 */
export function payReearnBonuses(
  cycleWords: number,
  prestige: number,
  payBonus: () => void,
): void {
  if (prestige <= 0) return;
  for (const { at, id } of COMPANION_MILESTONES) {
    if (cycleWords < at) continue;
    if (!getCompanionUnlocked(id)) continue; // first-time unlock, not a re-earn
    const flagKey = `${STORAGE_REEARN_PREFIX}${prestige}-${id}`;
    if (localStorage.getItem(flagKey) === 'true') continue;
    localStorage.setItem(flagKey, 'true');
    payBonus();
  }
}

export function getAllLifetimeWords(): Record<string, number> {
  const result: Record<string, number> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('lok-lingu-lifetime-') && !key.includes('tokens')) {
      const lang = key.replace('lok-lingu-lifetime-', '');
      result[lang] = parseInt(localStorage.getItem(key) || '0');
    }
  }
  return result;
}

export function checkPolyglotBadge(): void {
  if (!getUnlockedBadges().includes('polyglot')) {
    const languages = Object.values(getAllLifetimeWords()).filter(count => count > 0);
    if (languages.length >= 3) {
      setBadgeUnlocked('polyglot');
    }
  }
}

// Deliberately NOT prefixed lok-lingu-lifetime- — every lok-lingu-lifetime-*
// key is scanned elsewhere (getAllLifetimeWords/getLifetimeWords/stats.tsx
// pie chart) and treated as "the rest of the key is a language code."
// A lok-lingu-lifetime-fr-food key would be misread as language "fr-food".
const CATEGORY_PREFIX = 'lok-lingu-category-';

/**
 * Per-language, per-category lifetime counter — sibling to the flat
 * lok-lingu-lifetime-{lang} counter, needed for category-flavor
 * achievements (e.g. "50 French food words"). Category is already a
 * first-class concept for picking word lists (offline-data.ts); this
 * just also tallies correct answers by it.
 */
export function incrementCategoryLifetime(lang: string, category: string): void {
  const key = `${CATEGORY_PREFIX}${lang}-${category}`;
  const current = parseInt(localStorage.getItem(key) || '0');
  localStorage.setItem(key, String(current + 1));
}

export function categoryWordCount(lang: string, category: string): number {
  return parseInt(localStorage.getItem(`${CATEGORY_PREFIX}${lang}-${category}`) || '0');
}

export function useCelebration() {
  const [matchCount, setMatchCount] = useState(0);
  const [milestone, setMilestone] = useState<{ celebration: CelebrationDef; intensity: CelebrationIntensity; sound: SoundProfile } | null>(null);
  const [boostActive, setBoostActive] = useState(false);
  const [boostTimeLeft, setBoostTimeLeft] = useState(0);
  const boostTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchCountRef = useRef(0);
  const boostActiveRef = useRef(false);
  const tokensEarnedRef = useRef(0);

  const activeCelebrationId = localStorage.getItem(STORAGE_ACTIVE) || 'pinata';

  const setActiveCelebration = useCallback((id: string) => {
    localStorage.setItem(STORAGE_ACTIVE, id);
  }, []);

  const boostUnlocked = localStorage.getItem(STORAGE_BOOST_UNLOCKED) === 'true';

  const lifetimeWords = useCallback((lang: string) => {
    return parseInt(localStorage.getItem(`lok-lingu-lifetime-${lang}`) || '0');
  }, []);

  const incrementLifetime = useCallback((lang: string) => {
    const key = `lok-lingu-lifetime-${lang}`;
    const current = parseInt(localStorage.getItem(key) || '0');
    localStorage.setItem(key, String(current + 1));
  }, []);

  const getLifetimeAll = useCallback(() => {
    const result: Record<string, number> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('lok-lingu-lifetime-')) {
        const lang = key.replace('lok-lingu-lifetime-', '');
        result[lang] = parseInt(localStorage.getItem(key) || '0');
      }
    }
    return result;
  }, []);

  const getLifetimeTokens = useCallback(() => {
    return parseInt(localStorage.getItem('lok-lingu-lifetime-tokens') || '0');
  }, []);

  /*
   * Routed through the economy module, NOT a raw localStorage write.
   *
   * main resolved this with a direct setItem plus addTokenBalance(). That
   * reintroduces the exact bug PROGRESSION.md bans: economy.ts dispatches the
   * `lok-economy` event on every mutation, and useEconomy() listens for it, so
   * a bare setItem leaves the wallet HUD and the shop showing a stale balance
   * until the next remount. earnTokens() covers both halves anyway — balance is
   * derived as `earned - spent`, so crediting `earned` credits the spendable
   * balance too, with no second counter to keep in sync.
   */
  const addLifetimeTokens = useCallback((amount: number) => earnTokens(amount), []);

  const stopBoost = useCallback(() => {
    if (boostTimerRef.current) {
      clearInterval(boostTimerRef.current);
      boostTimerRef.current = null;
    }
    setBoostActive(false);
    setBoostTimeLeft(0);
    boostActiveRef.current = false;
  }, []);

  const startBoost = useCallback(() => {
    stopBoost();
    setBoostActive(true);
    setBoostTimeLeft(180);
    boostActiveRef.current = true;
    boostTimerRef.current = setInterval(() => {
      setBoostTimeLeft((prev) => {
        if (prev <= 1) {
          stopBoost();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopBoost]);

  const incrementMatch = useCallback((lang: string): {
    milestoneHit: boolean;
    tokenBonus: number;
    tokensEarned: number;
    boostActivated: boolean;
  } => {
    matchCountRef.current += 1;
    const newCount = matchCountRef.current;
    setMatchCount(newCount);

    if (newCount > currentBestStreak()) {
      localStorage.setItem(STORAGE_BEST_STREAK, String(newCount));
    }

    if (newCount > currentSessionBestWords()) {
      localStorage.setItem(STORAGE_SESSION_BEST, String(newCount));
    }

    incrementLifetime(lang);

    const rate = boostActiveRef.current ? 4 : 2;
    tokensEarnedRef.current += rate;
    // The HUD shows "+2" (or "+4" under boost) on every hit, but until now
    // only the 25-match bonus was ever banked, so the promised tokens never
    // reached the wallet and nothing in the shop was affordable.
    addLifetimeTokens(rate);

    let tokenBonus = 0;
    let boostActivated = false;

    if (newCount % 25 === 0) {
      tokenBonus = 25;
      tokensEarnedRef.current += 25;
      addLifetimeTokens(25);
    }

    const celebrationId = localStorage.getItem(STORAGE_ACTIVE) || 'pinata';
    const celebration = ALL_CELEBRATION_BY_ID[celebrationId] || CELEBRATIONS[0];

    if (newCount === 5) {
      setBadgeUnlocked('warm');
    }

    if (newCount === 10) {
      setBadgeUnlocked('rolling');
    }

    if (newCount === 75) {
      setBadgeUnlocked('deep-run');
    }

    if (newCount % 100 === 0) {
      if (boostUnlocked) {
        startBoost();
        boostActivated = true;
      }
      setMilestone({ celebration, intensity: 'suBang', sound: celebration.soundProfile });
      return { milestoneHit: true, tokenBonus, tokensEarned: tokensEarnedRef.current, boostActivated };
    }

    if (newCount % 50 === 0) {
      if (!boostUnlocked) {
        localStorage.setItem(STORAGE_BOOST_UNLOCKED, 'true');
      }
      setMilestone({ celebration, intensity: 'big', sound: celebration.soundProfile });
      return { milestoneHit: true, tokenBonus, tokensEarned: tokensEarnedRef.current, boostActivated };
    }

    if (newCount % 25 === 0) {
      setMilestone({ celebration, intensity: 'mini', sound: celebration.soundProfile });
      return { milestoneHit: true, tokenBonus, tokensEarned: tokensEarnedRef.current, boostActivated };
    }

    return { milestoneHit: false, tokenBonus: 0, tokensEarned: tokensEarnedRef.current, boostActivated };
  }, [incrementLifetime, boostUnlocked, startBoost, addLifetimeTokens]);

  const clearMilestone = useCallback(() => {
    setMilestone(null);
  }, []);

  const resetMatch = useCallback(() => {
    matchCountRef.current = 0;
    tokensEarnedRef.current = 0;
    setMatchCount(0);
    stopBoost();
    clearMilestone();
  }, [stopBoost, clearMilestone]);

  return {
    matchCount,
    milestone,
    boostActive,
    boostTimeLeft,
    boostUnlocked,
    activeCelebrationId,
    tokensEarnedRef,
    setActiveCelebration,
    incrementMatch,
    clearMilestone,
    resetMatch,
    lifetimeWords,
    getLifetimeAll,
    getLifetimeTokens,
    addLifetimeTokens,
  };
}
