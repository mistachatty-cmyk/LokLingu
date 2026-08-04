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

- **`interimResults = false` on iOS** — iOS WebKit never fires interim result events reliably. Sessions end via `onend` with no `onresult`, registering as empty. Set `r.interimResults = !IS_IOS` in `build()`. Final-only results work correctly on iOS.

- **Restart delay 500ms on iOS** — iOS needs ~500ms after `onend` before accepting a new `r.start()`. Desktop/Android Chrome works with 300ms. `RESTART_DELAY_MS` is set to `IS_IOS_ENGINE ? 500 : 300` in `use-speech-engine.ts`.

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
