import { flagEmoji } from '@/data/flag-palettes';

/**
 * Flag theme ids carry either a country code (`theme-flag-br`) or a language
 * code (`theme-flag-ja`), because the catalog grew both ways. This resolves
 * either to the right flag so the picker can show it.
 */
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  es: 'ES',
  ja: 'JP',
  fr: 'FR',
  de: 'DE',
  it: 'IT',
  pt: 'PT',
  zh: 'CN',
  ko: 'KR',
  ru: 'RU',
  hi: 'IN',
  ar: 'SA',
  nl: 'NL',
  sv: 'SE',
  tr: 'TR',
  th: 'TH',
  vi: 'VN',
  pl: 'PL',
  en: 'GB',
};

/** Country codes that are already ISO alpha-2 in a theme id. */
const DIRECT_COUNTRIES = new Set(['br', 'in', 'sa', 'se', 'vn', 'th', 'pl', 'nl', 'tr', 'us', 'gb']);

export function flagEmojiFromLanguageOrCountry(code: string): string {
  const lower = code.toLowerCase();
  if (LANGUAGE_TO_COUNTRY[lower] && !DIRECT_COUNTRIES.has(lower)) {
    return flagEmoji(LANGUAGE_TO_COUNTRY[lower]);
  }
  return flagEmoji(lower);
}
