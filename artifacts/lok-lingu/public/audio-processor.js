/**
 * audio-processor.js — AudioWorkletProcessor (unkillable iOS keepalive)
 *
 * Consumes the microphone stream continuously, keeping the AudioContext and
 * MediaStream alive on iOS Safari and Android Chrome. Without this the
 * browser's audio session goes idle between Web Speech API restarts and the
 * next .start() call either throws or silently produces zero results.
 */
class AudioKeepaliveProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.postMessage({ type: 'ready' });
  }
  /** Called ~every 2.67 ms. Must return true to stay alive forever. */
  process() {
    return true;
  }
}
registerProcessor('audio-keepalive', AudioKeepaliveProcessor);
