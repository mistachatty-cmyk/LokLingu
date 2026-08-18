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
  copy: { quips: string[]; onCorrect?: string; onGameOver?: string };
}
```

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
