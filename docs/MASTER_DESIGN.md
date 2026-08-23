# Master Design Sheet

**What this is:** a single-page reference to the whole app — every route,
every screen's purpose/components/states, every progression and economy
system, and a place to park design references and backlog ideas. Written so
the next edit or bug fix can be scoped from this doc instead of re-reading
the whole codebase.

**How to keep it current:** when a route, screen, or economy/progression
rule changes, update the matching row here in the same PR. This doc
summarizes and links `docs/COMPANIONS.md`, `docs/EVENTS.md`,
`docs/PROGRESSION.md`, `docs/DRAW_MODE.md`, and `docs/SAVES.md` rather than
duplicating their detail — when companion/event/economy specifics change,
those docs are the source of truth; update the summary here only if the
shape of the summary itself goes stale.

---

## Part 1 — System Architecture & Feature Inventory

### App shell & routing

All routes are declared in `src/App.tsx`. `Router()` wraps every route with
`useTheme()` / `useCustomFonts()` and mounts `<SeasonLayer/>`,
`<LiquidGlassCursor/>`, and `<DevOverlay/>` as siblings of `Layout` — these
three are global and not part of any individual page.

| Path | Component | File | Nav-visible |
|---|---|---|---|
| `/` | Home | `src/pages/home.tsx` | ✓ |
| `/game` | Voice mode | `src/pages/game.tsx` | shell bypassed |
| `/draw` | Draw mode | `src/pages/draw.tsx` | shell bypassed |
| `/leaderboard` | Leaderboard | `src/pages/leaderboard.tsx` | ✓ |
| `/stats` | Stats | `src/pages/stats.tsx` | ✓ |
| `/themes` | Shop | `src/pages/themes.tsx` | ✓ |
| `/celebrations` | Celebrations gallery | `src/pages/celebrations.tsx` | not in nav |
| `/explore` | World map | `src/pages/explore.tsx` | ✓ |
| `/inventory` | Inventory | `src/pages/inventory.tsx` | ✓ (Items) |
| `/roadmap` | Roadmap / gallery | `src/pages/roadmap.tsx` | ✓ (Map) |
| `/journal` | Journal / review | `src/pages/journal.tsx` | ✓ |
| `/library` | LokLibrary | `src/pages/library.tsx` | not in nav (linked from Home) |
| `/loksets` | LokSets | `src/pages/loksets.tsx` | not in nav (linked from Home) |
| `/canvas-design` | Canvas design tool | `src/pages/canvas-design.tsx` | not in nav |
| `/onboarding` | FTUE tour | `src/pages/onboarding.tsx` | not in nav (re-runnable from Settings) |
| `/settings` | Settings | `src/pages/settings.tsx` | not in nav (linked from Home) |
| *(anything else)* | 404 | `src/pages/not-found.tsx` | — |

**Shell** (`src/components/layout.tsx`): `/game` and `/draw` deliberately
bypass the standard shell — full-bleed, no navbar, so the play surface owns
the whole viewport. Every other route gets `h-[100dvh]` flex-col →
scrollable `main` (`overflow-y-auto`, `min-h-0`) → a bottom navbar. The
navbar style itself is chosen at runtime via
`localStorage['lok-lingu-nav-style']`:

| Style | Component | Items |
|---|---|---|
| Classic (default) | `src/components/classic-navbar.tsx` | Explore, Ranks (`/leaderboard`), Stats, Map (`/roadmap`), Journal, Themes, Items (`/inventory`) |
| Morphic | `src/components/morphic-navbar.tsx` | Home, Explore, Ranks, Stats, Roadmap, Themes, Items |

Both navbars render `null` on `/game`/`/draw`.

### Onboarding Flow (FTUE)

`src/pages/onboarding.tsx`, `STEPS` array, `ESSENTIAL_STEPS = 3`. Mounted as
a translucent overlay over Home (not a full-page takeover) so the app stays
visible behind the tour.

