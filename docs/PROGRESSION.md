# Progression, economy, and word coverage

**This is the design record for skips, hearts, tokens, milestones, animals,
and how complete each word list is.** It exists so the next update — human
or AI — extends the system instead of inventing a second, conflicting one.

## The economy

One module owns every spendable balance: `src/lib/economy.ts`. Nothing
else should write these localStorage keys directly.

| Key | Meaning | Direction |
| --- | --- | --- |
| `lok-lingu-lifetime-tokens` | Tokens **earned**, ever | monotonic up |
| `lok-lingu-spent-tokens` | Tokens **spent**, ever | monotonic up |
| `lok-lingu-skips` | Banked skips | up and down |
| `lok-lingu-hearts` | Banked hearts | up and down |
| `lok-lingu-lifetime-<lang>` | Words hit in that language, ever | monotonic up |

`balance = earned - spent`. Earned is kept monotonic on purpose:
progression milestones are *lifetime* achievements, so spending tokens
must never revoke a badge the player already reached.

Every mutation dispatches the `lok-economy` CustomEvent. React reads the
wallet through `useEconomy()`, which listens for that event and for
`storage` (so a second tab stays in sync). A raw `localStorage.setItem`
is invisible to React — that is why it is banned here.

### Bug this replaced

The game HUD showed `+2` on every correct word, but the only code path
that ever incremented `lok-lingu-lifetime-tokens` was the 25-match bonus.
The promised per-word tokens were never banked, so a long session earned
roughly a twelfth of what the screen claimed and nothing in the shop was
reachable. `use-celebration.ts` now banks the per-match rate through
`earnTokens()`.

### Earn rates

| Event | Tokens |
| --- | --- |
| Correct word | +2 (+4 while Token Boost is active) |
| Every 25 matches in a run | +25 bonus |

## Skips

A stuck word used to be a dead end. The only way past it was to stop the
mic, which committed the run and reset the streak — so a single word the
engine refused to accept ended the session.

- **Every match includes one free skip** (`FREE_SKIPS_PER_MATCH`). It
  resets when the game screen mounts; it is not banked and not persisted.
- Additional skips are bought in stacks and persist across matches.
- The button sits **bottom-right** of the game screen, deliberately out of
  the thumb path of the mic button so it cannot be hit mid-run by accident.
- Spending order is **free first, then banked** — banked ones cost tokens.
- A skip advances the word but does **not** touch the streak or lifetime
  word counts. It is a way past a word, not a way to score.

## Hearts

Hearts are lives in **Draw** mode. The voice game has no lose condition,
so hearts do nothing there today, and the shop copy says so. If voice ever
gains a fail state, `consumeHeart()` is the hook to call.

## Stacks (the shop)

`STACK_SKUS` in `economy.ts`. Bundles are priced with a bulk discount so
buying three is cheaper per unit than buying one three times.

| SKU | Grants | Cost | Earned free at |
| --- | --- | --- | --- |
| `skip-1` | 1 skip | 20 | 250 lifetime words |
| `skip-2` | 2 skips | 36 | 500 |
| `skip-3` | 3 skips | 50 | 1,000 |
| `heart-1` | 1 heart | 30 | 400 |
| `heart-2` | 2 hearts | 54 | 800 |
| `heart-3` | 3 hearts | 75 | 1,500 |

### The intended direction: earned, not bought

Buying is the **transitional** model. The target is that stacks are
granted automatically at the `earnedAt` lifetime-word thresholds, and the
token price becomes a shortcut rather than the only route. The thresholds
are already displayed on each tile ("earn free at N words") so that when
the switch happens it reads as a promise kept, not a change of terms.

To implement it: watch total lifetime words on match commit, compare
against `earnedAt` for each SKU, and grant once. That needs a
`lok-lingu-granted-skus` set so a grant fires exactly once — deliberately
not built yet, because it should land with the roadmap notifications
rather than silently.

