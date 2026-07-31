import type { ProviderInit, SpeechProvider } from './types';
import { VOSK_MODELS, voskModelUrl } from './vosk-models';

/* ------------------------------------------------------------------
   Vosk provider — offline speech through WebAssembly.

   Works in Firefox, Safari and Electron/Steam builds, where Web Speech
   either does not exist or has no backend. Costs one model download per
   language, cached by the browser afterwards.

   The accuracy trick: Vosk accepts a *grammar*. When the game tells us
   which words are plausible right now, the recogniser is restricted to
   that set and effectively cannot mishear "seven" as "heaven".
------------------------------------------------------------------ */

interface KaldiRecognizer {
  on(event: 'result', cb: (m: { result: { text: string } }) => void): void;
  on(event: 'partial', cb: (m: { result: { partial: string } }) => void): void;
  acceptWaveform(buffer: AudioBuffer): void;
  remove?(): void;
  setWords?(v: boolean): void;
}

interface VoskModel {
  KaldiRecognizer: new (sampleRate: number, grammar?: string) => KaldiRecognizer;
  terminate?(): void;
}

/** One model per language, shared across mounts — they are expensive. */
const modelCache = new Map<string, Promise<VoskModel>>();

function baseLang(lang: string): string {
  return lang.split('-')[0].toLowerCase();
}

async function loadModel(lang: string): Promise<VoskModel> {
  const key = baseLang(lang);
  const cached = modelCache.get(key);
  if (cached) return cached;

  const url = voskModelUrl(key);
  if (!url) {
    throw new Error(`no offline model configured for "${key}"`);
  }

  const promise = (async () => {
    const { createModel } = await import('vosk-browser');
    return (await createModel(url)) as unknown as VoskModel;
  })();

  modelCache.set(key, promise);
  promise.catch(() => modelCache.delete(key));
  return promise;
}

export function voskSupportsLanguage(lang: string): boolean {
  return baseLang(lang) in VOSK_MODELS;
}

export function createVoskProvider(init: ProviderInit): SpeechProvider {
  const { callbacks } = init;
  let lang = init.lang;
  let expected: string[] = [];
  let destroyed = false;
  let running = false;

  let stream: MediaStream | null = null;
  let audioCtx: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let recognizer: KaldiRecognizer | null = null;

  const teardownAudio = () => {
    processor?.disconnect();
    source?.disconnect();
    processor = null;
    source = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    if (audioCtx && audioCtx.state !== 'closed') void audioCtx.close();
    audioCtx = null;
    recognizer?.remove?.();
    recognizer = null;
  };

  return {
    id: 'vosk',
    // Vosk streams continuously; there is no per-utterance session to restart.
    selfSustaining: true,

    async start() {
      if (destroyed || running) return;

      let model: VoskModel;
      try {
        model = await loadModel(lang);
      } catch (err) {
        callbacks.onError('engine-unavailable', String((err as Error)?.message ?? err));
        throw err;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch (err) {
        callbacks.onError('not-allowed', String((err as Error)?.message ?? err));
        throw err;
      }

      audioCtx = new AudioContext();
      const grammar = expected.length ? JSON.stringify([...expected, '[unk]']) : undefined;
      recognizer = new model.KaldiRecognizer(audioCtx.sampleRate, grammar);

      recognizer.on('result', (m) => {
        const text = m?.result?.text?.trim();
        if (text) callbacks.onUpdate({ transcript: text, isFinal: true });
      });
      recognizer.on('partial', (m) => {
        const text = m?.result?.partial?.trim();
        if (text) callbacks.onUpdate({ transcript: text, isFinal: false });
      });

      source = audioCtx.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but is what vosk-browser consumes, and
      // it is still supported everywhere including Safari and Electron.
      processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        try {
          recognizer?.acceptWaveform(e.inputBuffer);
        } catch {
          /* recogniser torn down mid-buffer */
        }
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      running = true;
      callbacks.onListening();
    },

    stop() {
      if (!running) return;
      running = false;
      teardownAudio();
      callbacks.onSessionEnd();
    },

    destroy() {
      destroyed = true;
      running = false;
      teardownAudio();
    },

    setLanguage(next: string) {
      lang = next;
    },

    setExpected(words: string[]) {
      expected = words.filter(Boolean);
    },
  };
}
