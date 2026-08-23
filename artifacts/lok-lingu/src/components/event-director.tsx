import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { useCelebrationSound } from '@/hooks/use-celebration-sound';
import { consumeSkip, earnTokens } from '@/lib/economy';
import { incrementBotLokoIntercepts } from '@/hooks/use-celebration';
import {
  EVENT_BY_ID,
  EVENT_COOLDOWN_MS,
  rollEvent,
  type CompanionEventDef,
  type EventId,
} from '@/lib/companion-events';
import { isDevMode } from '@/lib/dev-mode';
import type { WordPresentation } from '@/lib/word-effects';
import type { AnswerGate } from '@/hooks/use-answer-gate';
import { BlurredWord } from '@/components/events/blurred-word';
import { ScratchCard } from '@/components/events/scratch-card';
import { BotLoko } from '@/components/events/bot-loko';
import { Eclipse } from '@/components/events/eclipse';
import { MirrorMode } from '@/components/events/mirror-mode';
import { LightSwitch } from '@/components/events/light-switch';
import { AntColony } from '@/components/events/ant-colony';

/* ------------------------------------------------------------------
   The event director — one owner for when a beat fires and what it may do.

   Everything an event should not have to think about lives here:

     · the weighted roll, once per word
     · per-run caps and a global cooldown, so two never land back to back
     · the settings gate (`eventFrequency`, including `off`)
     · **the escape hatch** — every event is force-resolved after its
       own durationMs, in the player's favour. A blocking event that
       could outlive its own timer would be a soft lock, and the one
       thing worse than an annoying interruption is an inescapable one.
     · releasing the answer gate exactly once, no matter whether the
       player finished the beat or the timer did

   Events themselves are dumb: they render, they report, they call back.
   Adding one is a registry row plus a case in the switch below.
------------------------------------------------------------------ */

/**
 * Dev-mode QA hook: pin one event so it fires on every word instead of
 * being rolled for. Random events are close to untestable otherwise —
 * verifying the scratch card's gate hold, or that Bot-Loko's slash
 * hit-test actually connects, would mean grinding dozens of words and
 * hoping. Ignored entirely unless dev mode is on, so this cannot affect
 * a real player.
 *
 *   localStorage['lok-lingu-dev-mode'] = 'true'
 *   localStorage['lok-lingu-force-event'] = 'scratch-card'
 */
function forcedEvent(): CompanionEventDef | null {
  if (!isDevMode()) return null;
  try {
    const id = localStorage.getItem('lok-lingu-force-event');
    return id ? (EVENT_BY_ID.get(id as EventId) ?? null) : null;
  } catch {
    return null;
  }
}

interface Props {
  /** Words answered correctly this run — the roll trigger and the gate on minWords. */
  wordCount: number;
  /** Shared gate; the director is the only thing that acquires or releases it. */
  gate: AnswerGate;
  /** Reports the active event's display treatment up to GameWord. */
  onPresentation: (p: WordPresentation | null) => void;
  /** Short label for the host's existing token/skip flash. */
  onNotice?: (text: string) => void;
  /**
   * False on a screen that already owns the pointer for answering — draw
   * mode. Non-blocking gesture events are then dropped from the roll
   * instead of mounting a surface that eats canvas strokes.
   */
  pointerFree?: boolean;
  /**
   * True once the equipped companion is Bot-Loko with its ultimate
   * unlocked (`droneAlly` — see companions.ts). Flips the `bot-loko`
   * event's escape outcome from a skip cost to a reward: the lore payoff
   * of repairing the drone's firmware. Everyone else sees the event
   * exactly as documented in docs/EVENTS.md.
   */
  botLokoAlly?: boolean;
}