## The roadmap

`src/lib/roadmap.ts`, surfaced at `/roadmap` (Settings drawer → Roadmap).
Two tracks, both pure projections of counters the game already writes.
`evaluate()` mutates nothing, so the page, the HUD, and any future
notification cannot disagree about what is unlocked.

### Track 1 — The Hundred (inside a single run)

Resets when the run ends. Mirrors what `use-celebration.ts` actually does.

| At | Title | Reward | Live? |
| --- | --- | --- | --- |
| 5 | Warm | badge | planned |
| 10 | Rolling | badge | planned |
| 25 | First Burst | +25 tokens, mini celebration | **yes** |
| 50 | Boost Unlocked | big celebration, Token Boost unlocked | **yes** |
| 75 | Deep Run | +1 skip | planned |
| 100 | Century | suBang celebration, Boost activates | **yes** |

### Track 2 — The Menagerie (lifetime)

**What the animals are:** companions. One animal per lifetime tier,
unlocked by total words spoken across every language. They are collection
pieces first — a visible menagerie — and later a cosmetic that rides along
on the game screen, which is the natural replacement for the floating "L".

| At | Animal | Also grants |
| --- | --- | --- |
| 25 | Sparrow | — |
| 100 | *(Centurion)* | +100 tokens |
| 250 | Fox | +1 skip |
| 500 | Crane | Lingu Culture theme tier |
| 1,000 | Wolf | +3 hearts |
| 2,500 | Tiger | Flag Tier singles |
| 5,000 | Whale | the full Flag Pack |
| 10,000 | Dragon | Mythic tier |

Everything on this track is marked **planned** in the UI: the tiers are
designed and displayed, but nothing grants them automatically yet. The
page says so rather than pretending otherwise.

**Known gap:** the match track shows the ladder but always renders live
progress as 0, because best-streak is not persisted anywhere. Adding
`lok-lingu-best-streak` on `commitRun()` is the smallest fix and would
make that track live.

## Token skins

`src/lib/token-skins.ts`, sold in the shop, rendered by
`components/token-earned-label.tsx` and `components/token-vault-layer.tsx`.

This controls the coin that pops when you earn LOK tokens.

| id | Name | Cost | What it does |
| --- | --- | --- | --- |
| `classic` | Classic Coin | free | Spins up from the streak counter and fades |
| `aurora` | Aurora Glow | 40 | Soft coloured halo blooms behind it |
| `neon` | Neon Outline | 60 | Hard glowing ring on coin and amount |
| `jumbo` | Jumbo | 70 | Double size, slower |
| `supernova` | Supernova | 90 | Detonates into a ring of sparks |
| `freefall` | Freefall | 120 | Thrown up, stalls, then gravity drops it |
| `vault` | **The Vault** | 400 | Coins fall to the floor and pile up as you play |

### Bundled now, splittable later

The user's intent is that appearance and effect eventually become
separate pickers. `TokenSkin` therefore already stores them as distinct
field groups — appearance (`glyph`, `scale`, `halo`, `outline`) and effect
(`motion`, `particles`, `duration`) — rather than one opaque blob.

Splitting is then mechanical: widen the store from one selected id to two
(`lok-lingu-token-look` / `lok-lingu-token-motion`), and compose a
`TokenSkin` from the two halves. **Nothing in the render path needs to
change**, because it already consumes the fields independently. Ownership
(`lok-lingu-owned-token-skins`) is a plain id list, so grandfathering a
bundled purchase into both halves is a data migration, not a rewrite.

### Performance rules — the part that matters

An accumulating effect is the easiest way to destroy a game's frame rate,
so the whole system is built around limits rather than hoping:

1. **Transform and opacity only.** Nothing animates layout, and no filter
   or box-shadow is applied to a moving element. Halos are static radial
   gradients that themselves scale; outlines are `text-shadow`.
2. **Particle counts are constants in the catalog, never derived from the
   score.** A player on a 400 streak costs exactly what a first-word
   player costs.
