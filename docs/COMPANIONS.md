# Companions: events, perks, and the kit behind them

**This is the design record for what a companion *does* once equipped.** It
exists so companion #12 is a data entry, not a rewrite — and so the next
update extends this system instead of inventing a second, conflicting one.

Companions began as inert collectibles: unlocking one added a card to the
roadmap gallery and nothing else. `577429a` added an equip slot
(`getEquippedCompanion`) and a floating avatar with a flavor quip
(`src/components/companion-widget.tsx`). This document specifies the layer
above that — ambient world changes, tappable collectibles, rewards, and
per-companion special abilities.

---

## The one rule everything else bends around

**This is a learning screen, not a playground.** The word, the mic button, and
the Clear/Done controls are sacred. Every effect in this document is required
to prove it does not cover them, does not steal a pointer event from them, and
does not slow the answer loop below its own configured pace.

An effect that obscures the word has not added charm — it has broken the app.

**Amended by [`EVENTS.md`](./EVENTS.md).** Random events may obscure the word,
but only while answering is blocked and only when clearing the obstruction is
the event's own win condition. The guarantee this rule exists to protect — you
are never asked to answer a word you cannot read — is unchanged.
That constraint is why the collectible layer has a forbidden zone rather than
spawning wherever it likes, and why draw mode confines collectibles to the
margins outside the canvas.

---

## What already exists

Nearly all of this is a configuration problem, not a rendering one. The
particle engine, the reward payouts, and the pacing knob are all built.

| Need | Existing thing | Path |
| --- | --- | --- |
| Falling/rising particles | `createField()` — one canvas, one rAF, pooled particles, DPR capped at 2, stops on tab-hide | `src/lib/particles/field.ts` |
| Effect config vocabulary | `Season` / `SeasonMotion` — gravity, sway, spin, flicker, glyphs, size, opacity | `src/lib/seasons.ts` |
| Mount pattern | `SeasonLayer` | `src/components/season-layer.tsx` |
| Glyph rasterisation | `getSprite(glyph, size)`, bucketed sprite cache | `src/lib/particles/field.ts` |
| Reward payouts | `earnTokens`, `addSkips`, `addHearts` | `src/lib/economy.ts` |
| Answer pacing | `SPEED_TIMING` — `hitMs`, `restartMs` | `src/pages/game.tsx` |
| Palette switching | theme is a CSS class on `<html>` | `src/hooks/use-theme.ts` |
| Cross-language words | `FALLBACK_WORDS`, 17 languages × 5 categories | `src/lib/offline-data.ts` |
| Burst animation + sound | `CelebrationDef`, `CelebrationEffect` | `src/lib/celebrations.ts` |
| Cosmetic grants | `grantSeason`, token skins | `src/lib/seasons.ts`, `src/lib/token-skins.ts` |

**A companion's ambient effect is a `Season`-shaped config.** Amber's embers
are negative gravity plus flicker. Sir Baguette's falling bread is the same
motion as autumn leaves with a different glyph. Nothing new is needed to draw
any of it.

---

## The two layers

Companion visuals split cleanly in two, and conflating them is the mistake to
avoid.

### Ambient — decorative, free

Reuses `createField()` exactly as-is. `pointer-events: none`, always behind
content, purely atmospheric. Costs one `Season` config per companion.

### Collectible — interactive, the only real new engine work

`createField` **cannot** be made tappable: it is `pointer-events: none`, it
recycles particles invisibly through a fixed pool, and it exposes no
per-particle handle. Tappable bamboo, embers, and baguettes need a sibling
module, `src/lib/particles/collectibles.ts`, which borrows the same
discipline — clamped `dt`, no per-frame allocation, stops on tab-hide, shares
the `getSprite` cache — but adds:

- a small bounded set (≤12 on screen) with stable ids
- `hitTest(x, y) → id | null` using a **touch-sized radius of at least 44px**,
  not pixel-exact bounds
- `remove(id)` with a pop animation
- an `onCollect(id)` callback the React layer converts into a reward

#### Three constraints, designed in rather than patched later

