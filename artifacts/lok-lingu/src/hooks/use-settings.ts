import { useState } from "react";

export type CursorId =
  | "default"
  | "crosshair"
  | "dot"
  | "neon-arrow"
  | "pixel"
  | "star"
  | "wand";

export type MatchTolerance = "strict" | "normal" | "loose";

export interface GameSettings {
  heartsMode: boolean;
  autoSpeak: boolean;
  cursor: CursorId;
  matchTolerance: MatchTolerance;
  ttsVolume: number; // 0–1
  ttsRate: number;   // 0.5–1.5
}

const KEYS: Record<keyof GameSettings, string> = {
  heartsMode:    "lok-lingu-hearts",
  autoSpeak:     "lok-lingu-auto-speak",
  cursor:        "lok-lingu-cursor",
  matchTolerance:"lok-lingu-tolerance",
  ttsVolume:     "lok-lingu-tts-volume",
  ttsRate:       "lok-lingu-tts-rate",
};

const DEFAULTS: GameSettings = {
  heartsMode:    true,
  autoSpeak:     false,
  cursor:        "default",
  matchTolerance:"normal",
  ttsVolume:     1,
  ttsRate:       0.85,
};

function read<T>(key: string, def: T, parse: (v: string) => T): T {
  const s = localStorage.getItem(key);
  if (s === null) return def;
  try { return parse(s); } catch { return def; }
}

export function useSettings() {
  const [heartsMode, _setHeartsMode] = useState(() =>
    read(KEYS.heartsMode, DEFAULTS.heartsMode, (v) => v === "true")
  );
  const [autoSpeak, _setAutoSpeak] = useState(() =>
    read(KEYS.autoSpeak, DEFAULTS.autoSpeak, (v) => v === "true")
  );
  const [cursor, _setCursor] = useState<CursorId>(() =>
    read(KEYS.cursor, DEFAULTS.cursor, (v) => v as CursorId)
  );
  const [matchTolerance, _setTolerance] = useState<MatchTolerance>(() =>
    read(KEYS.matchTolerance, DEFAULTS.matchTolerance, (v) => v as MatchTolerance)
  );
  const [ttsVolume, _setTtsVolume] = useState(() =>
    read(KEYS.ttsVolume, DEFAULTS.ttsVolume, parseFloat)
  );
  const [ttsRate, _setTtsRate] = useState(() =>
    read(KEYS.ttsRate, DEFAULTS.ttsRate, parseFloat)
  );

  function set<K extends keyof GameSettings>(key: K, val: GameSettings[K]) {
    localStorage.setItem(KEYS[key], String(val));
    if (key === "heartsMode")    _setHeartsMode(val as boolean);
    if (key === "autoSpeak")     _setAutoSpeak(val as boolean);
    if (key === "cursor")        _setCursor(val as CursorId);
    if (key === "matchTolerance") _setTolerance(val as MatchTolerance);
    if (key === "ttsVolume")     _setTtsVolume(val as number);
    if (key === "ttsRate")       _setTtsRate(val as number);
  }

  return { heartsMode, autoSpeak, cursor, matchTolerance, ttsVolume, ttsRate, set };
}

/** Read settings without a hook (for non-React code) */
export function readSettings(): GameSettings {
  return {
    heartsMode:    read(KEYS.heartsMode,    DEFAULTS.heartsMode,    (v) => v === "true"),
    autoSpeak:     read(KEYS.autoSpeak,     DEFAULTS.autoSpeak,     (v) => v === "true"),
    cursor:        read(KEYS.cursor,        DEFAULTS.cursor,        (v) => v as CursorId),
    matchTolerance:read(KEYS.matchTolerance,DEFAULTS.matchTolerance,(v) => v as MatchTolerance),
    ttsVolume:     read(KEYS.ttsVolume,     DEFAULTS.ttsVolume,     parseFloat),
    ttsRate:       read(KEYS.ttsRate,       DEFAULTS.ttsRate,       parseFloat),
  };
}
