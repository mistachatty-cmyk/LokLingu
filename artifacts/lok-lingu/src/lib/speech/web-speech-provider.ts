import type { ProviderInit, SpeechErrorCode, SpeechProvider } from './types';

/* ------------------------------------------------------------------
   Web Speech provider — with AudioContext keepalive.

   iOS Safari and Android Chrome kill the Web Speech session whenever
   the audio session goes idle (typically after the first word or a
   brief silence). Keeping an AudioContext + MediaStream alive tricks
   the OS into treating the app as a continuous recording session, so
   every subsequent .start() call succeeds immediately.

   Architecture (from system design doc — Decoupled & Hybrid Thread):
     1. getUserMedia() — captures mic once, holds the stream open
     2. AudioWorkletProcessor (audio-keepalive) or silent gain node
        routes the stream so the AudioContext never suspends
     3. Web Speech API restarts benefit from the always-live session

   ⚠️  ORDERING CONSTRAINT (iOS Safari — do NOT change without reading this):
   r.start() MUST be called SYNCHRONOUSLY before any `await` inside
   start(). iOS Safari's Web Speech implementation checks that the call
   originates from a user-gesture context. Any `await` before r.start()
   yields the call stack and severs that context — Safari then silently
   ignores the r.start() call, producing a session that "starts" but
   never fires onresult or onerror, only onend.
   The fix: call r.start() first, then fire acquireKeepalive() as a
   non-blocking background task. Keepalive only matters for subsequent
   restarts (it holds the AudioContext open between sessions), so
   firing it after start() is both safe and correct.
------------------------------------------------------------------ */

/** True on iPhone, iPad, or iPod — covers Safari, Chrome-iOS, Firefox-iOS
 *  (all use WebKit and share the same Web Speech quirks). */
const IS_IOS = /iphone|ipad|ipod/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : '',
);

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: SpeechResultEvent) => void) | null;
}

interface SpeechResultEvent {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; length: number; [j: number]: { transcript: string } };
  };
}

function mapError(code: string): SpeechErrorCode {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not-allowed';
    case 'no-speech':
      return 'no-speech';
    case 'aborted':
      return 'aborted';
    case 'network':
      return 'network';
    default:
      return 'unknown';
  }
}