**1. Never occlude the word.** Collectibles receive a *forbidden zone* — the
word's bounding box plus the control rects, inflated by roughly 16px — and
spawn only outside it. Bamboo "covering the screen" grows tall at the left and
right edges and stays short across the centre lane, so the effect reads as
overgrown without ever hiding the thing being learned.

**2. Draw mode owns the canvas.** `draw-canvas.tsx` claims pointer events for
strokes, and its `pos()` maps every pointer coordinate onto the bitmap. A
collectible sitting over the canvas would either eat a stroke or leave a stray
mark. In draw mode collectibles are confined to the margins outside the canvas
rect. There is no clever compromise here — overlap is simply forbidden.

**3. Reduced motion must still earn.** `SeasonLayer` removes itself entirely
when `useReducedMotion()` is true. If collectibles copied that, those players
would silently lose every reward attached to them — an accessibility setting
must not become an economic penalty. Instead, under reduced motion
collectibles render **static**: no drift, no growth animation, a plain fade in
and out, fully tappable, identical payouts.

---

## `CompanionKit`

One table, `src/lib/companions.ts`, drives every companion. The renderer,
hit-testing, reward rolls, per-match caps, and reduced-motion handling are
written once.

```ts
export interface CompanionKit {
  id: string;                 // matches the roadmap companion id
  name: string;               // "NiNi the Sloth"
  ambient?: Season;           // fed straight into createField()
  collectible?: {
    glyph: string;
    spawnEveryMs: [number, number];
    maxOnScreen: number;
    origin: 'top' | 'bottom' | 'edges';
    rewards: RewardRoll[];    // weighted table
    capPerMatch: number;      // anti-farm, see below
  };
  palette?: string;           // transient CSS class, e.g. 'companion-nini'
  pacing?: { hitMs: number; restartMs: number };
  charge?: { per: 'collect' | 'correct'; needed: number };
  onCharged?: CompanionAbility;

  // ── perks, all optional, all stackable ──
  streakMultiplier?: { at: number; mult: number }[];   // Wolf
  shield?: { foldsNeeded: number };                    // Crane
  burstChance?: { chance: number; extraMult: number }; // Sparrow
  ambush?: { chance: number; bonusMult: number };      // Tiger
  hint?: { chance: number };                           // Wren
  revive?: { perMatch: number };                       // Phoenix
  guestWord?: { lang: string; chance: number; bonusTokens: number }; // Baguette
  lengthBias?: {                                       // the Mi family
    prefer: 'short' | 'long' | 'random';
    strength: number;
    lengthBonus?: { from: number; perLetter: number };
  };

  copy: { quips: string[]; onCorrect?: string; onGameOver?: string };
}
```

**The perk block is the whole point of the table.** None of these are tied to
the companion they were designed for — any of them can be handed to any
companion by editing one row. The moment a perk needs an `id === 'x'` check in
a page, this document has been violated and the perk belongs up here instead.

### Every collectible needs a per-match cap

A tappable thing that pays tokens is an infinite faucet without a ceiling.
Each kit declares `capPerMatch`; the counter lives in a ref and is cleared by
`resetMatch()` in `src/hooks/use-celebration.ts`, alongside the existing
per-run counters. This is not a balance tweak to add later — an uncapped
reward table invalidates the whole economy in `PROGRESSION.md`.

---

## NiNi the Sloth 🦥

**The fantasy: everything downshifts, and slow is kind.**

| Element | Spec |
| --- | --- |
| Pacing | `{ hitMs: 1100, restartMs: 900 }` — one tier beyond `relaxed` (700/500) |
| Palette | Deep purple, cross-fading over ~8s to desaturated greyscale and back |
| Ambient | Drifting leaves 🍃, very low count |
| Collectible | Bamboo 🎋 growing from the bottom edge over ~6s; tap to cut |
| Cap | 8 bamboo per match |

### Why the slowdown is a perk, not a nerf

`SPEED_TIMING` controls `hitMs` (the beat after a correct answer before the
next word) and `restartMs` (how long before the mic re-arms). Raising both
gives the player **more time to think and speak**. NiNi is, mechanically, the
accessibility companion — and dressing that as a charming sloth rather than an
"easy mode" toggle is the entire trick.

