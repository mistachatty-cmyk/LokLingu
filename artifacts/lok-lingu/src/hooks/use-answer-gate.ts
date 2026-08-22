import { useCallback, useRef } from 'react';

/* ------------------------------------------------------------------
   The answer gate — one way to suspend and resume answering.

   Events need to stop the player answering while a beat plays (scratch
   off the card, relight the room, slash the drone). Both game modes
   already have *a* lock, but they are different shapes and neither is
   safe to hold directly:

     voice (game.tsx)  `lockedRef` is checked by every answer path, and
                       nothing clears it but the explicit setTimeout
                       bodies — so it can be held indefinitely. The trap:
                       `handleResult` returns early *before* aborting the
                       recognition session, so the mic stays hot and
                       transcripts are silently swallowed. A player
                       talking to a blocked screen gets no feedback and
                       loses whatever they said. The gate aborts the
                       session on acquire and lets the loop reopen on
                       release.

     draw (draw.tsx)   gating rides on `status !== 'idle'`, but `status`
                       is also what drives word advance (`handleSuccess`
                       sets it back to 'idle' on a timer). Holding it
                       would desync advance timing, and adding a fourth
                       status value would ripple into the border-colour
                       ternary and the Done button's disabled state.
                       So draw gets a *separate* `eventLockRef` that its
                       answer paths check alongside `status`.

   Both modes therefore consult `isBlocked()` in addition to whatever
   they already did. No event touches a lock directly.

   Every acquire returns its own release function and is idempotent —
   double-release is a no-op — because the event director's 8s
   auto-resolve and an event's own completion can both fire, and
   whichever loses the race must not release a *later* event's hold.
------------------------------------------------------------------ */

export interface AnswerGate {
  /** True while any event holds the gate. */
  isBlocked: () => boolean;
  /**
   * Suspend answering. Returns the matching release; calling it more
   * than once, or after another holder has taken over, does nothing.
   */
  acquire: (reason: string) => () => void;
  /** Who holds it, for debugging and for the director's cooldown logic. */
  heldBy: () => string | null;
}

export interface AnswerGateOptions {
  /**
   * Voice mode: close the live recognition session so a blocked screen
   * isn't quietly eating speech. Omit in draw mode.
   */
  onAcquire?: () => void;
  /** Voice mode: nudge the recogniser back open once the beat is done. */
  onRelease?: () => void;
}

export function useAnswerGate({ onAcquire, onRelease }: AnswerGateOptions = {}): AnswerGate {
  // A monotonically increasing token identifies the current holder, so a
  // stale release (auto-resolve firing after the player already finished)
  // can be recognised and ignored.
  const tokenRef = useRef(0);
  const heldByRef = useRef<string | null>(null);

  const isBlocked = useCallback(() => heldByRef.current !== null, []);
  const heldBy = useCallback(() => heldByRef.current, []);

  const acquire = useCallback(
    (reason: string) => {
      const token = ++tokenRef.current;
      heldByRef.current = reason;
      onAcquire?.();
      return () => {
        // Someone else has since acquired — this release is stale.
        if (tokenRef.current !== token) return;
        if (heldByRef.current === null) return;
        heldByRef.current = null;
        onRelease?.();
      };
    },
    [onAcquire, onRelease],
  );

  return { isBlocked, acquire, heldBy };
}
