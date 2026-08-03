# Lok Lingu — Design Guide

## Overview

Lok Lingu is an **Infinite Language Arcade** — a voice-controlled and draw-controlled language learning game. Part of the Lock Services Ecosystem.

**Tech Stack:** React + TypeScript + Vite + Tailwind CSS v4 + Wouter + framer-motion + shadcn/ui + React Query

**Monorepo:** pnpm workspace with apps in `artifacts/` and libraries in `lib/`.

---

## File Tree & Descriptions

### `artifacts/lok-lingu/` — Main App

| Path | Description |
|---|---|
| `src/App.tsx` | Root component — ErrorBoundary → QueryClientProvider → TooltipProvider → WouterRouter → Layout + Switch routes (Home, Game, Draw, Leaderboard, Stats, Themes, Celebrations) |
| `src/index.css` | Tailwind v4 base. **31 themes** (A–E tiers) via CSS variable sets on `:root.theme-xxx` selectors. Animated backgrounds, starfields, ink washes, glow utilities. 1415 lines. |
| `src/hooks/use-theme.ts` | Theme state — localStorage key `lok-lingu-theme`. `Theme` union type (31 values). `ALL_THEMES` array. Applies/removes CSS class on `<html>`. |
| `src/hooks/use-user.ts` | User identity — localStorage keys `lok-lingu-userid`, `lok-lingu-username`. Returns `{ userId, username, saveUser }`. |
| `src/hooks/use-speech-recognition.ts` | Web Speech API wrapper. LANG_MAP (es→es-ES, fr→fr-FR, etc). Auto-restart with health check (4s inactivity → recreate). iOS `not-allowed` fixed via `userInitiated` param on `createRecognition()`. Exposes `isUnsupported`. |
| `src/hooks/use-celebration.ts` | Milestone engine (25/50/100 cycle). Token earnings (2/word base, 4/word boost). 2x boost (unlock at 50, activate at 100 for 3min). Lifetime word counters per language. Uses refs for synchronous access. |
| `src/hooks/use-celebration-sound.ts` | Web Audio API sound synthesizer. 10 sound profiles (burst, thud, clink, whoosh, boing, chime, splash, gong, rattle, ascend). Each built from oscillators + noise + filters. Intensity volume: mini=0.15, big=0.3, suBang=0.55. |
| `src/hooks/use-toast.ts` | Toast notification reducer. |
| `src/lib/celebrations.ts` | 10 celebration definitions. `CelebrationDef` interface (id, name, tier, emojiList, anim type, sound profile, bg color). `INTENSITY_CONFIG` (count, duration, emojiScale per mini/big/suBang). `CELEBRATIONS` array + `CELEBRATION_BY_ID` lookup. |
| `src/lib/utils.ts` | `cn()` — clsx + tailwind-merge. |
| `src/lib/speech-utils.ts` | `matchWord()` — fuzzy pronunciation matching. |
| `src/lib/stroke-matcher.ts` | Handwriting stroke comparison for Draw mode. |
| `src/components/layout.tsx` | Bottom nav bar (Home, Play, Ranks, Stats, Themes). Hidden on `/game` and `/draw` (fullscreen). |
| `src/components/celebration-effect.tsx` | Full-screen emoji particle overlay. 7 animation types: burst, rain, float, wave, bounce, shake, stampede. Screen shake on suBang. framer-motion `AnimatePresence`. |
| `src/components/draw-canvas.tsx` | Canvas-based drawing component with pointer inking. Color picker, ghost text guide, fadeOut animation, stroke counting. |
| `src/components/error-boundary.tsx` | React error boundary with fallback UI. |
| `src/pages/home.tsx` | Main menu. Logo, START button, Options drawer (language/category/mode), Profile slide-in (avatar, username, theme shop link, celebrations link, default language/category). Ad-hoc localStorage persistence. |
| `src/pages/game.tsx` | Voice game (fullscreen). Lives (3 hearts), streak counter, current word + translation, mic button with listening animation. Celebration overlay + boost timer. Game over → submit score + tokens. |
| `src/pages/draw.tsx` | Drawing game (fullscreen). Same structure as game but with DrawCanvas. Color palette (6 colors), ghost guide toggle, clear/done buttons. Celebration + boost integration. |
| `src/pages/leaderboard.tsx` | Rankings with language/category filters. Uses `useGetLeaderboard()`. |
| `src/pages/stats.tsx` | User profile + personal stats. Shows lifetime words per language, total tokens earned. Uses `useGetUserStats()`. |
| `src/pages/themes.tsx` | Theme shop. 31 theme cards across 5 tiers with preview colors, fonts, descriptions. Tier sections with pricing plans (Lock Pass, Lock Passport, Lifetime Passport). |
| `src/pages/celebrations.tsx` | Celebration shop. Milestone progress bar, 10 celebration cards with equip/preview. Grid + AnimatePresence. |
| `src/pages/not-found.tsx` | 404 page. |