| # | Step id | Title | Required | What it does |
|---|---|---|---|---|
| 1 | `welcome` | Welcome | Static | Intro card, no input |
| 2 | `username` | (name + language) | **Yes** — the only gating step | Username field (leaderboard display name) + Starting Language select (es/fr/de/ja/pt/zh) |
| 3 | `modes` | Pick how you play | No | Voice vs. Draw picker; writes `lok-lingu-mode`, launched by "Start playing" |
| — | **fork** | — | — | At step 3: **"Start playing"** (primary — jumps straight into the chosen mode) vs. **"See the rest"** (secondary — continues to 6 optional reference screens) |
| 4 | `levels` | Levels | Optional | Static explainer: Level 1–100, then Prestige |
| 5 | `prestige` | Prestige | Optional | Static explainer: level resets, companions/badges/items don't |
| 6 | `shop` | Shop | Optional | Static explainer: token skins, themes, seasons, fonts |
| 7 | `roadmap` | Roadmap | Optional | Static explainer: companions, badges, achievements |
| 8 | `journal` | Journal | Optional | Static explainer: missed words come back sooner |
| 9 | `ready` | That's it | Optional | Launch screen, "Re-run this tour from Settings" |

`finish()` writes `lok-lingu-lang` / `lok-lingu-mode`, creates a local-id
profile **synchronously** (so the tour never blocks on network), then
reconciles with the server in the background via `useCreateUser`. Design
intent (from the file's own comments): welcome + name + mode are the only
things a new player needs before their first round — everything past that
is reference material, always reachable later from Settings, so the flow
forks rather than marching everyone through 9 screens.

### Core Game Loops

Both modes share: word presentation → answer capture → grading → Leitner
scheduling → celebration/miss feedback → economy payout. `SPEED_TIMING`
(`responseSpeed` setting: fast/normal/relaxed) controls pacing; `heartsMode`
(setting) determines whether misses cost a life; `eventFrequency` (setting:
off/low/normal/high) controls how often a companion event interrupts a
round (see `docs/EVENTS.md`).

| | Voice (`src/pages/game.tsx`) | Draw (`src/pages/draw.tsx`) |
|---|---|---|
| Answer input | Speech recognition (mic) | Canvas stroke → OCR (`draw-recognition-local.ts`, see `docs/DRAW_MODE.md`) |
| Word display | `GameWord` component | Same, at `scale: 0.65` alongside the canvas |
| Lock mechanism | `lockedRef` | `status !== 'idle'` + `eventLockRef` for companion events |
| Companion layer | `CompanionLayer` (ambient + collectibles) mounted with a `zoneRef` forbidden zone around the word/controls | Same, forbidden zone also excludes the draw canvas rect |
| Event director | `EventDirector` mounted beside `CompanionLayer` | Same |

Word scheduling: `pickNextIndex()` in `src/lib/review.ts` — Leitner-style
spaced repetition, `lengthFactor` bounded to `[0.5, 1.5]` so no trait or
companion can starve the review queue of words that are actually due. A
custom LokSet (see LokLibrary/LokSets below) can run **sequential** order
instead (direct index increment, same special-case pattern as the built-in
`numbers` category) or still use `pickNextIndex()` in **shuffle** order.

### Worlds & Levels

- **Levels 1–100** (`src/lib/levels.ts`, `MAX_LEVEL = 100`) — `wordsForLevel`/
  `levelFromWords` convert lifetime words answered into a level; `rankTitle`
  gives each level a name; `freeSkipsForLevel` and `hasEternalVault` gate
  perks by level.
- **Prestige** (`src/lib/prestige.ts`, `MAX_PRESTIGE = 10`, plus a Master
  tier past 10) — resets level to 1 but keeps companions, badges, and
  purchased items; `currentPrestige()`/`prestigeWordsOffset()` track state.
- **Roadmap milestone tracks** (`src/lib/roadmap.ts`, `ALL_MILESTONES =
  MATCH_MILESTONES + TOTAL_MILESTONES`) — two tracks: `match` (per-run
  achievements) and `total` (lifetime-word milestones), which is where
  companion unlocks, badges, and cosmetic rewards attach. Some entries are
  `secret: true` (rendered as `❔`/`???`/a hint until unlocked) — currently
  used for Bot-Loko, gated by the `botloko-caught` achievement.
- **Achievements** (`src/lib/achievements.ts`, 8 entries) — checks like
  streaks, category mastery, and hidden-companion unlocks; some map to a
  companion unlock via `ACHIEVEMENT_COMPANION_UNLOCKS`.

### Shop & Economy Systems

`src/lib/economy.ts` is the **single owner** of every spendable balance —
tokens, skips, hearts. Every mutation dispatches `ECONOMY_EVENT`, which
`useEconomy()` listens for to keep the wallet/shop UI live; nothing should
read or write these balances through a second path (this was a real bug
once — see the "Bug sweep" history in the plan file this doc was drafted
alongside).

| Currency | Earned via | Spent on |
|---|---|---|
| Tokens | Correct answers, companion collectibles, events | Token skins, motions, seasons, themes, fonts, `STACK_SKUS` packs |
| Skips | `FREE_SKIPS_PER_MATCH` per run, rewards | Skipping a hard word |
| Hearts | Rewards, banked-heart rescue | Lives in `heartsMode` |

Shop (`src/pages/themes.tsx`, `SectionNav` pills) is organized into 7
sections:

| Section | Sells | Preview |
|---|---|---|
| Stacks | `STACK_SKUS` currency packs | Static (pricing tiers, nothing to animate) |
| Tokens | Token skins (39 total: 19 symbolic, 6 classic, 6 food, 5 mythic, 2 vault, 1 collab) | Live (`TokenVaultLayer`/`TokenEarnedLabel`, tap-to-preview) |
| Motion | Token motions (15 total, `src/lib/token-motions.ts`) | Live (`TokenMotionPreview`, real physics) |
| Seasons | Ambient ✨ ambient particle themes (`src/lib/seasons.ts`) | Live (`createField` mounted per-card) |
| Themes | Visual color themes | Live (hover particles + equip flash) |
| Passport | Lifetime Passport tier (`src/lib/entitlements.ts`) | Static (pricing/perk tiers) |
| Fonts | Custom fonts, accent color, word emphasis | The rendered sample **is** the preview |

Purchase-tap fix (already shipped): shop cards separate the preview stage
(`pointer-events-none`) from the label/price footer (the real `<button>`),
so tapping the animated visualizer never triggers a purchase — only tapping
the word/price does.

### Customization & Themes

- **Token skins** — 39, across 6 categories including a 5-entry Mythic tier
  (`src/lib/token-skins.ts`).
- **Token motions** — 15 physics presets (rise/ballistic/zerog/explode
  kinds) — see `src/lib/token-motions.ts`.
- **Seasons** — ambient particle fields (`src/lib/seasons.ts`), reused for
  companion ambients and shop previews via `createField()`.
- **Visual themes, fonts, cursor** — see `use-theme.ts`, `use-custom-fonts.ts`,
  the Cursor setting in `use-settings.ts`.
- **Companions & their events** — a `CompanionKit`-driven trait system
  (traits, perks, ultimates, hidden unlocks) fully specified in
  `docs/COMPANIONS.md`; the companion-event catalogue (Blurred Word,
  Scratch Card, Bot-Loko, Eclipse, Mirror Mode, Light Switch, Ant Colony,
  plus proposed-not-built ideas) is in `docs/EVENTS.md`. Not duplicated
  here — those docs are the source of truth.

### LokLibrary & LokSets (custom word lists)

- **LokLibrary** (`/library`) — the entire bundled dictionary (17 languages
  × 5 categories), browsable and searchable, including a cross-language
  search pivoting on the English `translation` field.
- **LokSets** (`/loksets`) — personal word lists, single-language, built
  from LokLibrary picks or free-typed words; launchable into Voice or Draw
  mode via `lok-lingu-custom-set-id`, with a per-set Sequential/Shuffle
  order toggle.

---

## Part 2 — Page-by-Page & Screen-by-Screen Blueprint

### Play

**Voice mode** — `/game` (`src/pages/game.tsx`, 1203 lines)
- *Purpose:* the core spoken-word learning loop.
- *Key components:* `GameWord`, mic capture / speech recognition
  (`speech-utils.ts`), `CompanionLayer`, `EventDirector`, HUD (tokens/skips/
  hearts), celebration/miss effects.
- *States:* idle → listening → grading → celebrate/miss → next word; locked
  during an active companion event.
- *User actions:* speak the word, tap skip, tap the companion widget, pause/
  exit to Home.

**Draw mode** — `/draw` (`src/pages/draw.tsx`, 1257 lines)
- *Purpose:* the sketch-recognition variant of the same loop.
- *Key components:* `GameWord` (scaled), draw canvas + OCR
  (`draw-recognition-local.ts`, see `docs/DRAW_MODE.md`), `CompanionLayer`
  (margin-confined), `EventDirector`, banked-heart rescue.
- *States:* idle → drawing → recognizing → celebrate/miss → next word.
- *User actions:* draw the word, clear/undo stroke, tap skip, exit to Home.

### Progress

**Roadmap** — `/roadmap` (`src/pages/roadmap.tsx`, 865 lines)
- *Purpose:* the unlock gallery — companions, badges, achievements, milestone
  tracks.
- *Key components:* `GalleryCard` (handles locked/unlocked/secret states),
  match-track and total-track milestone lists, perk info panel
  (`describeCompanionPerks()`).
- *States:* locked / in-progress / unlocked / secret-hidden.
- *User actions:* tap a card for detail, equip a companion, view perk info.

**Journal** — `/journal` (`src/pages/journal.tsx`, 363 lines)
- *Purpose:* review queue and per-word notes.
- *Key components:* `WordNote` list, Leitner "due for review" surfacing
  (`lib/review.ts`), language/category filters.
- *States:* empty (no notes yet) / populated / filtered-empty.
- *User actions:* star a word, add a note, jump into review.

**Stats** — `/stats` (`src/pages/stats.tsx`, 319 lines)
- *Purpose:* lifetime performance summary.
- *Key components:* hero word-count stat, Level & Prestige card, Prestige
  History, per-category breakdown.
- *States:* loading (first paint) / populated.
- *User actions:* none beyond navigation — read-only.

**Leaderboard** — `/leaderboard` (`src/pages/leaderboard.tsx`, 232 lines)
- *Purpose:* ranked comparison against other players.
- *Key components:* language filter (Select), rank list, current-user
  highlight.
- *States:* loading / populated / offline-empty.
- *User actions:* filter by language.

### Shop

**Themes (Shop)** — `/themes` (`src/pages/themes.tsx`, 1409 lines)
- *Purpose:* every purchasable/cosmetic system in one place.
- *Key components:* `SectionNav` (sticky jump-bar), `StackShop`,
  `TokenSkinShop`, `MotionShop`, `SeasonShop`, `PassportShop`, theme picker,
  font picker.
- *States:* per-card idle / previewing (tap-triggered, auto-dismisses) /
  owned / locked-by-price or level.
- *User actions:* tap a card to preview, tap the label/price to purchase or
  equip.

### Words

**LokLibrary** — `/library` (`src/pages/library.tsx`, 286 lines)
- *Purpose:* browse/search the full bundled dictionary.
- *Key components:* language filter, free-text search (cross-language via
  the `translation` pivot), word cards with mastery highlight, favorite
  star, "Add to LokSet" selection mode.
- *States:* empty search / results / no-results.
- *User actions:* search, filter by language, star a word, select words to
  add to a LokSet.

**LokSets** — `/loksets` (`src/pages/loksets.tsx`, 290 lines)
- *Purpose:* build and launch personal word lists.
- *Key components:* set grid, create/edit dialog, detail view with word
  list + Sequential/Shuffle toggle, Voice/Draw launch buttons.
- *States:* empty (no sets yet) / populated / editing.
- *User actions:* create/edit/delete a set, add/remove words, toggle order
  mode, launch into Voice or Draw.

### Other

**Home** — `/` (`src/pages/home.tsx`, 1127 lines)
- *Purpose:* landing screen and mode launcher.
- *Key components:* Voice/Draw mode pills, onboarding overlay mount point,
  waitlist form, quick links to Library/LokSets/Settings.
- *States:* first-run (onboarding overlay showing) / returning player.
- *User actions:* pick a mode and start, open onboarding tour, navigate
  elsewhere.

**Explore** — `/explore` (`src/pages/explore.tsx`, 792 lines)
- *Purpose:* a world-map view of progress/language coverage.
- *Key components:* map/graph visualization, per-language progress markers.
- *States:* loading / populated.
- *User actions:* explore/pan the map, jump into a language.

**Inventory** — `/inventory` (`src/pages/inventory.tsx`, 172 lines)
- *Purpose:* owned cosmetics at a glance.
- *Key components:* owned-item grid grouped by category.
- *States:* empty / populated.
- *User actions:* equip an owned item.

**Celebrations** — `/celebrations` (`src/pages/celebrations.tsx`, 245 lines)
- *Purpose:* gallery of celebration/miss effect definitions (dev/reference
  screen, not in nav).
- *Key components:* `CelebrationDef` list, effect preview.
- *States:* populated (static catalogue).
- *User actions:* preview an effect.

**Canvas design** — `/canvas-design` (`src/pages/canvas-design.tsx`, 243
lines)
- *Purpose:* internal design/prototyping tool (not in nav).
- *States/actions:* tool-specific; not part of the player-facing loop.

**Settings** — `/settings` (`src/pages/settings.tsx`, 263 lines)
- *Purpose:* every player-adjustable knob.
- *Key components:* toggles/selects bound to `use-settings.ts`
  (`heartsMode`, `autoSpeak`, `cursor`, `matchTolerance`, `ttsVolume`,
  `ttsRate`, `responseSpeed`, `eventFrequency`), nav-style toggle, "Re-run
  onboarding" link, save/export (see `docs/SAVES.md`).
- *States:* idle (all controls always live — no loading state).
- *User actions:* change any setting, export/import a save, re-run the
  tour.

**Onboarding** — `/onboarding` (also mountable as a Home overlay) — see
Part 1's FTUE breakdown.

---

## Part 3 — Reference & Expansion Outlets

### Design & Asset References

A place to drop external inspiration, references, or brand direction before
it becomes a task. Empty by default — add rows as they come up.

| Reference | Why | Link/Note |
|---|---|---|
| *(none yet)* | | |

### Feature Backlog & Expansion Slots

Genuinely-deferred ideas already on record elsewhere, gathered here so they
aren't rediscovered from scratch. Add new proposals as rows.

| Idea | Status | Where discussed |
|---|---|---|
| Companion-event weighting (`CompanionKit.events`/`weightMults`) — let a companion bias which events fire more often | Implemented in `rollEvent()` but never wired by any caller | `docs/COMPANIONS.md` |
| Rando-Mi's live mid-word length reflow (vs. today's per-word amplification) | Scoped down for the shipped ultimate; real engine work if built later | `docs/COMPANIONS.md` |
| 5 proposed companion events (sensory-interference / affective / general beats beyond the shipped 7) | Designed, not built | `docs/EVENTS.md` |
| Orphaned `/map` route — a 344-line duplicate of `/roadmap`, unreachable from any nav | Dead code, not yet retired | flagged during the `origin/main` merge |
| Companion-gallery card live ambient preview (mirroring the Shop's live previews) | Explicitly deferred — bigger lift, different card shape | Shop UI follow-up plan |
| Echo Vault / Supernova Prime ultimate token skins | Explicitly out of scope by user request | Ultimate-companions plan |
| Timed/bonus "special" LokSets (`kind: 'special'`) | Data slot reserved (`kind` field), no scheduling/payout system built | LokLibrary/LokSets plan |
