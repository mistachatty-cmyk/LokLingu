/* ------------------------------------------------------------------
   LokLingu — speech provider contract

   The game loop must not care which engine is listening. Web Speech is
   fast and free but only really works in Chrome/Edge (and is absent
   from Electron/Steam builds entirely); Vosk is a WebAssembly engine
   that runs fully offline and works anywhere WASM does. Both implement
   this interface so the loop is written once.
------------------------------------------------------------------ */

export type EngineId = 'web-speech' | 'vosk';

export interface SpeechUpdate {
  transcript: string;
  isFinal: boolean;
}

export type SpeechErrorCode =
  /** Microphone permission denied — fatal, stop the loop. */
  | 'not-allowed'
  /** Engine could not be initialised (model missing, WASM blocked). */
  | 'engine-unavailable'
  /** Silence. Normal in a continuous loop. */
  | 'no-speech'
  /** Session ended early but recoverable. */
  | 'aborted'
  | 'network'
  | 'unknown';

export interface ProviderCallbacks {
  onUpdate: (u: SpeechUpdate) => void;
  onError: (code: SpeechErrorCode, detail?: string) => void;
  /** Fired when a listening session ends; the loop decides whether to restart. */
  onSessionEnd: () => void;
  /** Fired once the engine is genuinely capturing audio. */
  onListening: () => void;
}

export interface ProviderInit {
  /** BCP-47 tag, e.g. es-ES. */
  lang: string;
  callbacks: ProviderCallbacks;
}

export interface SpeechProvider {
  readonly id: EngineId;
  /**
   * Begin a listening session. Rejects if the engine cannot start; the
   * loop treats a rejection as retryable unless onError said otherwise.
   */
  start(): Promise<void>;
  stop(): void;
  destroy(): void;
  setLanguage(lang: string): void;
  /**
   * Words the player is most likely to say right now. Vosk turns this
   * into a hard grammar, which is a large accuracy win for drills;
   * Web Speech ignores it (the API has no working grammar support), so
   * the fuzzy matcher does that work instead.
   */
  setExpected(words: string[]): void;
  /** True when the engine restarts itself and needs no restart loop. */
  readonly selfSustaining: boolean;
}
