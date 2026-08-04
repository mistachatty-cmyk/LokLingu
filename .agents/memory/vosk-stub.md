---
name: Vosk browser stub
description: vosk-browser is firewalled in this Replit environment — provider is a stub, model detection returns false
---

`vosk-browser` is blocked by the Replit package registry (403). Any dynamic `import('vosk-browser')` — even with `/* @vite-ignore */` — causes a Vite 500 overlay that blocks the entire app.

**Rule:** `artifacts/lok-lingu/src/lib/speech/vosk-provider.ts` is a permanent stub. It exports `createVoskProvider` (throws immediately), `voskSupportsLanguage` (always false), and `voskModelConfigured` (always false). It must never import `vosk-browser`.

**Rule:** `voskModelConfigured()` in `vosk-models.ts` returns false when `VITE_VOSK_MODEL_BASE` env var is not set. Without this guard, `chooseEngine()` picks Vosk on Safari/Firefox even though no models are hosted, causing the mic to go silent.

**Why:** `voskModelUrl()` naively returns a `/models/${lang}.tar.gz` path for every mapped language — it returns non-null even without a real model host. The guard prevents this false-positive.

**How to apply:** Never remove the `if (!explicitBase) return false` guard from `voskModelConfigured`. If Vosk is ever properly set up, `VITE_VOSK_MODEL_BASE` must be explicitly set in the environment.