3. **The Vault pile is capped and evicts FIFO.** `MAX_PILE = 60`. This is
   the load-bearing rule — without it the DOM grows without bound.
4. **A landed coin stops animating.** Each coin runs one transform
   animation to its resting place and is then a static composited
   element. The pile is not a simulation; there is no per-frame cost
   proportional to its size.
5. **The cap is adaptive.** `hooks/use-perf-budget.ts` samples real frame
   times and drops the ceiling to `REDUCED_PILE = 20` (and halves
   Supernova's ring) when FPS falls below 45, recovering only after three
   consecutive good seconds so it cannot flicker.
6. **`prefers-reduced-motion` collapses every skin to a static label**,
   and the Vault renders nothing at all.

Coins rest in 14 columns with a small integer height map, capped at
`MAX_STACK_HEIGHT = 5` per column so a heap can never wall off the UI.
There is no collision detection and no physics loop.

**Measured** in headless Chromium: 200 rapid earn events left exactly 60
coins in the DOM and held 60 fps throughout, with zero page errors.
Reduced-motion rendered 0 coins.

### Where the Vault mounts

`TokenVaultLayer` sits at the **root of the game page at `z-0`**, not
inside the streak counter, because it draws across the whole viewport and
must outlive any single coin pop. `TokenEarnedLabel` returns `null` for
the `pile` motion so the two never both render. The shop passes
`contained` to keep previews inside their tile.

## Levels

`src/lib/levels.ts`. **Derived, never stored.** Level is a pure function
of lifetime words — the counter the game already writes on every correct
answer — so it cannot desync from actual play, cannot be lost by clearing
a stray key, and cannot be awarded twice.

Curve: words to reach level L = `round(1.2 * L^1.85)`, capped at
`MAX_LEVEL = 100`.

| Level | Words | Level | Words |
| --- | --- | --- | --- |
| 10 | 82 | 60 | 2,485 |
| 20 | 295 | 84 | 4,355 |
| 40 | 1,161 | 100 | 6,001 |

Superlinear but not brutal: early levels arrive fast enough to teach the
system, and 100 is a real commitment without being unreachable.

### Level perks — earned only, never purchasable

Nothing on this track has a token price. That separation is what stops
levelling from reading as a second shop.

| Level | Perk |
| --- | --- |
| 5 | Spark emblem |
| 12 | Ember emblem |
| **20** | **Second free skip every match** |
| 25 | Prism emblem |
| 40 | Comet emblem |
| **50** | **Third free skip every match** |
| 60 | Halo emblem |
| **84** | **The Eternal Vault** |
| 100 | Crown emblem |

`freeSkipsForLevel()` is the single place the free-skip count is decided;
`game.tsx` asks rather than hard-coding a constant.

## Emblems

`src/lib/emblems.ts`, animations in `index.css`.

Small animated icons earned by levelling, shown beside your name and in
the game HUD. Deliberately a *different economy* from token skins: a
token skin is a purchase that changes an effect you see dozens of times a
match; an emblem is earned only, cannot be bought at any price, and is a
quiet status mark.

Each emblem names a CSS animation that is transform/opacity/filter on a
single ~16px element, so it is effectively free to display and can run
continuously during a match without competing for frames. Every emblem
animation is disabled under `prefers-reduced-motion`.

`getSelectedEmblem()` never returns an emblem above the player's level,
so a stale stored id cannot display something unearned. The HUD falls
back to the highest earned emblem when none is explicitly chosen.

## The Vault, base and Eternal

These are **two separate things** and both exist.

| | The Vault | The Eternal Vault |
| --- | --- | --- |
| Obtained | Bought, 400 tokens | Earned at level 84 |
| Purchasable | yes | **never, at any price** |
| Pile clears | every match | never |
| Hoard counter | no | yes |

`ownsSkin()` short-circuits on `unlockLevel`: for a level-gated skin the
purchase list is ignored entirely, because reaching the level *is*
ownership. Lifetime words only increase, so it can never be lost. The
shop card previews and explains rather than charging.

### What "infinite" means here

The **count** is unbounded — `lok-lingu-vault-total` has no ceiling and
is what the player watches climb. The number of coins actually in the DOM
stays capped at exactly the same budget as the base Vault, because that
cap is what makes the effect free. **A hoard of 40,000 renders 60 coins.**

Persistence details:

- `lok-lingu-vault-pile` stores the (already capped) coin array;
  `lok-lingu-vault-total` stores the unbounded count.
- `loadPile()` treats storage as untrusted and re-slices to `MAX_PILE`, so
  a hand-edited key cannot blow the render budget.
- Restored coins render **settled** — `initial` and `animate` are identical
  with zero duration — otherwise every reload would rain the whole hoard
  down the screen at once.
- `animKey` restarts at 1 each match, so it cannot be the coin key for a
  pile that outlives the match. Keys continue from the restored high-water
  mark via `nextKeyRef`.
- Unequipping clears the *display* only; the stored hoard survives, so
  re-equipping restores it. `clearVaultHoard()` exists for a future
  "melt down" action.

**Measured** in headless Chromium: 300 words → Lv 19 with the Vault
locked and the shop refusing the sale (0 tokens spent); 4,400 words →
exactly Lv 84, equip succeeds for free; a 12-coin hoard survived entering
a new match while the base Vault started empty on the same page; 500
stored coins rendered 60. Zero page errors.

## Word coverage

`src/lib/word-coverage.ts`. Completeness is **derived by counting
`FALLBACK_WORDS`**, never hand-maintained — a hand-kept list of "which
categories are thin" drifts the moment somebody adds words.

| Entries | Status | Chip opacity | Mark |
| --- | --- | --- | --- |
| ≥ 20 | Complete | 1.0 | none |
| 10–19 | Beta | 0.82 | `•` |
| 1–9 | Experimental | 0.62 | `△` |
| 0 | Not ready | 0.45 | `✕` |

`numbers` is exempt: languages with a generator (`supportsInfiniteCounting`)
count to infinity, so the seed table length is irrelevant and they always
read Complete/Infinite.

Tapping a non-complete category pulses the chip and surfaces a one-line
note explaining the mark. Complete categories stay silent.

### Current state — 1,190 entries across 17 languages

Complete in every category: **es, fr, it, de, pt**.
Spanish is deliberately deepest (colors 24, greetings 23, animals 26,
food 25) as the primary language.

Beta (10) on colors and greetings, Experimental (8) on animals and food:
nl, sv, pl, tr, vi, ja, ko, zh, ru, ar, hi, th. These marks are accurate
and should stay visible until the lists are actually filled in.

### Adding words

Append to the right array in `src/lib/offline-data.ts`, keeping `index`
unique and sequential within its category. Coverage marks update on their
own — there is no second list to remember.

## Name gating

A match now requires a name or alias, because a leaderboard score without
one is meaningless. The old behaviour silently slid the settings drawer
open, which read as a bug.

The drawer is kept — it is the right place for the field — but the flow
around it is explicit:

1. The START button reads **"Name yourself"** rather than "Start voice".
2. A hint under it states the requirement before it is hit.
3. Pressing it shakes the button, sets an error, opens the drawer, and
   focuses the input after the entrance transition (320 ms — focusing
   earlier lands the caret on an off-screen element).
4. The input is `aria-invalid` with a destructive border until filled, and
   the error clears as soon as anything is typed.

## Open items, deliberately not built

- Automatic grants at `earnedAt` thresholds (needs a granted-SKU set).
- Persisted best streak, which would make the match track live.
- Companion art and the in-game companion cosmetic.
- Hearts in voice mode — needs a fail state to exist first.
- The remaining twelve languages' colors/greetings/animals/food lists.