export function createWebSpeechProvider(init: ProviderInit): SpeechProvider {
  const { callbacks } = init;
  let lang = init.lang;
  let rec: ISpeechRecognition | null = null;
  let destroyed = false;

  // ── AudioContext keepalive ──────────────────────────────────────────────────
  let audioCtx: AudioContext | null = null;
  let micStream: MediaStream | null = null;
  let keepaliveReady = false;
  let keepaliveAttempted = false;

  /**
   * Acquire the mic stream and hold it open through an AudioContext.
   * Safe to call multiple times — only runs once per provider instance.
   * Must be called from inside a user-gesture handler on first invocation.
   */
  async function acquireKeepalive(): Promise<void> {
    if (keepaliveReady || keepaliveAttempted) return;
    keepaliveAttempted = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      micStream = stream;

      const ctx = new AudioContext({ sampleRate: 48000 });
      audioCtx = ctx;

      // iOS Safari starts AudioContexts suspended — must resume on user gesture
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);

      // Try AudioWorklet (cleanest — fully off main thread)
      let workletOk = false;
      try {
        const base: string = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
        const workletUrl = base.endsWith('/') ? `${base}audio-processor.js` : `${base}/audio-processor.js`;
        await ctx.audioWorklet.addModule(workletUrl);
        const node = new AudioWorkletNode(ctx, 'audio-keepalive');
        source.connect(node);
        // Don't connect to destination — we don't want to hear the mic
        workletOk = true;
      } catch {
        /* AudioWorklet not supported — use silent gain fallback */
      }

      if (!workletOk) {
        // Gain node at near-zero volume keeps context running without feedback.
        // Must be > 0: iOS suspends contexts with gain === 0.
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        source.connect(gain);
        gain.connect(ctx.destination);
      }

      keepaliveReady = true;
    } catch {
      // getUserMedia denied or unavailable — speech may still work on desktop;
      // swallow and let the recognition attempt proceed without keepalive.
    }
  }

  // ── Recognition instance ────────────────────────────────────────────────────

  const build = (): ISpeechRecognition | null => {
    if (rec) return rec;
    const w = window as unknown as {
      SpeechRecognition?: new () => ISpeechRecognition;
      webkitSpeechRecognition?: new () => ISpeechRecognition;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return null;

    const r = new Ctor();
    r.continuous = false;
    // interimResults = true on all platforms, including iOS.
    //
    // Earlier this was set to `!IS_IOS` because interim results on iOS were
    // thought to cause empty-session false-positives (sessions ending via onend
    // with no onresult). That analysis was wrong: the empty-session guard in
    // useSpeechEngine sets gotResultThisSessionRef=true on ANY onUpdate call
    // (interim or final), so receiving an interim result correctly prevents
    // the session from being counted as empty.
    //
    // Enabling interim results on iOS lets the game match mid-utterance
    // (~300–600ms earlier than waiting for iOS silence-detection to fire the
    // final result). The game can also call r.abort() immediately on match,
    // starting the restart timer in parallel with the hit animation.
    r.interimResults = true;
    r.maxAlternatives = 5;
    r.lang = lang;

    r.onstart = () => callbacks.onListening();

    r.onresult = (event: SpeechResultEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const isFinal = !!result.isFinal;
        // Every alternative is offered to the matcher — the engine's second
        // guess is often the correct word.
        for (let j = 0; j < (result.length ?? 1); j++) {
          const transcript = result[j]?.transcript?.trim();
          if (transcript) callbacks.onUpdate({ transcript, isFinal });
        }
      }
    };

    r.onerror = (e) => callbacks.onError(mapError(e?.error ?? 'unknown'), e?.error);
    r.onend = () => {
      // iOS Safari requires a NEW SpeechRecognition instance for every
      // start() call — reusing the same object after onend causes silent
      // failures on subsequent restarts. Clearing rec here forces build()
      // to create a fresh instance on the next start().
      rec = null;
      callbacks.onSessionEnd();
    };

    rec = r;
    return r;
  };

  return {
    id: 'web-speech',
    selfSustaining: false,

    async start() {
      if (destroyed) return;

      const r = build();
      if (!r) {
        callbacks.onError('engine-unavailable', 'SpeechRecognition constructor missing');
        throw new Error('web-speech unavailable');
      }
      r.lang = lang;

      // ⚠️  ORDERING CONSTRAINT (iOS Safari): r.start() MUST come before any
      // `await`. iOS checks that start() is called synchronously within the
      // user-gesture context. Any await before this line severs that context
      // and Safari silently ignores the call (no error, no result, just onend).
      // Throws InvalidStateError if the previous session is still closing —
      // the caller backs off and retries rather than treating it as fatal.
      r.start();

      // Fire keepalive acquisition as a non-blocking background task AFTER
      // r.start(). It only matters for *subsequent* restarts (holds the
      // AudioContext open so the OS doesn't tear down the audio graph between
      // sessions). Firing it here — still inside the user-gesture tick — is
      // sufficient for getUserMedia permission on first use.
      acquireKeepalive().catch(() => {
        // getUserMedia denied or AudioContext failed — speech still works on
        // desktop; mobile may lose keepalive but the session already started.
      });
    },

    stop() {
      try {
        rec?.stop();
      } catch {
        /* already stopped */
      }
    },

    destroy() {
      destroyed = true;
      // Clean up recognition instance
      const r = rec;
      rec = null;
      if (r) {
        r.onresult = null;
        r.onend = null;
        r.onerror = null;
        r.onstart = null;
        try { r.abort(); } catch { /* already dead */ }
      }
      // Clean up AudioContext keepalive
      try { audioCtx?.close(); } catch { /* already closed */ }
      micStream?.getTracks().forEach((t) => t.stop());
      audioCtx = null;
      micStream = null;
      keepaliveReady = false;
      keepaliveAttempted = false;
    },

    setLanguage(next: string) {
      lang = next;
      if (rec) rec.lang = next;
    },

    setExpected() {
      // The Web Speech grammar list is a no-op in every shipping browser.
      // Accuracy for expected words is handled by the fuzzy matcher.
    },
  };
}
