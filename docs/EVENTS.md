# Events: the random beats that interrupt, decorate, and reward the word loop

**This is the design record for the companion event system.** It is the
sibling of [`COMPANIONS.md`](./COMPANIONS.md): that document specifies what a
companion *is* while equipped, this one specifies the episodic beats that fire
*during* a run — a word going blurry, a scratch panel dropping over it, a drone
coming for your skips.

The point of writing it down is the same as before. Events are data rows
against three shared primitives, so event #20 is a small component and a table
entry rather than a fresh pile of pointer handling.

---

## The one rule, amended

`COMPANIONS.md`'s founding rule is **never occlude the word**. Several events
here — ink, fog, the scratch card, lights-out — exist precisely to occlude it.
That is not an exception to the rule; it is a narrower version of it:

> An effect may obscure the word **only while answering is blocked, and only
> when clearing the obstruction is the event's own win condition.** The instant
> answering is live again, the word is fully legible. Passive effects — every
> trait, every word animation — may never reduce legibility at any frame.

The original guarantee survives intact: **you are never asked to answer a word
you cannot read.**

---

## The three primitives

Everything below is built from these. They are written once.

### P1 · Word effects — `src/lib/word-effects.ts`

Owns how the word is *shown* this turn. `GameWord` splits the word into
per-letter `<motion.span>`s with a staggered index delay, which buys wave,
ripple, jitter, tumble, orbit, drift, melt, shatter, typewriter and glitch
essentially for free. A `WordPresentation` carries the rest — display-text
override, blur, scale, flip, invert, mask coverage, tint.

The display text is **already decoupled** from the answer target
(`currentWord` renders, `currentWordRef.current.word` matches), so no
presentation can ever change what counts as correct.

`bend` is a per-letter parabola rather than an SVG `textPath`, deliberately:
the whole vocabulary composes because everything is a per-letter transform,
and one effect rendering through a different element tree would not stack with
the others.

### P2 · Gesture surface — `src/components/gesture-surface.tsx`

The app's first interactive in-game layer. Before it, every overlay was
`pointer-events: none` and the only mid-game tap capture was
`collectibles.ts`'s window listener.

Three gestures cover the whole catalogue:

| Gesture | Serves |
| --- | --- |
| `tap` | lights-out relight, ant smash, vending machine, invaders |
| `slash` | Bot-Loko intercept, fruit-ninja throws |
| `scrub` | scratch card, fog wipe, pull-the-background-back |

Two details that are load-bearing rather than incidental:

- **`slash` sweeps segments, not sampled vertices.** A fast flick reports
  points 80px apart; testing only those misses a target the stroke visibly cut
  straight through.
- **`onMove` is unthrottled and separate from `onScrub`.** Coverage is
  rAF-coalesced, which is right for a scratch card and wrong for hit-testing
  something that moves while you swipe.

Its capture area is insettable. An event that can run for several seconds
**must** leave Home and the mic reachable — a full-screen surface that traps
the HUD for eight seconds is a bug, and was one.

### P3 · Answer gate — `src/hooks/use-answer-gate.ts`

One token-based hold on answering, acquired and released by the director. No
event touches a lock directly.

Voice passes `onAcquire: () => abortSessionRef.current()`, because the mic
otherwise stays hot while locked and silently swallows whatever the player
says into a blocked gate.

---

## The director — `src/components/event-director.tsx`

Owns the roll (one per word), per-run caps, the global cooldown so two events
never land back to back, the settings gate, and the escape hatch.

**The roll is gated first, then specialised.** A single frequency check decides
*whether* anything fires; only then is a specific event picked from the
weighted table. So adding events enriches the mix without silently raising how
often the player is interrupted.

**The escape hatch is the safety property.** Every event force-resolves after
its own `durationMs` — *in the player's favour*. A dead digitiser, a motor
difficulty, or a gesture someone simply cannot perform must never trap anyone
behind a locked answer gate.

A blocking event gets no animation grace on that hatch. It is holding the gate,
and the player waits out every extra millisecond of it. Non-blocking events get
room to finish their own exit animation.

---

## Severity tiers

Debuffs are tiered so nothing is unfair by accident.

| Tier | Costs | Examples |
| --- | --- | --- |
| **T0** Cosmetic | Nothing | Blurred Word, Eclipse, Tide, every affective beat |
| **T1** Tempo / token | Seconds or coins | Scratch Card, Fog, Word Search |
| **T2** Resource | A skip or a token stack | Bot-Loko, Glitch Trade |
| **T3** Heart / streak | Only on **telegraphed, opt-in, high-reward** beats — companion ultimates and deals the player explicitly accepted. Never a surprise. |

