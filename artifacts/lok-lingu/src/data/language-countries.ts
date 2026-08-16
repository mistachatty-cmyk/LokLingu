export interface LanguageCountry {
  code: string;
  name: string;
  countryCodes: string[];
  flag: string;
  color: string;
  /**
   * Combined population of the countries where this language is official,
   * in **whole people**. Note this is a different unit from the two
   * speaker counts below, and a different measure — it counts everyone in
   * those countries, including people who don't speak the language.
   *
   * The UI previously rendered this alongside `nativeSpeakers` as though
   * they were comparable, which produced nonsense like "485M native
   * speakers" sitting under a "460M population".
   */
  population: number;
  /** Native speakers, in **millions**. */
  nativeSpeakers: number;
  /** Native + second-language speakers, in **millions**. */
  totalSpeakers: number;
  writingSystem: string;
  officialIn: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  languageFamily: string;
}

const MILLION = 1_000_000;

/** Native speakers as a whole number, for display next to `population`. */
export function nativeSpeakersAbsolute(lc: LanguageCountry): number {
  return lc.nativeSpeakers * MILLION;
}

/** Total speakers as a whole number. */
export function totalSpeakersAbsolute(lc: LanguageCountry): number {
  return lc.totalSpeakers * MILLION;
}

export const LANGUAGE_COUNTRIES: LanguageCountry[] = [
  {
    code: 'es',
    name: 'Spanish',
    countryCodes: ['ESP', 'MEX', 'ARG', 'COL', 'CHL', 'PER', 'VEN', 'CUB', 'ECU', 'GTM', 'DOM', 'HND', 'BOL', 'SLV', 'NIC', 'CRI', 'PRY', 'URY', 'PAN', 'PRI', 'GNQ'],
    flag: '🇪🇸',
    color: '#E63946',
    population: 460000000,
    nativeSpeakers: 485,
    totalSpeakers: 595,
    writingSystem: 'Latin',
    officialIn: ['Spain', 'Mexico', 'Argentina', 'Colombia', 'Chile', 'Peru', 'Venezuela', 'Cuba', 'Ecuador', 'Guatemala', 'Dominican Republic', 'Honduras', 'Bolivia', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Paraguay', 'Uruguay', 'Panama', 'Puerto Rico (US)', 'Equatorial Guinea'],
    difficulty: 2,
    languageFamily: 'Romance',
  },
  {
    code: 'fr',
    name: 'French',
    countryCodes: ['FRA', 'CAN', 'BEL', 'CHE', 'LUX', 'MCO', 'HTI', 'COD', 'CIV', 'MDG', 'SEN', 'BEN', 'BFA', 'TGO', 'MLI', 'NER', 'GIN', 'RWA', 'BDI', 'COG', 'DJI', 'MUS', 'COM', 'VUT', 'BLM', 'MAF', 'SPM', 'WLF', 'PYF', 'NCL', 'ATF', 'GUF', 'MTQ', 'GLP', 'REU', 'MYT'],
    flag: '🇫🇷',
    color: '#0055A4',
    population: 220000000,
    nativeSpeakers: 80,
    totalSpeakers: 320,
    writingSystem: 'Latin',
    officialIn: ['France', 'Canada', 'Belgium', 'Switzerland', 'Luxembourg', 'Monaco', 'Haiti', 'DR Congo', "Côte d'Ivoire", 'Madagascar', 'Senegal', 'Benin', 'Burkina Faso', 'Togo', 'Mali', 'Niger', 'Guinea', 'Rwanda', 'Burundi', 'Republic of Congo', 'Djibouti', 'Mauritius', 'Comoros', 'Vanuatu'],
    difficulty: 2,
    languageFamily: 'Romance',
  },
  {
    code: 'de',
    name: 'German',
    countryCodes: ['DEU', 'AUT', 'CHE', 'BEL', 'LUX', 'LIE'],
    flag: '🇩🇪',
    color: '#FFCC00',
    population: 100000000,
    nativeSpeakers: 95,
    totalSpeakers: 135,
    writingSystem: 'Latin',
    officialIn: ['Germany', 'Austria', 'Switzerland', 'Belgium', 'Luxembourg', 'Liechtenstein'],
    difficulty: 2,
    languageFamily: 'Germanic',
  },
  {
    code: 'it',
    name: 'Italian',
    countryCodes: ['ITA', 'CHE', 'SMR', 'VAT'],
    flag: '🇮🇹',
    color: '#009246',
    population: 60000000,
    nativeSpeakers: 67,
    totalSpeakers: 85,
    writingSystem: 'Latin',
    officialIn: ['Italy', 'Switzerland', 'San Marino', 'Vatican City'],
    difficulty: 2,
    languageFamily: 'Romance',
  },
  {
    code: 'ja',
    name: 'Japanese',
    countryCodes: ['JPN'],
    flag: '🇯🇵',
    color: '#BC002D',
    population: 125000000,
    nativeSpeakers: 125,
    totalSpeakers: 125,
    writingSystem: 'Hiragana/Katakana',
    officialIn: ['Japan'],
    difficulty: 5,
    languageFamily: 'Japonic',
  },
  {
    code: 'ko',
    name: 'Korean',
    countryCodes: ['KOR', 'PRK'],
    flag: '🇰🇷',
    color: '#003478',
    population: 77000000,
    nativeSpeakers: 77,
    totalSpeakers: 82,
    writingSystem: 'Hangul',
    officialIn: ['South Korea', 'North Korea'],
    difficulty: 4,
    languageFamily: 'Koreanic',
  },
  {
    code: 'zh',
    name: 'Chinese',
    countryCodes: ['CHN', 'TWN', 'SGP', 'HKG', 'MAC'],
    flag: '🇨🇳',
    color: '#DE2910',
    population: 1400000000,
    nativeSpeakers: 920,
    totalSpeakers: 1120,
    writingSystem: 'Hanzi',
    officialIn: ['China', 'Taiwan', 'Singapore', 'Hong Kong', 'Macau'],
    difficulty: 5,
    languageFamily: 'Sino-Tibetan',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    countryCodes: ['PRT', 'BRA', 'AGO', 'MOZ', 'CPV', 'GNB', 'STP', 'TLS', 'MAC', 'GNQ'],
    flag: '🇵🇹',
    color: '#006600',
    population: 250000000,
    nativeSpeakers: 230,
    totalSpeakers: 260,
    writingSystem: 'Latin',
    officialIn: ['Portugal', 'Brazil', 'Angola', 'Mozambique', 'Cape Verde', 'Guinea-Bissau', 'São Tomé and Príncipe', 'Timor-Leste', 'Macau', 'Equatorial Guinea'],
    difficulty: 2,
    languageFamily: 'Romance',
  },
  {
    code: 'ru',
    name: 'Russian',
    countryCodes: ['RUS', 'KAZ', 'BLR', 'KGZ'],
    flag: '🇷🇺',
    color: '#0039A6',
    population: 150000000,
    nativeSpeakers: 150,
    totalSpeakers: 258,
    writingSystem: 'Cyrillic',
    officialIn: ['Russia', 'Kazakhstan', 'Belarus', 'Kyrgyzstan'],
    difficulty: 4,
    languageFamily: 'East Slavic',
  },
  {
    code: 'ar',
    name: 'Arabic',
    countryCodes: ['SAU', 'EGY', 'ARE', 'IRQ', 'JOR', 'LBN', 'MAR', 'DZA', 'TUN', 'LBY', 'SDN', 'YEM', 'OMN', 'QAT', 'KWT', 'BHR', 'PSE', 'SYR', 'MRT', 'SOM', 'DJI', 'COM'],
    flag: '🇸🇦',
    color: '#006C35',
    population: 450000000,
    nativeSpeakers: 310,
    totalSpeakers: 420,
    writingSystem: 'Arabic',
    officialIn: ['Saudi Arabia', 'Egypt', 'UAE', 'Iraq', 'Jordan', 'Lebanon', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Sudan', 'Yemen', 'Oman', 'Qatar', 'Kuwait', 'Bahrain', 'Palestine', 'Syria', 'Mauritania', 'Somalia', 'Djibouti', 'Comoros'],
    difficulty: 5,
    languageFamily: 'Semitic',
  },
  {
    code: 'hi',
    name: 'Hindi',
    countryCodes: ['IND', 'FJI'],
    flag: '🇮🇳',
    color: '#FF9933',
    population: 1400000000,
    nativeSpeakers: 340,
    totalSpeakers: 610,
    writingSystem: 'Devanagari',
    officialIn: ['India', 'Fiji'],
    difficulty: 4,
    languageFamily: 'Indo-Aryan',
  },
  {
    code: 'nl',
    name: 'Dutch',
    countryCodes: ['NLD', 'BEL', 'SUR', 'ABW', 'CUW', 'SXM'],
    flag: '🇳🇱',
    color: '#FF6600',
    population: 30000000,
    nativeSpeakers: 24,
    totalSpeakers: 30,
    writingSystem: 'Latin',
    officialIn: ['Netherlands', 'Belgium', 'Suriname', 'Aruba', 'Curaçao', 'Sint Maarten'],
    difficulty: 1,
    languageFamily: 'Germanic',
  },
  {
    code: 'pl',
    name: 'Polish',
    countryCodes: ['POL'],
    flag: '🇵🇱',
    color: '#DC143C',
    population: 38000000,
    nativeSpeakers: 40,
    totalSpeakers: 45,
    writingSystem: 'Latin',
    officialIn: ['Poland'],
    difficulty: 4,
    languageFamily: 'West Slavic',
  },
  {
    code: 'sv',
    name: 'Swedish',
    countryCodes: ['SWE', 'FIN'],
    flag: '🇸🇪',
    color: '#005B99',
    population: 12000000,
    nativeSpeakers: 10,
    totalSpeakers: 13,
    writingSystem: 'Latin',
    officialIn: ['Sweden', 'Finland'],
    difficulty: 1,
    languageFamily: 'Germanic',
  },
  {
    code: 'tr',
    name: 'Turkish',
    countryCodes: ['TUR', 'CYP'],
    flag: '🇹🇷',
    color: '#E30A17',
    population: 85000000,
    nativeSpeakers: 84,
    totalSpeakers: 88,
    writingSystem: 'Latin',
    officialIn: ['Turkey', 'Cyprus'],
    difficulty: 4,
    languageFamily: 'Turkic',
  },
  {
    code: 'th',
    name: 'Thai',
    countryCodes: ['THA'],
    flag: '🇹🇭',
    color: '#2D2A4A',
    population: 70000000,
    nativeSpeakers: 60,
    totalSpeakers: 70,
    writingSystem: 'Thai',
    officialIn: ['Thailand'],
    difficulty: 5,
    languageFamily: 'Tai-Kadai',
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    countryCodes: ['VNM'],
    flag: '🇻🇳',
    color: '#DA251D',
    population: 100000000,
    nativeSpeakers: 85,
    totalSpeakers: 90,
    writingSystem: 'Latin (Vietnamese)',
    officialIn: ['Vietnam'],
    difficulty: 4,
    languageFamily: 'Austroasiatic',
  },
];

/**
 * Countries frequently have more than one of our languages — Belgium is
 * Dutch and French, Switzerland is German, French and Italian.
 *
 * This used to be a `Map<string, string>` written in catalog order, so
 * every multilingual country silently resolved to whichever language
 * happened to be declared last. Belgium came out as Dutch-only and
 * Switzerland lost French and Italian entirely; the map was quietly
 * lying about a dozen countries.
 *
 * Now every language a country speaks is retained. The map still needs a
 * single colour per country, so `getLanguageForCountry` returns the first
 * in catalog order — but callers that can handle ambiguity (like a click
 * handler offering a choice) get the full list.
 */
const COUNTRY_TO_LANGS = new Map<string, string[]>();
for (const lc of LANGUAGE_COUNTRIES) {
  for (const cc of lc.countryCodes) {
    const existing = COUNTRY_TO_LANGS.get(cc);
    if (existing) existing.push(lc.code);
    else COUNTRY_TO_LANGS.set(cc, [lc.code]);
  }
}

/** Every language we support that is spoken in this country. */
export function getLanguagesForCountry(countryCode: string): string[] {
  return COUNTRY_TO_LANGS.get(countryCode) ?? [];
}

/** True when a country speaks more than one language we support. */
export function isMultilingual(countryCode: string): boolean {
  return getLanguagesForCountry(countryCode).length > 1;
}

/** The language used to colour the country on the map. */
export function getLanguageForCountry(countryCode: string): string | undefined {
  return COUNTRY_TO_LANGS.get(countryCode)?.[0];
}

export function getLanguageCountry(code: string): LanguageCountry | undefined {
  return LANGUAGE_COUNTRIES.find((lc) => lc.code === code);
}