export function EventDirector({
  wordCount,
  gate,
  onPresentation,
  onNotice,
  pointerFree = true,
  botLokoAlly = false,
}: Props) {
  const { eventFrequency } = useSettings();
  const { play } = useCelebrationSound();

  const [active, setActive] = useState<CompanionEventDef | null>(null);
  const firedRef = useRef<Partial<Record<EventId, number>>>({});
  const cooldownUntilRef = useRef(0);
  const releaseRef = useRef<(() => void) | null>(null);
  const lastRolledWordRef = useRef(-1);
  // Guards double-resolution: the player finishing and the escape hatch
  // firing can race, and whichever loses must be a no-op.
  const resolvingRef = useRef(false);

  /** Tears down whatever is running and starts the cooldown. */
  const finish = useCallback(() => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    releaseRef.current?.();
    releaseRef.current = null;
    onPresentation(null);
    setActive(null);
    cooldownUntilRef.current = Date.now() + EVENT_COOLDOWN_MS;
  }, [onPresentation]);

  // ── the roll ──────────────────────────────────────────────────────
  useEffect(() => {
    if (wordCount <= 0) return;
    // One roll per word, even if this re-renders for unrelated reasons.
    if (lastRolledWordRef.current === wordCount) return;
    lastRolledWordRef.current = wordCount;
    if (active) return;

    const forced = forcedEvent();
    // The QA override forces *which* event, not whether the screen can
    // afford it — otherwise forcing a gesture event in draw mode would
    // demo behaviour the roll can never actually produce.
    const usable =
      forced && !(forced.needsPointer && !forced.blocking && !pointerFree) ? forced : null;
    const picked = usable ?? rollEvent({
      frequency: eventFrequency,
      wordCount,
      firedCounts: firedRef.current,
      suppressed: Date.now() < cooldownUntilRef.current,
      pointerFree,
    });
    if (!picked) return;

    firedRef.current[picked.id] = (firedRef.current[picked.id] ?? 0) + 1;
    resolvingRef.current = false;
    if (picked.blocking) {
      releaseRef.current = gate.acquire(picked.id);
    }
    setActive(picked);
  }, [wordCount, eventFrequency, active, gate, pointerFree]);

  // ── the escape hatch ──────────────────────────────────────────────
  // Every event, blocking or not, is force-resolved after durationMs.
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => {
      // Timing out a blocking event resolves it *for* the player — they
      // never lose anything to a gesture they could not perform.
      finish();
      // A non-blocking event gets room for its own resolution animation
      // (Bot-Loko resolving on the last frame still finishes its exit). A
      // blocking one does not: it is holding the answer gate, and the
      // player waits out every extra millisecond of it.
    }, active.durationMs + (active.blocking ? 250 : 1200));
    return () => window.clearTimeout(t);
  }, [active, finish]);

  // Never leave the gate held if the screen unmounts mid-event.
  useEffect(() => {
    return () => {
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, []);

  if (!active) return null;

  switch (active.id) {
    case 'blurred-word':
      return (
        <BlurredWord
          durationMs={active.durationMs}
          onPresentation={onPresentation}
          onDone={finish}
        />
      );

    case 'eclipse':
      return (
        <Eclipse
          durationMs={active.durationMs}
          onPresentation={onPresentation}
          onDone={finish}
        />
      );

    case 'mirror-mode':
      return (
        <MirrorMode
          durationMs={active.durationMs}
          onPresentation={onPresentation}
          onDone={finish}
        />
      );

    case 'light-switch':
      return (
        <LightSwitch
          durationMs={active.durationMs}
          onPresentation={onPresentation}
          onDone={finish}
        />
      );

    case 'ant-colony':
      return (
        <AntColony
          durationMs={active.durationMs}
          onSquash={() => {
            play('pop', 'mini');
            earnTokens(2);
            onNotice?.('+2 🐜');
          }}
          onEscapeBonus={() => {
            play('chime', 'big');
            earnTokens(20);
            onNotice?.('🐜🐜 slipped past — +20 ✨');
          }}
          onDone={finish}
        />
      );

    case 'scratch-card':
      return (
        <ScratchCard
          onProgress={(pct) => onPresentation(pct > 0 ? { maskPct: pct } : null)}
          onCleared={() => {
            play('lock', 'mini');
            earnTokens(3);
            onNotice?.('+3 ✨');
            finish();
          }}
        />
      );

    case 'bot-loko':
      return (
        <BotLoko
          durationMs={active.durationMs}
          onIntercept={() => {
            play('pop', 'big');
            earnTokens(8);
            onNotice?.('+8 🦇');
            // Lifetime count, independent of whether this run has Bot-Loko
            // equipped at all — it's the unlock gate for the companion
            // itself (see achievements.ts's 'botloko-caught').
            incrementBotLokoIntercepts();
          }}
          onEscape={() => {
            if (botLokoAlly) {
              // The lore payoff: repaired, it now retrieves *for* the
              // player instead of taking from them.
              earnTokens(5);
              play('chime', 'mini');
              onNotice?.('🦇 brought you 5 ✨');
              return;
            }
            // T2: costs a skip and nothing more. If there are none to
            // take, the drone leaves empty-handed rather than escalating
            // to a heart — the tier is the contract.
            const took = consumeSkip();
            play('thud', 'mini');
            onNotice?.(took ? '🦇 took a skip' : '🦇 found nothing');
          }}
          onDone={finish}
        />
      );

    default:
      return null;
  }
}