### The invariant that never bends

**No event or trait may write to the Leitner review queue, lifetime word
counts, or per-language counters.** This generalises Sir Baguette's guest-word
rule. Theatrics must never corrupt learning data or fraudulently trip
`checkPolyglotBadge()`.

This is a regression test, not a promise: every event is verified by
snapshotting those keys before and after it runs.

---

## Shipped events

| Event | Tier | Blocking | Proves |
| --- | --- | --- | --- |
| **Blurred Word** | T0 | no | P1, with no interaction risk at all |
| **Scratch Card** | T1 | yes | P2 `scrub` *and* a real hold on the gate |
| **The Eclipse** | T0 | no | P1 mask + an optional P2 `tap`, with nothing to win or lose |
| **Mirror Mode** | T0 | no | P1 `flipX` + an in-the-moment answer bonus, not just presentation |
| **Light Switch** | T1 | no | P1 `invert` + a single-tap resolve gesture |
| **Ant Colony** | T0 | no | Several independently-moving P2 targets on one surface, with two payout paths |
| **Bot-Loko** | T2 | no | P2 `slash` under time pressure, with a real stake |
| **Tomato Splat** | T0 | no | A cosmetic P1 mask + tint, zero interaction |
| **Ink Splatter** | T1 | yes | Scratch Card's mask+scrub+gate shape, reskinned and re-tuned |
| **Fruit Slash** | T0 | no | Bot-Loko's flight+slash shape with the stakes removed entirely |
| **Lights Out** | T1 | yes | A counted P2 `tap` ×10 with its own progress UI, not just a mask |
| **I Love You** | T0 | no | A fixed-timeline affective beat — see its own section for the scope simplification |

### Blurred Word

The word blurs for ~3.6s and clears on its own with a `typewriter` resolve.
Costs nothing; you can still answer through it if you already know the word.

The blur composes into the same `filter` string as the hit/miss brightness
animation. It has to: framer-motion's `animate` writes the property itself and
would otherwise silently clobber a `style` filter, which is exactly how this
event shipped invisible the first time.

### Scratch Card

The word hides under a foil panel; clear ~60% of it and answering unlocks. The
mask fades to fully clear exactly at the unlock threshold, so the word is never
still half-hidden at the moment you are allowed to answer.

Reduced motion swaps the drag for three large tap targets — same unlock, same
payout. **An accessibility setting must not become a paywall on progress.**

### The Eclipse

A dark disc transits the word over ~4.2s, darkest at the midpoint and clear at
both ends — a genuine transit, not a fade in and out. Tapping anywhere nudges
it along faster. There is nothing to win: the disc always clears on its own,
tapping only makes it clear sooner.

It is the gentlest interactive event in the catalogue on purpose. Blurred Word
proves presentation alone; this proves presentation plus an optional gesture
that can never fail — the point being that *not every event needs stakes to
justify existing.*

### Mirror Mode

