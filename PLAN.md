# LokLingu — Master Implementation Plan
**Created:** July 23, 2026  
**Context:** Complete overhaul after comprehensive codebase audit

---

## 📋 Overview

A 6-phase plan covering ~30 tasks across the entire LokLingu codebase.
Phases build on each other; Phase 0 is the deployment blocker.

---

## 🔧 Phase 0: Vercel Deployment Fix

| Status | Task | Description |
|--------|------|-------------|
| DONE | Verify build succeeds |  ✅ `pnpm run build` succeeds for all packages |
| DONE | Fix `api/index.ts` |  ✅ Imports from built `dist/index.mjs` instead of raw TS |
| DONE | Update `vercel.json` |  ✅ Ensure proper build pipeline includes API bundling |
| DONE | Add `.vercel` ignore |  ✅ Exclude unnecessary workspace artifacts |

---

## 🔧 Phase 1: Foundation Fixes

### 1.1 Speaker Button (Mic → Speaker)
**Problem:** No TTS playback — user can't hear word pronunciation.
**Solution:** Add `window.speechSynthesis` speaker button to game & draw pages.
**Files:** `game.tsx`, `draw.tsx`, `lib/speech-utils.ts`

### 1.2 Word Pop Celebrations
**Problem:** Celebrations only at milestones (25/50/100), no per-word feedback.
**Solution:** Add mini emoji pop on every correct word. Fix timing conflicts.
**Files:** `celebration-effect.tsx`, `game.tsx`, `draw.tsx`

### 1.3 Font Picker
**Problem:** Fonts are theme-bound only.
**Solution:** Standalone font selector setting CSS vars independently.
**Files:** `components/font-picker.tsx`, `home.tsx`, `index.css`

### 1.4 Voice Recognition Perfection
**Problem:** LANG_MAP only covers 5 of 17 languages.
**Solution:** Expand LANG_MAP, add push-to-talk mode, optimize health check.
**Files:** `hooks/use-speech-recognition.ts`, `lib/speech-utils.ts`

### 1.5 Theme World Visibility
**Problem:** Some themes may make the choropleth map unreadable.
**Solution:** Add map-specific CSS vars per theme. Ensure contrast on all 32 themes.
**Files:** `choropleth-map.tsx`, `index.css`

### 1.6 Nav Menu — Classic Default + Toggle
**Problem:** Only morphic collapsing pill nav exists. User wants classic bottom tabs.
**Solution:** Create classic tab bar, make default, add toggle in settings.
**Files:** `components/classic-navbar.tsx`, `morphic-navbar.tsx`, `layout.tsx`, `home.tsx`

### 1.7 Default Baskin Theme + Alternates
**Problem:** Default is `theme-neon`, no theme alternates system.
**Solution:** Create `theme-baskin` (rainbow/31-flavors), make default. Add alternates system per theme (like LoL skins).
**Files:** `use-theme.ts`, `index.css`, `pages/themes.tsx`

---

## 📊 Phase 2: Charts & Visualizations

### 2.1 Install recharts
Used: `recharts` (already in deps) — Pie, Radar, ResponsiveContainer

### 2.2 Pie Chart — Progress Percentage
Words-by-language pie with percentage labels on `stats.tsx`

### 2.3 Radar Chart — Language Data
Per-language radar on `explore.tsx`: speakers, countries, categories, difficulty

### 2.4 Enhanced Language Data
Add population, speaker counts, writing system, official status to `language-countries.ts`

### 2.5 Color Separation
Distinct accessible palettes mapped to `LANGUAGE_COUNTRIES` colors

---

## 🎨 Phase 3: Anime.js Design Engine

### 3.1 Design Engine
`lib/design-engine.ts` — anime.js wrapper with reusable presets
(wordReveal, celebrationPop, pageTransition, micPulse, themeTransition, scorePop)

### 3.2 Celebration Integration
Add anime.js particle system as optional celebration engine

### 3.3 Theme Animations
Animate per-theme effects (aurora, nebula, cyberwave) via anime.js

---

## 🚀 Phase 4: Features — 15 Items

### Core Game (5)
| # | Feature |
|---|---------|
| 4.1 | Word Detail Panel (IPA, examples, etymology, frequency) |
| 4.2 | Streak Calendar Heatmap |
| 4.3 | Smart Review (spaced repetition) |
| 4.4 | Speed Mode (timed) |
| 4.5 | Multiplayer Quick Match (basic) |

### Language-Focused (5)
| # | Feature |
|---|---------|
| 4.6 | Gender + Grammar Tags (el/la, der/die/das) |
| 4.7 | IPA + Pronunciation Expansion |
| 4.8 | Dialect Variant Notes |
| 4.9 | Written Form Display (kanji, pinyin, script) |
| 4.10 | Cultural Context Cards |

### UX & Polish (5)
| # | Feature |
|---|---------|
| 4.11 | Achievement Badges |
| 4.12 | Quick Language Switcher |
| 4.13 | Daily Challenge |
| 4.14 | Font Preview in Settings |
| 4.15 | Sound Pack Shop |

---

## 🧩 Phase 5: Theme Alternates + Inventory

### 5.1 Theme Alternates System
Modular sub-variants per theme (like LoL champion skins)

### 5.2 Inventory Page  ✅
`/inventory` route, shared theme data module, nav link in classic navbar + profile

### 5.3 Shop Ownership Tracking
localStorage tracking for purchased/unlocked items
→ Inventory page reads `lok-lingu-lifetime-tokens` and owned/active items

---

## 🧹 Phase 6: Integration & Polish

### 6.1 Settings Provider
Centralized `use-settings.ts` context

### 6.2 Stats Overhaul
Pie + radar + streak calendar + badges

### 6.3 Explore Enhanced
Radar chart + population data + nearby languages

### 6.4 Celebration Polish
Ensure all animations trigger correctly

---

## 📁 File Inventory

**New files (~25):**
- `PLAN.md`, `lib/design-engine.ts`, `lib/speech-utils.ts` (enhanced), `hooks/use-settings.ts`
- `components/font-picker.tsx`, `components/classic-navbar.tsx`, `components/progress-pie.tsx`
- `components/language-radar.tsx`, `pages/inventory.tsx`
- `data/language-details.ts`
- Various feature components

**Modified files (~40):**
- `game.tsx`, `draw.tsx`, `home.tsx`, `stats.tsx`, `explore.tsx`, `themes.tsx`, `celebrations.tsx`
- `layout.tsx`, `morphic-navbar.tsx`, `celebration-effect.tsx`, `choropleth-map.tsx`
- `use-theme.ts`, `use-speech-recognition.ts`, `use-celebration.ts`
- `index.css`, `App.tsx`, `vercel.json`, `api/index.ts`
- `data/language-countries.ts`, `lib/celebrations.ts`, `lib/offline-data.ts`
