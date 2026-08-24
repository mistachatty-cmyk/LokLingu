import { useRef, useCallback } from 'react';
import type { SoundProfile, CelebrationIntensity } from '@/lib/celebrations';

function createContext(): AudioContext {
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}

function playTone(ctx: AudioContext, freq: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(ctx: AudioContext, duration: number, volume: number, lowPass?: number) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.15));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  if (lowPass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowPass;
    source.connect(filter).connect(gain).connect(ctx.destination);
  } else {
    source.connect(gain).connect(ctx.destination);
  }
  source.start(ctx.currentTime);
}

function playBurst(ctx: AudioContext, vol: number) {
  playNoise(ctx, 0.25, vol * 0.6);
  playTone(ctx, 1200, 0.15, vol * 0.4, 'square');
}

function playThud(ctx: AudioContext, vol: number) {
  playTone(ctx, 80, 0.3, vol * 0.8, 'sine');
  playTone(ctx, 120, 0.2, vol * 0.4, 'triangle');
  playNoise(ctx, 0.1, vol * 0.3, 200);
}

function playClink(ctx: AudioContext, vol: number) {
  playTone(ctx, 1800, 0.4, vol * 0.5, 'sine');
  playTone(ctx, 2400, 0.3, vol * 0.3, 'sine');
  playTone(ctx, 800, 0.2, vol * 0.2, 'triangle');
}

function playWhoosh(ctx: AudioContext, vol: number) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * Math.exp(-t * 4);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(200, ctx.currentTime);
  filter.frequency.linearRampToValueAtTime(2000, ctx.currentTime + 0.25);
  filter.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.5);
  const gain = ctx.createGain();
  gain.gain.value = vol * 0.5;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(ctx.currentTime);
}

function playBoing(ctx: AudioContext, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(vol * 0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

function playChime(ctx: AudioContext, vol: number) {
  [1000, 1500, 2000, 2500].forEach((f, i) => {
    playTone(ctx, f, 0.8 + i * 0.1, vol * (0.4 - i * 0.08), 'sine');
  });
}

function playSplash(ctx: AudioContext, vol: number) {
  playNoise(ctx, 0.4, vol * 0.7, 1000);
  playTone(ctx, 300, 0.3, vol * 0.4);
  playTone(ctx, 150, 0.5, vol * 0.3, 'triangle');
}

function playGong(ctx: AudioContext, vol: number) {
  playTone(ctx, 60, 2.5, vol * 0.9, 'sine');
  playTone(ctx, 120, 1.8, vol * 0.5, 'sine');
  playTone(ctx, 90, 2.0, vol * 0.4, 'triangle');
  playNoise(ctx, 0.5, vol * 0.3, 400);
}

function playRattle(ctx: AudioContext, vol: number) {
  for (let i = 0; i < 8; i++) {
    const t = ctx.currentTime + i * 0.06;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 0.3 * Math.exp(-i * 0.3), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 200 + Math.random() * 400;
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }
}

function playAscend(ctx: AudioContext, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.6);
  gain.gain.setValueAtTime(vol * 0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.8);

  playTone(ctx, 1000, 0.3, vol * 0.2, 'sine');
}

function playTriTone(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const base = 1568;
  [base, base * 1.25, base * 1.5].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol * 0.12, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.2);
  });
}

function playPop(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
  gain.gain.setValueAtTime(vol * 0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

function playSwoosh(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, now);
  filter.frequency.exponentialRampToValueAtTime(2000, now + 0.25);
  osc.type = 'sawtooth';
  osc.frequency.value = 80;
  gain.gain.setValueAtTime(vol * 0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}

function playLock(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol * 0.08, now + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.05);
    osc.stop(now + i * 0.05 + 0.15);
  });
}

function playComplete(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = now + i * 0.12;
    gain.gain.setValueAtTime(vol * 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  });
}

function playAwww(ctx: AudioContext, vol: number) {
  // A soft, descending "awww" — two overlapping tones sliding gently down.
  const now = ctx.currentTime;
  [660, 440].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.05);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + i * 0.05 + 0.5);
    gain.gain.setValueAtTime(0.0001, now + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(vol * 0.14, now + i * 0.05 + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.05);
    osc.stop(now + i * 0.05 + 0.6);
  });
}

function playApplause(ctx: AudioContext, vol: number) {
  // Filtered noise bursts, staggered and randomized, to read as a small
  // crowd clapping rather than a single hit.
  const now = ctx.currentTime;
  const claps = 10;
  for (let i = 0; i < claps; i++) {
    const t = now + i * 0.06 + Math.random() * 0.03;
    const dur = 0.05 + Math.random() * 0.03;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800 + Math.random() * 800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
  }
}

const PLAY_FN: Record<SoundProfile, (ctx: AudioContext, vol: number) => void> = {
  burst: playBurst,
  thud: playThud,
  clink: playClink,
  whoosh: playWhoosh,
  boing: playBoing,
  chime: playChime,
  splash: playSplash,
  gong: playGong,
  rattle: playRattle,
  ascend: playAscend,
  'tri-tone': playTriTone,
  pop: playPop,
  swoosh: playSwoosh,
  lock: playLock,
  complete: playComplete,
  awww: playAwww,
  applause: playApplause,
};

const INTENSITY_VOL: Record<CelebrationIntensity, number> = {
  mini: 0.15,
  big: 0.3,
  suBang: 0.55,
};

export function useCelebrationSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = createContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((profile: SoundProfile, intensity: CelebrationIntensity) => {
    try {
      const ctx = getContext();
      PLAY_FN[profile](ctx, INTENSITY_VOL[intensity]);
    } catch {
      /* audio not available */
    }
  }, [getContext]);

  return { play };
}
