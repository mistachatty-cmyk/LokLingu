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
| **Bot-Loko** | T2 | no | P2 `slash` under time pressure, with a real stake |

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
| **The Eclipse** — a dark disc transits the word over ~4s; tap to push it along faster | P1 | T0 |
| **Mirror Mode** — the word renders flipped; swipe to unflip, or answer it flipped for double tokens | P1 `flipX` | T0 |
| Ink splatter | P1 mask + P2 scrub | T1 |
| Tomato splat | P1 mask | T0 |
| Lights out — tap to relight, node bar filling on the right | P2 tap | T1 |
| Light switch — the screen inverts until flipped back | P1 `invert` + P2 tap | T1 |
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
| Ant colony crossing the bottom — smash for a bonus, or let two pass and they leave 20 tokens behind | T0 |
| Space Invaders — clear the wave to continue | T1 |
| Baguette storm on a long clean streak | T0 |

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