### `components/ui/` — shadcn/ui Components (40+)

Standard Radix-based UI primitives: button, card, dialog, dropdown-menu, input, switch, tooltip, toast, select, tabs, accordion, badge, sheet, scroll-area, progress, skeleton, slider, etc. All use `--primary`, `--border`, `--muted` CSS variable theme tokens.

### `lib/` — Workspace Packages

| Path | Description |
|---|---|
| `lib/api-spec/` | OpenAPI spec (`openapi.yaml`) — defines `/words`, `/users`, `/scores`, `/leaderboard` endpoints. |
| `lib/api-zod/` | Auto-generated Zod schemas + TypeScript types from OpenAPI (via orval). Includes `Language`, `Word`, `Score`, `LeaderboardEntry`, etc. |
| `lib/api-client-react/` | Auto-generated React Query hooks from OpenAPI (via orval): `useGetLanguages()`, `useGetWords()`, `useSubmitScore()`, `useCreateUser()`, `useGetLeaderboard()`, `useGetUserStats()`, `useGetGlobalStats()`. |

### `artifacts/api-server/` — API Server

| Path | Description |
|---|---|
| `src/routes/scores.ts` | POST `/api/scores` — accepts `userId`, `language`, `category`, `count`, optional `tokensEarned`. Updates `users.token_balance` via SQL-side increment. |
| Other routes | User creation, word fetching, leaderboard queries. |

---

## Architecture Decisions

### State Management
- **No global state manager.** React Query for server state, localStorage for persistence, React useState/useRef for UI state.
- **Ad-hoc localStorage keys** — no SettingsProvider. Keys include `lok-lingu-lang`, `lok-lingu-cat`, `lok-lingu-mode`, `lok-lingu-theme`, `lok-lingu-userid`, `lok-lingu-username`, `lok-lingu-active-celebration`, `lok-lingu-boost-unlocked`, `lok-lingu-lifetime-{lang}`, `lok-lingu-lifetime-tokens`.

### Theme System
- 31 themes across 5 tiers, defined purely via CSS custom properties on `:root.theme-xxx` selectors.
- Tailwind v4 `@theme inline` block maps CSS variables to `--color-xxx` for use with `bg-background`, `text-primary`, etc.
- Theme switching: remove all `theme-xxx` classes from `<html>`, add new one.
- Special per-theme classes: `word-glow`, `neon-text-glow`, animated backgrounds, starfields, ink textures.

### Routing
- **Wouter** (lightweight hook-based router). No React Router. `useLocation()` returns `[path, setLocation]`.
- `<Switch>` with `<Route>` components. `<Layout>` wraps all routes but hides nav on `/game` and `/draw`.

### API Layer
- OpenAPI spec → orval codegen → React Query hooks + Zod schemas.
- Hooks auto-generated: `useGetLanguages`, `useGetWords`, `useSubmitScore`, `useCreateUser`, etc.
- Mutations use `mutation` config option for `onError` callbacks.

