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