This is written down explicitly so a later pass does not "fix" NiNi by turning
the slowdown into a penalty. It is supposed to feel good.

### The palette must not touch the saved theme

`useTheme().setTheme()` writes `lok-lingu-theme` to localStorage. Calling it
for NiNi would **overwrite the player's chosen theme permanently** — they
would unequip her and find their theme silently changed.

Instead the palette is an *additive transient class* (`.companion-nini`) added
to `<html>` on equip and removed on unequip or match end, overriding the
palette custom properties without disturbing the theme class underneath it.
The player's choice survives untouched.

### Bamboo reward table

| Weight | Reward |
| --- | --- |
| 40% | 3–12 Lok tokens |
| 25% | Bonus points toward the current run |
| 15% | Guest word (see below) |
| 10% | +1 skip |
| 8% | +1 heart, only when below max |
| 2% | Rare cosmetic drop |

---

## Amber the Dragon 🐉

**The fantasy: embers rain, you hoard them, the hoard pays out.**

- **Ambient** — embers 🔥 ✨ rising and flickering. Expressible today as
  `gravity: -6`, `terminalVelocity: 20`, `flicker: 0.6`.
- **Collectible** — tappable embers falling from the top.
- **The bottle** — a persistent vial on screen that fills as embers are
  caught, with thresholds at **25 / 50 / 100**. A bigger bottle pays more.
- **The payoff** — tapping a full bottle makes it *shake*, then *burst*. Reuse
  `CelebrationEffect` with a `burst` animation and a `pop` or `chime` sound
  profile rather than writing a bespoke animation; that component already
  handles reduced motion and sound settings correctly.
- Bottle charge persists across words within a match and clears on
  `resetMatch()`.

---

## Sir Baguette 🥖

**The fantasy: French charm intrudes, delightfully, at no cost.**

- **Ambient** — baguettes falling with a gentle spin, low count.
- **Guest word** — occasionally the current word arrives in French, visually
  flagged. Correct earns **+2 Lok tokens**. Wrong costs **no heart and does
  not break the streak**. Strictly upside, always.
- **Charged tap** — once charged, tapping him converts the word currently on
  screen into its French counterpart on demand.
- **Copy** — on a correct answer, or on reaching 50–100 collected baguettes, a
  **"Oui,"** / **"oui !"** cascade: two words staggered about 180ms apart,
  fading out in a light script face.
- **Game over reads "C'est la vie."** rather than "Game Over", at
  `src/pages/game.tsx` and `src/pages/draw.tsx`.

> The original brief wrote this as "Cie La Vie". The correct French is **c'est
> la vie** — and in a language-learning app the spelling has to be right.

### The counterpart lookup already works

`FALLBACK_WORDS` pivots every language on its English `translation` field —
`es` `uno` → `one`, `fr` `un` → `one` — so a counterpart is a lookup, not a
translation service:

```ts
counterpart(source, toLang, category)
  // the entry in FALLBACK_WORDS[toLang][category]
  // whose .translation === source.translation
```

### Pick from the intersection — do not look up and hope

All 17 languages carry all 5 categories, so category coverage is total. But
**individual translations do not line up**, and the gaps are frequent enough to
matter. Measured, Spanish → French:

| Category | Words with a French counterpart |
| --- | --- |
| numbers | 20 / 20 |
| animals | 19 / 26 |
| food | 20 / 25 |
| colors | 18 / 24 |
| greetings | 17 / 23 |

The misses are the culturally specific tail — `celeste` (sky blue), `granate`
(maroon), `hasta luego` (see you later), `plátano` (banana). Roughly one word
in four in the weaker categories has no counterpart at all.

That rules out the obvious implementation. "Fire the event, look up a
counterpart, give up if there isn't one" would silently no-op about a quarter
of the time, and the feature would read as broken and random.