### Celebration System
- **Milestone cycle:** Every 25 words → Mini (celebration + 25 tokens). Every 50 words → Big (first time unlocks 2x Boost). Every 100 words → SU-BANG (activates 2x Boost for 3 minutes). Repeats forever (125/150/200 etc.).
- **Token economy:** 2 tokens/word base. 4 tokens/word during boost. +25 bonus at every 25th. Submitted to server at game over via `tokensEarned` field.
- **10 celebrations** with unique emoji lists, animation types, sound profiles, and colors.
- **7 animation types:** burst (radial explosion), rain (falling), float (rising), wave (horizontal sweep), bounce (vertical bounce), shake (wobble in place), stampede (horizontal rush).
- **10 sound profiles:** Each uses Web Audio API oscillators + noise buffers + filters. No audio files needed.

### Voice Recognition
- `userInitiated` flag on `createRecognition()` — when true, `not-allowed` error stops the engine. When false (auto-start), `not-allowed` is silently absorbed.
- Health check: 2s interval checks if 4s since last activity → recreate recognition.
- Auto-restart on `onend` (100ms delay).
- `isUnsupported` computed once via constructor check — used for fallback UI.

---

## Theme Variables (CSS)

Every theme defines:
- `--background`, `--foreground`, `--border`, `--input`, `--ring` (standard shadcn)
- `--card`, `--card-foreground`, `--card-border`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--radius`
- `--app-font-sans`, `--app-font-serif`, `--app-font-mono` (document fonts)
- `--word-font`, `--word-color`, `--word-glow` (game display)
- `--theme-tier` (A–E classification)
- `--opaque-button-border-intensity` (auto border contrast)

---

## Key Patterns

### New Page Setup
1. Create file in `src/pages/`. Default export component function.
2. Add `<Route>` in `src/App.tsx`.
3. Add nav link in `src/components/layout.tsx` (if not fullscreen).
4. Import API hooks from `@workspace/api-client-react`.

### New Hook
- Use `src/hooks/` directory.
- localStorage keys prefixed `lok-lingu-`.

### New shadcn Component
- Use `pnpm dlx shadcn@latest add <component-name>`.
- Component goes to `src/components/ui/`.

### CSS Variable Access
- Tailwind: `bg-background`, `text-primary`, `border-border`, etc.
- Direct: `hsl(var(--primary))`, `var(--word-font)`, etc.

---

## Future Development Notes

### Experimental Map Menu
- **Status:** Not yet built.
- **Plan:** New `/explore` route with choropleth world map. Gated behind `lok-lingu-experimental-map` localStorage flag (Switch toggle in home options drawer).
- **Packages needed:** `@bklitui/choropleth-chart` (shadcn), `@kokonutui/morphic-navbar`, `animejs`.
- **Data:** Language-to-country mapping: `{ es: ['ESP', 'MEX', 'ARG'...], ja: ['JPN'], ... }`. GeoJSON world data required.

### Settings Provider
- **Status:** Not built. Settings are ad-hoc localStorage.
- **Consideration:** May want to centralize into a context provider for consistency.

### Animated Themes (Category D)
- **Status:** Locked behind future "Kinetic Soul Update".
- **Note:** CSS + keyframe animations already defined, just need unlock mechanism.

### Lock Passport Ecosystem
- **Status:** UI in theme shop, purchase not yet wired.
- **Plans:** Lock Pass ($2.99/mo), Lock Passport ($10/mo), Lifetime Passport ($200).

### Monorepo Structure
```
C:\LokLingu\
├── artifacts\
│   ├── api-server/     # Express API server
│   ├── lok-lingu/      # React frontend app
├── lib\
│   ├── api-spec/       # OpenAPI spec
│   ├── api-zod/        # Generated Zod + TS types
│   ├── api-client-react/  # Generated React Query hooks
├── DESIGN_GUIDE.md     # This file
```
