import { useCallback, useRef } from 'react';

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function useAppleSound() {
  const ctxRef = useRef(getCtx());

  const playTriTone = useCallback(() => {
    const ctx = ctxRef.current;
    const now = ctx.currentTime;
    const base = 1568;
    [base, base * 1.25, base * 1.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }, []);

  const playPop = useCallback(() => {
    const ctx = ctxRef.current;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }, []);

  const playSwoosh = useCallback(() => {
    const ctx = ctxRef.current;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.25);
    osc.type = 'sawtooth';
    osc.frequency.value = 80;
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }, []);

  const playLock = useCallback(() => {
    const ctx = ctxRef.current;
    const now = ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.15);
    });
  }, []);

  const playComplete = useCallback(() => {
    const ctx = ctxRef.current;
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }, []);

  return { playTriTone, playPop, playSwoosh, playLock, playComplete };
}
