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
};

export function speakWord(word: string, language: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = TTS_LANG_MAP[language] || language;
  utterance.rate = 0.85;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

export function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalize(str: string): string {
  return stripAccents(str).toLowerCase().trim().replace(/[^\w\s'-]/g, '');
}

export function matchWord(transcript: string, target: string): boolean {
  const t = normalize(transcript);
  const tar = normalize(target);

  if (!t || !tar) return false;

  const words = t.split(/\s+/).filter(Boolean);

  for (const word of words) {
    if (word === tar) return true;
  }

  if (t.includes(tar)) return true;

  if (tar.includes('-')) {
    const parts = tar.split('-');
    if (parts.every((p) => t.includes(p))) return true;
  }

  if (words.length > 1) {
    const targetWords = tar.split(/\s+/);
    const matchCount = targetWords.filter((tw) => t.includes(tw)).length;
    if (matchCount >= targetWords.length * 0.66) return true;
  }

  return false;
}
