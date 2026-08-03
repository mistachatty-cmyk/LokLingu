/* ------------------------------------------------------------------
   LokLingu — speech utilities
   Voice selection + matching. The default SpeechSynthesis voice is
   usually the worst one installed; this picks the best available.
------------------------------------------------------------------ */

const TTS_LANG_MAP: Record<string, string> = {
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
  ja: 'ja-JP',
  pt: 'pt-BR',
  zh: 'zh-CN',
  ko: 'ko-KR',
  ru: 'ru-RU',
  ar: 'ar-SA',
  hi: 'hi-IN',
  nl: 'nl-NL',
  pl: 'pl-PL',
  sv: 'sv-SE',
  tr: 'tr-TR',
  th: 'th-TH',
  vi: 'vi-VN',
  en: 'en-US',
};

export function toLocale(language: string): string {
  return TTS_LANG_MAP[language] || language;
}

let voiceCache: SpeechSynthesisVoice[] = [];

export function primeVoices(): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {};
  const refresh = () => {
    voiceCache = window.speechSynthesis.getVoices();
  };
  refresh();
  window.speechSynthesis.addEventListener('voiceschanged', refresh);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
}

function scoreVoice(v: SpeechSynthesisVoice, locale: string): number {
  const name = v.name.toLowerCase();
  const vlang = v.lang.replace('_', '-').toLowerCase();
  let s = 0;

  if (vlang === locale.toLowerCase()) s += 40;
  if (/natural|neural|premium|enhanced|wavenet/.test(name)) s += 30;
  if (/google/.test(name)) s += 20;
  if (/microsoft/.test(name)) s += 14;
  if (/siri/.test(name)) s += 12;
  if (v.localService) s += 4;
  if (/compact|espeak|novelty|eloquence|fred|albert/.test(name)) s -= 40;

  return s;
}

export function pickVoice(locale: string): SpeechSynthesisVoice | null {
  if (!voiceCache.length && typeof window !== 'undefined' && window.speechSynthesis) {
    voiceCache = window.speechSynthesis.getVoices();
  }
  const base = locale.split('-')[0].toLowerCase();
  const pool = voiceCache.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(base));
  if (!pool.length) return null;
  return [...pool].sort((a, b) => scoreVoice(b, locale) - scoreVoice(a, locale))[0];
}

export interface SpeakOptions {
  slow?: boolean;
}

export function speakWord(word: string, language: string, opts: SpeakOptions = {}): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  if (!word) return;

  const locale = toLocale(language);
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(word);
  u.lang = locale;
  u.rate = opts.slow ? 0.5 : 0.9;
  u.pitch = 1;
  u.volume = 1;

  const voice = pickVoice(locale);
  if (voice) u.voice = voice;

  window.speechSynthesis.speak(u);
}

export function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalize(str: string): string {
  return stripAccents(str)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s'-]/gu, '');
}

export function matchWord(transcript: string, target: string, alternates: string[] = []): boolean {
  const t = normalize(transcript);
  if (!t) return false;

  const targets = [target, ...alternates]
    .filter(Boolean)
    .map((x) => normalize(x))
    .filter((x) => x.length > 0);

  for (const tar of targets) {
    if (matchSingle(t, tar)) return true;
  }
  return false;
}

const CJK_RE = /^[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]+$/;

function matchSingle(t: string, tar: string): boolean {
  const words = t.split(/\s+/).filter(Boolean);
  if (words.some((w) => w === tar)) return true;
  if (t.includes(tar)) return true;

  if (tar.includes('-')) {
    const parts = tar.split('-');
    if (parts.every((p) => t.includes(p))) return true;
  }

  const targetWords = tar.split(/\s+/);
  if (targetWords.length > 1) {
    const hits = targetWords.filter((tw) => t.includes(tw)).length;
    if (hits >= targetWords.length * 0.66) return true;
  }

  // CJK: the engine often returns a different-but-equivalent script for the
  // same utterance (kanji vs kana, hanzi vs a longer phrase). Accept
  // containment in EITHER direction, but require real length so a single
  // stray character cannot match everything.
  if (CJK_RE.test(tar) || CJK_RE.test(t)) {
    const a = t.replace(/\s+/g, '');
    const b = tar.replace(/\s+/g, '');
    if (a === b) return true;
    if (b.length >= 2 && a.includes(b)) return true;
    if (a.length >= 2 && b.includes(a)) return true;
  }

  // Latin-script fuzz: one edit for short words, two for longer. Covers the
  // engine hearing "dose" for "dos".
  if (!CJK_RE.test(tar) && tar.length >= 3) {
    const allowed = tar.length <= 5 ? 1 : 2;
    if (editDistance(t, tar) <= allowed) return true;
    for (const w of words) {
      if (editDistance(w, tar) <= allowed) return true;
    }
  }

  return false;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > 3) return 99;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}
