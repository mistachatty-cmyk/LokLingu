# Speech recognition — how it works and how to keep it working

**If voice breaks, read this file first.** It exists so that a human or an AI
agent picking this up cold does not re-derive the same conclusions.

## The one thing to understand

There is no single speech engine that works everywhere. LokLingu ships two and
picks between them at runtime.

| Platform | Web Speech API | What LokLingu does |
| --- | --- | --- |
| Chrome / Edge desktop | Works (streams to Google) | Uses Web Speech |
| Chrome Android | Works | Uses Web Speech |
| **Safari (macOS / iOS)** | API exists, but sessions drop after ~one phrase | **Uses Vosk** |
| Firefox | Not implemented at all | Uses Vosk |
| **Electron / Steam build** | Constructor exists, **no backend behind it** | **Uses Vosk** |

That Electron row is why Web Speech alone can never satisfy "must work on
Steam". It is not a bug we can fix; the speech backend simply is not shipped
in Electron.

Selection logic lives in `src/lib/speech/capabilities.ts`. Do not "simplify" it
by trusting `window.SpeechRecognition` — its presence proves nothing.

## Making Safari work (the important part)

Safari needs Vosk, and Vosk needs a model file. Models are 15–50 MB each and
are deliberately **not** committed to git.

```bash
cd artifacts/lok-lingu

pnpm install                                   # needs adm-zip + tar
node scripts/fetch-vosk-models.mjs --list      # see what is available
node scripts/fetch-vosk-models.mjs es fr ja    # only the languages you ship
```

Expect ~40 MB downloaded and ~40 MB written per language. Verified for
Spanish:

```
↓ es: downloading vosk-model-small-es-0.42.zip … 39.8 MB
  repacking as es.tar.gz … 40.2 MB
Ready: es
```

### Why the script repacks instead of just downloading

alphacephei publishes `.zip` archives whose top folder is version-stamped
(`vosk-model-small-es-0.42/`). vosk-browser loads a **gzipped tar** whose top
folder is literally `model`. Pointing the app at the published `.zip` does not
work — and an earlier version of this script requested a `.tar.gz` URL that
never existed, so it 404'd on every language. The script now downloads the
zip, extracts it, and rewrites it as `<lang>.tar.gz` rooted at `model/`, using
`adm-zip` and `tar` rather than shelling out so it works on Windows too.

This writes to `public/models/`, which is served at `/models` on the same
origin as the app. **No environment variable is needed** — `/models` is the
default. Same-origin also means no CORS configuration to get wrong.

### If you would rather host models elsewhere

Set `VITE_VOSK_MODEL_BASE` to the base URL of a host holding the same archive
file names:

```bash
# .env.local for local dev
VITE_VOSK_MODEL_BASE=https://models.example.com/vosk
```

On Vercel: Project → Settings → Environment Variables → add
`VITE_VOSK_MODEL_BASE`, then redeploy. It must be readable at build time; Vite
inlines `VITE_*` variables into the bundle, so **changing it requires a
redeploy, not just a restart**.

The host must send permissive CORS headers (`Access-Control-Allow-Origin`).
This is the usual reason a custom host fails while `/models` works.

### Deployment size

Every model in `public/models/` ships with the site. Start with the two or
three languages you actually promote. Adding all seventeen will blow past
practical deployment limits.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Mic button does nothing, no error | You are in **draw** mode, not voice | Home screen → tap VOICE. The mode picker sits above START. |
| "No speech engine available" | Neither Web Speech nor WebAssembly | Genuinely unsupported browser; nothing to do |
| Safari falls back to the browser engine | No model downloaded for that language | Run the fetch script for that language and redeploy |
| Works in Chrome, dead in Safari/Firefox | Same as above | Same as above |
| Recognition is inaccurate while counting | Grammar hint not reaching the engine | Check `expected` is passed from `game.tsx` into `useSpeechEngine` |
| Loop stops after one word | A `start()` failure was swallowed | `attemptStart` must retry with backoff — never return silently on throw |
| Permission prompt never appears | Page is not on HTTPS | Mic requires a secure context (localhost counts) |

## Accuracy design

Two mechanisms, deliberately layered:

1. **Grammar restriction (Vosk only).** `game.tsx` passes `expected` — the
   words the player could plausibly say next, including a four-number
   look-ahead while counting. Vosk turns this into a hard grammar, so it
   cannot return a word outside the set. This is by far the biggest accuracy
   win and it only works offline.
2. **Fuzzy matching (both engines).** `lib/speech-utils.ts` strips accents and
   punctuation, accepts pronunciation alternates (romaji, pinyin), allows
   bidirectional containment for CJK, and permits 1–2 edits of Levenshtein
   distance on Latin scripts so "dose" still matches "dos".

Web Speech ignores grammar lists — every shipping browser treats
`SpeechGrammarList` as a no-op — so layer 2 does all the work there.

## Invariants — do not break these

- **One provider instance per mount.** Rebuilding while the mic is still
  releasing throws `InvalidStateError`.
- **A failed `start()` must reschedule.** Swallowing the throw is what
  originally killed the loop permanently after a single word.
- **`no-speech` and `aborted` are normal.** Only `not-allowed` is fatal.
- **Engines fall back once.** A missing model degrades to the other engine
  instead of leaving a dead button.