The word renders flipped (`scaleX(-1)`, reusing `flipX` — already wired
into `GameWord`'s `animate`). A swipe unflips it early, purely as a
convenience; left alone, it stays flipped for the whole beat, and answering
it correctly *while it is still flipped* pays double the normal rate. The
host page's own answer handler reads the live `presentation.flipX` at the
moment a correct answer lands — the same place every other in-the-moment
bonus (Tiger's ambush, the Mi family's length bonus) is computed — so the
event component itself owns only the flip state and the early-clear
gesture, not the payout.

### Light Switch

The word inverts (the existing composed-filter `invert`) until a tap
flips it back. Unlike Mirror Mode there is no reward for leaving it
inverted — nothing to lose by clearing it immediately, so the only
decision is whether you can already read it inverted.

Scoped to the word itself rather than "the whole screen" as the original
brainstorm phrased it: inverting the entire viewport would fight every
other effect's contrast assumptions (mask overlays, tints), and a
word-scoped invert already delivers the same jarring, instantly-readable
-once-flipped beat without that cost.

### Ant Colony

Five ants cross the bottom edge, staggered, left to right. Tap one to
smash it for a small bonus (+2). Let two reach the far edge untouched and
they leave a bigger payout behind (+20) on their way out — so ignoring it
entirely isn't a loss, it's a smaller, later payout instead of a
tap-driven one. Every branch pays; nothing here can cost anything.

Proves the primitives can host *several independently-moving targets on
one surface* rather than just one (Bot-Loko) — each ant tracks its own
position and hit-tests independently against a shared `GestureSurface`.

### Bot-Loko

A bat-shaped retrieval drone flies a bowed curve toward your skip counter.
Slash it and it drops what it came for, plus a small reward. Let it land and it
takes one skip.

Non-blocking on purpose: you can ignore it entirely and keep answering. The
cost of ignoring it is a skip, never a heart and never your streak. A player
mid-sentence should not have to choose between the word and the drone. If there
are no skips to take, it leaves empty-handed rather than escalating to a heart
— **the tier is the contract.**

Hit-testing runs live on every pointer move against where the drone is *right
now*, with the completed-slash sweep kept as a backstop for a flick fast enough
that no single sample lands inside the radius.

#### Lore

Bot-Loko is a drone, **not an animal.** It was built in the same workshop that
mints Lok tokens, for a mundane job: retrieve dropped coins and return them to
the vault. A firmware fault inverted the instruction. It now retrieves them
*from* players and dutifully files them away, entirely convinced it is helping.

It is not malicious. It is mis-specified.

That distinction earns its place. It keeps the only antagonist in a learning
app non-threatening; it explains mechanically why it targets skips, hearts and
tokens rather than your answers or your streak; and it sets up the ultimate —
repair the firmware and Bot-Loko starts retrieving coins **for** you.

Intercepted, it emits an apologetic squeak and drops what it took.

### Tomato Splat

A tomato flies in and splats across the word for ~1.8s, tinted and masked
via P1, then fades on its own. No gesture, no gate, no win condition — the
original brainstorm's "distraction" is scoped to a word-local tint rather
than the whole viewport, same discipline as Light Switch: fighting every
other overlay for the entire screen buys nothing a word-scoped effect
doesn't already deliver.

### Ink Splatter

Mechanically Scratch Card with different skin and a lower clear threshold
(50% vs. 60%) — wipe the ink away (P2 `scrub`, or three taps under reduced
motion) before answering unlocks. Shipped as its own event rather than a
Scratch Card variant because the doc's catalogue named it separately and
the tuning genuinely differs, but it is intentionally *not* a third new
primitive — reuse, not reinvention.

### Fruit Slash

A fruit arcs across the screen on a throw, not a targeted flight; slash it
(P2 `slash`) for a bonus. This is Bot-Loko's exact flight-and-hit-test
shape with every stake removed — T0, not T2 — so missing it costs nothing
at all. Reduced motion parks it mid-arc and tappable, same as Bot-Loko.

### Lights Out

The word goes dark (`maskPct: 1`); ten taps (P2 `tap`, counted) bring it
back up, each one lifting the mask a step and filling one node on a bar
rendered by the event itself. The "whole screen goes dark" framing from the
brainstorm is scoped to the word, matching Light Switch and Tomato Splat's
established discipline rather than fighting the rest of the UI for control
of the viewport.

### I Love You

The word is replaced with "I love you" for a fixed ~3.4s beat: an audible
`awww` at 35% in, "I love you too" slides in beside it, `applause` closes
it out, then the real word returns. T0, non-blocking, zero interaction.

**Scope simplification, stated plainly:** the brief described *saying* "I
love you" as the trigger — which would mean the actual answer target
becomes "I love you" for that turn, the same shape as Sir Baguette's guest
word. Building that safely means touching the grading path in
`game.tsx`/`draw.tsx` and guarding it against the learning-data invariant
above (never let it reach the Leitner queue or lifetime/category counters).
That is real, scoped work for a future pass, not something to bolt on
quietly here. What shipped instead is a fixed-timeline affective beat in
the same family as The Toast and The Cheer below — all upside, nothing
graded, no risk to the invariant.

---

## Settings

`eventFrequency: 'off' | 'low' | 'normal' | 'high'`, default `normal`,
mirroring the existing `responseSpeed` three-way precedent.

`off` means **zero events**, not "fewer". A player who turns this off has said
they want the word loop and nothing else, and that has to be honoured exactly.

---

## Catalogue — designed, not yet built

Each is a data row plus a small stage component against the primitives above.

### Sensory interference

| Event | Primitive | Tier |
| --- | --- | --- |
| **Fogged Glass** — condensation creeps in from the edges; wipe it clear | P2 scrub | T1 |
| **The Slip** — the word slides toward one edge on ice; flick it back (it re-enters from the far side, never lost) | P1 + P2 slash | T1 |
| **Signal Loss** — the word degrades to static; drag an antenna until it locks sharp | P1 `glitch` + P2 | T1 |
| Ink splatter | P1 mask + P2 scrub | T1 |
| Tomato splat | P1 mask | T0 |
| Lights out — tap to relight, node bar filling on the right | P2 tap | T1 |
| Background floats up / screen drifts away — pull it back | P2 drag | T1 |

### Affective beats

| Event | Tier |
| --- | --- |
| **The Cheer** — after a long clean streak the word is briefly replaced by the player's own name, with a crowd swell | T0 |
| **Gracias** — the word becomes "gracias"; saying it gets a spoken *"de nada"* and a small bow. A real phrase inside a warm beat | T0 |
| **The Toast** — two glasses slide in and clink. Pure celebration, zero interaction | T0 |
| **Buenas Noches** — time-of-day aware (reusing Night Owl's `getHours()` check); once per session the word becomes the right greeting | T0 |
| **The Encore** — after a perfect segment, the word you just nailed replays in a spotlight with applause | T0 |
| "I love you" → *awww* → "I love you too" → clapping | T0 |

Every one of these is upside only. The affective half of this system exists to
reinforce success, not to demand more of the player.

### General

| Event | Tier |
| --- | --- |
| **Bot-Loko Swarm** — three on converging paths; intercept two or lose a skip | T2 |
| **The Vending Machine** — slides up with three buttons; pick one. Blocks answering, but every option is a gift — a choice ritual, not a risk | T1 |
| **Word Search** — the real word plus two near-miss decoys *from the same category*; tap the right one. The distractors teach too | T1 |
| **The Tide** — water rises from the bottom, pushed back by each correct answer. Capped at 60% height so it never reaches the word: urgency with no bite | T0 |
| **Glitch Trade** — offers a deal: give up 1 skip → 3× tokens for 5 words. Declining costs nothing (T3 only because *you took it*) | T3 |
| Repeat the word 1–5× — each utterance greys one out | T0, pays per line |
| Fruit-ninja slash | T0 |
| Space Invaders — clear the wave to continue | T1 |
| Baguette storm on a long clean streak | T0 |

### Five new ideas — proposed, not yet scoped

Genuinely new, not from the earlier brainstorm rounds this doc already
absorbed. Deliberately left as ideas rather than built this round —
each needs a real design pass (verified against the primitives, tiered,
checked against the invariant) the same way every shipped event was.

- **Paper Trail** — a paper airplane carrying the word sails across the
  screen on a curve; catch it before it exits for double tokens, or let
  it go for nothing lost. A slash-to-catch cousin of Bot-Loko and Mirror
  Mode's "answer it as-is or catch the bonus" shape, but the object
  itself is the reward this time, not a threat.
- **Split Decision** — the word briefly forks into two near-identical
  spellings (one real, one with a plausible letter swap); tap the
  correct one before it's safe to answer. Teaches spelling attention the
  same way Word Search's decoys teach vocabulary — the wrong option is
  the lesson, not just a trap.
- **Echo** — after a correct answer, the word is spoken back once more,
  softly, in reverse-fade — a celebratory audio flourish with zero
  interaction and zero cost, in the spirit of The Toast and The Encore.
- **The Weigh Station** — not an event but a companion trait candidate:
  a small on-screen scale that tips toward "balanced" as recent accuracy
  holds steady; staying balanced for N words grants a one-time streak-
  break immunity, the same shape as Crane's shield but earned by
  consistency rather than an unbroken streak.
- **Night Market** — not an event at all: a rotating shop idea. One
  random skin or motion the player doesn't yet own appears at a
  discount for 24 hours, refreshing daily. A genuinely different system
  from anything above (needs a real-time refresh clock and its own shop
  section), noted here so it isn't lost rather than because it's ready
  to build.

---

## Verification checklist

Anything added here is expected to clear the same bar the first three did:

- **The invariant.** Snapshot lifetime words, category counters and the Leitner
  queue before and after; they must be byte-identical.
- **The escape hatch.** Start the event and do *nothing*. It must auto-resolve
  in the player's favour and restore answering.
- **The HUD stays live.** Home and the mic must be reachable for every frame the
  event is on screen.
- **Reduced motion.** Still completable, still pays out, and every word effect
  collapses to a static, fully legible render.
- **Legibility.** Screenshot the effect at its most extreme frame. If the word
  is unreadable while answering is live, the event is broken.
- **Draw mode.** An event must never eat a canvas stroke.
- **`off` means zero.** A 50-word run at `off` produces no events at all.
