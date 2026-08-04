---
name: iOS voice keepalive
description: How to keep Web Speech API alive between restarts on iOS Safari and Android Chrome
---

iOS Safari and Android Chrome kill the audio session between `SpeechRecognition.start()` calls when the AudioContext goes idle. The symptom: the first word works, then the mic silently stops responding.

**Fix (already implemented):** In `web-speech-provider.ts`, `acquireKeepalive()` is called inside `start()` before every `r.start()`. It:
1. Calls `getUserMedia({ audio: true })` to hold the mic stream open
2. Creates an `AudioContext` and resumes it (iOS starts contexts suspended)
3. Tries to load `AudioWorkletNode` from `/audio-processor.js` (AudioKeepaliveProcessor that returns true forever)
4. Falls back to a silent gain node (gain=0.0001, NOT 0 — iOS suspends gain=0 contexts) if AudioWorklet fails

`public/audio-processor.js` registers `AudioKeepaliveProcessor` — it must stay in public/.

**Why:** The OS sees a continuous recording session and doesn't tear down the audio graph between SpeechRecognition restarts.

**How to apply:** `acquireKeepalive()` is idempotent — safe to call on every `start()`. The worklet URL is constructed from `import.meta.env.BASE_URL` to handle non-root deployments.