Instead, **compute the set of words that have a counterpart first, and fire
the event only on those.** The intersection is derived once from
`FALLBACK_WORDS` and cached — it is static data, so this costs nothing at
runtime. Sir Baguette then always has something to say when he speaks.

The same rule applies to his charged tap: if the word on screen has no French
counterpart, he must be visibly *not* chargeable on it rather than appearing
tappable and doing nothing. Never render an empty word — that is precisely the
failure `DRAW_MODE.md` records, and it is not worth repeating.

### Guest words must not enter the learning data

A French word shown to a Spanish learner is **ephemeral exposure**. It pays
tokens and nothing else. It must not call `incrementLifetime('fr')`, must not
call `incrementCategoryLifetime`, and must not enter the Leitner scheduler in
`src/lib/review.ts`.

The concrete failure if this is ignored: `checkPolyglotBadge()` unlocks when
three languages have a lifetime count above zero. Guest words would hand out
the Polyglot badge to someone who has only ever studied one language, and
would seed the review queue with words from a language they are not learning.

---

## Further companions

Same kit, no new engine work.

| Companion | Ambient | Hook |
| --- | --- | --- |
| **Wren** 🐦 | Drifting feathers | A feather lands on the word and nudges a hint — the first letter |
| **Sparrow** 🐦 | Quick darting motes | Short bursts of doubled token rate |
| **Otter** 🦦 | Bubbles rising | Pop 5 before any reaches the surface for a raft combo |
| **Fox** 🦊 | Autumn leaves | A tiny shell game — a token hides under one of three leaves |
| **Crane** 🕊️ | Origami paper | Folds over N correct answers; completing the crane grants a streak shield |
| **Wolf** 🐺 | Drifting snow | Pack bonus — an escalating multiplier while the streak holds |
| **Tiger** 🐅 | Tall grass at the edges | Ambush: a rare surprise double-or-nothing on one word |
| **Whale** 🐋 | Slow bubbles, deep-blue palette | Rare, very large payout — the breach |
| **Dragon** 🐉 | See Amber | — |
| **Phoenix** 🔥 | Ash falling | **Revives you once per match from zero hearts** |
| **Leviathan** 🐙 | Dark tentacle silhouettes at the edges | Endgame — stacks two other companions' ambient effects |

Phoenix's revive is the strongest perk in the set. It belongs behind its
existing 20,000-word gate in `TOTAL_MILESTONES`, and should stay there.

**Every one of these is a field on the kit, and that is deliberate.** Wren's
hint, Phoenix's revive and Baguette's guest word were originally
`getEquippedCompanion() === 'wren'` checks duplicated across `game.tsx` and
`draw.tsx` — which meant giving *any other* companion a hint was a code change
rather than a data entry, exactly the failure this document exists to prevent.
They are `hint`, `revive` and `guestWord` now. There are no equip-id checks
left in either page.

The guest-word lookup went with them: `counterpartWord()` takes a target
language rather than hardcoding French, so a guest word in any language can be
handed to any companion.

---

## The Mi family — three siblings, one new axis

Mini-Mi, Big-Mi and Rando-Mi are from the lore, and they are the first
companions whose mechanic is about **the words themselves** rather than how
those words look or what they pay. Each *handles* a length band: it seeks those
words out, and it pays for them.

| Companion | Handles | Mechanic |
| --- | --- | --- |
| **Mini-Mi** | Tiny words | Serves more short words — quick and light |
| **Big-Mi** | Big words | Serves more long words *and* pays per extra letter, so the hardest words are finally worth the most |
| **Rando-Mi** | Anything | Length swings turn to turn; the swing is re-rolled per word, and the payout scales with the swing |

### The guard rail

`lengthBias` is a **tiebreaker inside the set the Leitner scheduler already
considers eligible — never an override of it.** `pickNextIndex()` stays in
charge of what is *due for review*; a companion may only nudge which of those
comes up next.

This is enforced by construction rather than by convention: `lengthFactor()` in
`review.ts` is bounded to `[0.5, 1.5]` and can never return zero, so no
companion can remove a word from consideration. A word you genuinely need to
review stays reachable no matter who is equipped.

