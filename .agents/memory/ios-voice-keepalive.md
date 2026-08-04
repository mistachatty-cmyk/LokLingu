---
name: iOS voice keepalive
description: iOS Safari Web Speech ordering constraint and keepalive architecture — CRITICAL, read before touching web-speech-provider.ts
---

## ⚠️ ORDERING CONSTRAINT — do NOT change without reading this

`r.start()` MUST be called **synchronously** before any `await` inside `start()`.

iOS Safari checks that `SpeechRecognition.start()` originates from a user-gesture context. Any `await` before `r.start()` yields the call stack and severs that context — Safari then silently ignores the call: no `onerror`, no `onresult`, only an immediate `onend`. This looks like a working session that produces nothing, causing the empty-session counter to hit 3 and trigger a fallback engine switch.

**The correct order in `start()`:**
1. `r.start()` — synchronous, still inside user-gesture tick
2. `acquireKeepalive().catch(() => {})` — non-blocking, fired after r.start()

Keepalive only helps *subsequent* restarts (it keeps the AudioContext alive between sessions). Firing it after `r.start()` is safe and correct.

**Why:** iOS Safari's user-gesture requirement is checked at the moment the JS call stack enters start() — it is not preserved across microtask boundaries.

---

## iOS-specific quirks also implemented

- **Fresh SpeechRecognition instance per session** — iOS Safari silently rejects `r.start()` when called on an instance that has already fired `onend`. The `rec` variable is set to `null` inside the `onend` handler so `build()` always creates a brand-new instance for each restart. DO NOT change `onend` to omit the `rec = null` line.

- **`interimResults = true` on ALL platforms including iOS** — Interim results are enabled on iOS. The original concern (sessions ending with no `onresult` counting as empty) does not apply: `gotResultThisSessionRef` is set to `true` by ANY `onUpdate` call (interim or final), so receiving an interim result correctly prevents the empty-session count from incrementing. Enabling interim results lets the game match mid-utterance (~300–600ms earlier than waiting for iOS silence-detection to fire a final result).

- **`abortSession()` on match** — When a word is matched in `game.tsx`, call `abortSession()` (exposed from `useSpeechEngine`) before the hit-animation `setTimeout`. This calls `providerRef.current?.stop()` without setting `wantListeningRef = false`, triggering `onend` immediately so the restart timer starts in parallel with the hit animation rather than after it.

- **Restart delay 500ms default on iOS, overridden by response-speed setting** — `RESTART_DELAY_MS = IS_IOS_ENGINE ? 500 : 300`. The response-speed setting (`use-settings.ts`, key `lok-lingu-response-speed`) passes `restartDelay` to `useSpeechEngine`, overriding the default. Fast mode uses 250ms on iOS. Floor is enforced at 150ms on iOS regardless.

- **Gain node must NOT be 0** — iOS suspends AudioContexts with a gain of exactly 0. The silent gain fallback uses `0.0001`.

---

## Keepalive architecture

`acquireKeepalive()` (idempotent — runs only once per provider instance):
1. `getUserMedia({ audio: true })` — holds the mic stream open
2. `new AudioContext({ sampleRate: 48000 })` + `ctx.resume()` (iOS starts contexts suspended)
3. Tries `AudioWorkletNode` from `{BASE_URL}audio-processor.js` (registers `audio-keepalive` processor)
4. Falls back to a gain node at `0.0001` (NOT 0) if AudioWorklet fails

`public/audio-processor.js` (in the `lok-lingu` artifact) registers `AudioKeepaliveProcessor` — it must stay in `public/`.

**Why:** The OS sees a continuous recording session and doesn't tear down the audio graph between SpeechRecognition restarts.
