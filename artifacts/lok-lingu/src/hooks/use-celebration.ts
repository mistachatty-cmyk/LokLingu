import { useState, useRef, useCallback } from 'react';
import { CELEBRATIONS, ALL_CELEBRATION_BY_ID, INTENSITY_CONFIG, addTokenBalance } from '@/lib/celebrations';
import type { CelebrationDef, CelebrationIntensity, SoundProfile } from '@/lib/celebrations';

const STORAGE_ACTIVE = 'lok-lingu-active-celebration';
const STORAGE_BOOST_UNLOCKED = 'lok-lingu-boost-unlocked';

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

  const addLifetimeTokens = useCallback((amount: number) => {
    const current = parseInt(localStorage.getItem('lok-lingu-lifetime-tokens') || '0');
    localStorage.setItem('lok-lingu-lifetime-tokens', String(current + amount));
    // Credit the same amount to the spendable balance (separate from the lifetime stat)
    addTokenBalance(amount);
  }, []);

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

    incrementLifetime(lang);

    const rate = boostActiveRef.current ? 4 : 2;
    tokensEarnedRef.current += rate;

    let tokenBonus = 0;
    let boostActivated = false;

    if (newCount % 25 === 0) {
      tokenBonus = 25;
      tokensEarnedRef.current += 25;
      addLifetimeTokens(25);
    }

    const celebrationId = localStorage.getItem(STORAGE_ACTIVE) || 'pinata';
    const celebration = ALL_CELEBRATION_BY_ID[celebrationId] || CELEBRATIONS[0];

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