The length bonus is paid on the word actually *answered*, not the word served,
so it cannot be farmed by re-rolling.

**Not built: live mid-word reflow.** Rando-Mi's ultimate (below) amplifies
the per-word swing rather than making length fluctuate *while a word is on
screen*, which the brief originally asked for. That needs a presentation
channel outside the event director — today only `EventDirector` ever calls
`onPresentation`, on its own `durationMs` cadence, and a per-word live shift
would have to arbitrate against whatever event is active to avoid two writers
fighting over `maskPct`/`effect`. Real, but out of scope for now — the same
"don't build a shallow reskin" honesty as Leviathan's ambient-only note below.

---

## Ultimate companions

Unlocked by playing `unlock` words (400, currently, for every ultimate below)
with that companion equipped — an investment in one character, not a
purchase. `CompanionKit.ultimate: { unlock, overrides }` shallow-merges
`overrides` over the base kit once the threshold clears;
`effectiveCompanionKit(kit, wordsPlayed)` (`companions.ts`) is the one place
that merge happens. Applied **once per mount**, from the words-played count
at the *start* of the run — not live mid-run — so crossing the threshold
takes effect on the *next* run. `companionWordsPlayed`/`incrementCompanionWords`
(`use-celebration.ts`) track the counter, keyed separately from the
companion-*unlock* flag prefix (a count and a boolean have no business
sharing a key).

Per the design brief, an ultimate amplifies the identity in **both**
directions rather than just making a companion stronger:

| Companion | Ultimate |
| --- | --- |
| **NiNi** | Even slower pacing (1500/1200ms) *and* a flat 2.5x token multiplier — expressed as `streakMultiplier: [{ at: 0, mult: 2.5 }]`, reusing the existing always-active-tier mechanism rather than a new field. Calm becomes lucrative. |
| **Tiger** | Ambush 3x more often (0.08 → 0.24) and pays 5x (3x → 5x) — but a missed *flagged* word now costs an extra heart on top of the normal miss (`ambushPenalty`). This is the one **T3** ultimate: telegraphed by the ambush banner every equipped player already sees, and opt-in because only unlocking the ultimate turns the penalty on at all. |
| **Rando-Mi** | `strength: 1` (already the max `lengthFactor`'s bound allows) plus a bigger `lengthBonus`. See the "not built" note above for the live-reflow version this was scoped down from. |
| **Bot-Loko** | See below — flips the drone from thief to ally. |
| **Wren** | Hint chance 0.25 → 0.6 — the gentle nudge becomes the headline rather than an occasional courtesy. |
| **Sparrow** | Burst chance 0.12 → 0.35, extra multiplier 1x → 2x. |
| **Otter** | The raft lands every 3rd bubble instead of every 5th, and pays roughly double. |
| **Fox** | The hidden bonus lands on every 2nd leaf instead of every 3rd, and pays noticeably more. |
| **Crane** | Folds needed 10 → 5 — the shield is up far more often. (Crane's `glowOnStreak` is a base-kit field, not gated behind this.) |
| **Wolf** | Streak tiers start sooner and top out higher (3/10/20 words at 2x/3x/5x, vs. the base kit's 5/15/30 at 1.5x/2x/3x). |
| **Whale** | The breach lands roughly twice as often (charge 8 → 4) and pays roughly twice as much. |
| **Amber** | The bottle fills much faster (charge 25 → 12) for a far bigger cash-in. |
| **Phoenix** | `revive.perMatch` 1 → 2 — a second life per run. |
| **Mini-Mi** | `lengthBias.strength` 0.8 → 1 (max the guard rail allows). |
| **Big-Mi** | `lengthBias.strength` 0.8 → 1, `lengthBonus.perLetter` 2 → 4. |
| **Sir Baguette** | `guestWord.chance` 0.2 → 0.4, `bonusTokens` 2 → 5, and Baguette Storm (see below) fires every 10 words instead of every 15. |
| **Robot** | `skipEvery` 12 → 6 — compliments and skips both come around twice as often. |
| **Sprout** | Blooms every 15 words instead of every 30, and the reward table skews richer. |
| **Leviathan** | Deliberately none — see "Still ambient-only" above; needs multi-Season composition `field.ts` doesn't support yet. |

---

## Bot-Loko: hidden companion, event-to-companion promotion

Bot-Loko started as event-only (`companion-events.ts`, full lore in
`docs/EVENTS.md`). This is its promotion to a real, equippable
`CompanionKit` entry — deliberately understated at base tier (an ambient of
faint circuit sparks, quips, no functional perk), because its identity *is*
the event, not a stat line. The payoff lives entirely in its ultimate.

**Unlock: 5 lifetime Bot-Loko intercepts**, tracked independent of whether
Bot-Loko is even equipped that run (`botLokoInterceptsCount()`, incremented
inside `event-director.tsx`'s `onIntercept`). Achievement
`'botloko-caught'` (`achievements.ts`) grants it via the same
`ACHIEVEMENT_COMPANION_UNLOCKS` side-table Sir Baguette and the Mi family
use.

**Hidden until unlocked** — new territory for the roadmap gallery.
`Milestone` gained `secret?: boolean` / `secretHint?: string`; `GalleryCard`
(`roadmap.tsx`) renders `❔` in place of the glyph, `'???'` in place of the
title, and `secretHint` in place of the numeric progress line (a hidden
companion showing "4/5" would spoil its own unlock condition) whenever
`secret && !unlocked`. Once unlocked it renders exactly like any other
card — the secret is discovering it exists, not its content.
`'botloko-caught'` itself is **not** hidden — its title ("Caught
Red-Handed") and detail are the trail of breadcrumbs that let a player find
the secret at all, rather than a second layer of the same secret.

**The ultimate — `droneAlly: true`.** Repaired, Bot-Loko now retrieves
*for* the player: `event-director.tsx`'s `bot-loko` case branches on a new
`botLokoAlly` prop (computed by the host page as `kit?.id === 'bot-loko' &&
!!kit?.droneAlly`) and, on escape, pays a reward instead of taking a skip.
Everyone who hasn't unlocked it — which is everyone who hasn't equipped and
levelled Bot-Loko to 400 words, itself gated behind 5 intercepts — sees the
event exactly as EVENTS.md documents it, unchanged.

**Not built: companion event-weighting.** The original plan sketch had
`CompanionKit.events?: EventBinding[]` and `RollContext.weightMults`
(`companion-events.ts`) so a companion could bias *which* events fire more
while equipped — e.g. Bot-Loko making its own event more common.
`weightMults` is fully implemented inside `rollEvent()` but **no caller ever
passes it** — confirmed by reading every call site. Flagging this
explicitly rather than letting it look finished: it needs a design pass on
which companions bias which events before it's worth wiring up.

**Echo Vault / Supernova Prime — built, in `lib/token-skins.ts`.** The two
"ultimate token skins" from the original brainstorm, level-gated
(92/96) and unpurchasable, same pattern as The Eternal Vault. Both reuse
the existing look/motion axes only: Echo Vault is a persistent, glowing
pile skin; Supernova Prime is a denser `burst` with a bigger halo. The
full spec's live per-coin word-stamping (Echo Vault) and a periodic
full-screen chromatic bloom (Supernova Prime) would need real changes to
`token-vault-layer.tsx`'s rendering pipeline — flagged here as future work
rather than silently simplified.

---

## New companions and traits (this pass)

Three new fields on `CompanionKit`, each carried by exactly one companion
so far but usable by any future one, same as every other trait:

- **`complimenter?: boolean`** — an automatic spoken-style compliment
  after every correct answer, distinct from the existing tap-to-talk quip.
  Implemented as a DOM event (`COMPANION_COMPLIMENT_EVENT`,
  `companion-widget.tsx`) the correct-answer handler dispatches and the
  widget listens for — kept decoupled from `game.tsx`/`draw.tsx`'s
  internals the same way `ECONOMY_EVENT` decouples the wallet from
  whichever screen changed it. Carried by **Robot**.
- **`skipEvery?: number`** — grants +1 skip every N correct answers this
  run, on a fixed cadence rather than a roll (Wolf/Sparrow's mechanism is
  a per-hit chance; this is deliberately not that — precision is the
  point). Carried by **Robot** (every 12, ultimate: every 6).
- **`glowOnStreak?: boolean`** — the companion widget's glow intensity
  scales with the current in-run streak (capped at 30) while true. Purely
  visual, no economy interaction. Carried by **Crane** (the folded paper
  catching more light the longer the streak holds).
- **`growth?: { every, bloomEvery, rewards }`** — a plant on the
  companion widget advances one stage every `every` correct words;
  reaching `bloomEvery` rolls one `rewards` entry (via
  `companion-rewards.ts`'s existing `rollReward`/`grantReward`, the same
  functions NiNi's rare-drop slot uses) and resets to grow again. Carried
  by **Sprout** (every 10, blooms at 30; ultimate blooms at 15 with a
  richer table).

### Robot 🤖

Ambient: drifting mechanical sparks. No collectible, no presentation
effect — precision and reliability are the whole fantasy, carried entirely
by `complimenter` + `skipEvery`.

### Sprout 🌱

Ambient: floating pollen. Its `growth` field is the only mechanic —
deliberately the first companion whose payoff is a visible, staged object
on the widget itself rather than a number.

### Sir Baguette: Baguette Storm

Reuses NiNi's exact physics-burst mechanism (`CollectibleKit.burst`,
`companion-layer.tsx`'s `wordCount % every` trigger) rather than a new
consecutive-streak tracker. The brief's "long clean streak" becomes "every
15 correct answers this run" (10 on the ultimate) — the same
simplified-from-spec pattern already used for Otter's raft and Fox's shell
game, stated plainly rather than silently deviating. Bread, not bamboo; a
bigger burst (10–16 pieces vs. bamboo's 8–14).

---

## Rare cosmetic drops

Every reward table carries a 2% cosmetic slot. It grants something that
already exists — a season via `grantSeason(id)`, or a token skin — rather than
requiring a new asset pipeline.

Add a **pity timer**: guarantee a drop after N consecutive misses. Pure random
rarity reliably feels rigged to the unlucky, and the fix is cheap.

---

## Art assets

The particle engine rasterises **emoji glyphs** through canvas `fillText` into
a bucketed sprite cache. That is how all 20+ existing seasons ship, and every
effect in this document is achievable at full quality with **no art assets at
all**.

If custom artwork is wanted later for the hero companions, the change is small
and localised: extend `getSprite` to accept an image source alongside a glyph,
keeping the same bucketed cache and the same `drawImage` blit. Ambient
particles should stay emoji regardless — they are small, they are numerous,
and the sprite cache is what keeps them cheap.

---

## Build order

1. **Kit and ambient.** `companions.ts` plus `companion-layer.tsx`, reusing
   `createField`. Ships visible personality immediately at near-zero risk.
2. **Collectibles engine.** `collectibles.ts`, the reward roller, per-match
   caps.
3. **Per-companion specials.** NiNi's pacing and palette, Amber's bottle,
   Baguette's guest words and copy.
4. **Rare drops and the pity timer.**

## How to verify

- `pnpm run typecheck && pnpm run build`.
- **Occlusion, in headless Chromium at 393×620, 430×900 and 768×1024:** assert
  no collectible rect intersects the word rect or any control rect; in draw
  mode assert none intersects the canvas rect.
- **Stroke integrity:** in draw mode, draw across a region where a collectible
  sits. The stroke must register and no tap may fire.
- **Reduced motion:** emulate `prefers-reduced-motion: reduce` and confirm
  collectibles still render and still pay out.
- **Economy:** play a match tapping everything reachable; assert each
  `capPerMatch` holds and that hearts never exceed the maximum.
- **Learning-data integrity:** answer a guest word correctly, then assert
  `getAllLifetimeWords()` gained nothing for the guest language and the review
  queue is unchanged. This is the Polyglot-badge regression test.
- **Theme safety:** equip NiNi, unequip, and confirm `lok-lingu-theme` is
  byte-identical to its value beforehand.
