export interface LanguageCountry {
  code: string;
  name: string;
  countryCodes: string[];
  flag: string;
  color: string;
}

export const LANGUAGE_COUNTRIES: LanguageCountry[] = [
  {
    code: 'es',
    name: 'Spanish',
    countryCodes: ['ESP', 'MEX', 'ARG', 'COL', 'CHL', 'PER', 'VEN', 'CUB', 'ECU', 'GTM', 'DOM', 'HND', 'BOL', 'SLV', 'NIC', 'CRI', 'PRY', 'URY', 'PAN'],
    flag: '🇪🇸',
    color: '#e63946',
  },
  {
    code: 'fr',
    name: 'French',
    countryCodes: ['FRA', 'CAN', 'BEL', 'CHE', 'LUX', 'MCO'],
    flag: '🇫🇷',
    color: '#0055a4',
  },
  {
    code: 'de',
    name: 'German',
    countryCodes: ['DEU', 'AUT', 'CHE', 'BEL', 'LUX'],
    flag: '🇩🇪',
    color: '#ffcc00',
  },
  {
    code: 'it',
    name: 'Italian',
    countryCodes: ['ITA', 'CHE', 'SMR', 'VAT'],
    flag: '🇮🇹',
    color: '#009246',
  },
  {
    code: 'ja',
    name: 'Japanese',
    countryCodes: ['JPN'],
    flag: '🇯🇵',
    color: '#bc002d',
  },
  {
    code: 'ko',
    name: 'Korean',
    countryCodes: ['KOR'],
    flag: '🇰🇷',
    color: '#003478',
  },
  {
    code: 'zh',
    name: 'Chinese',
    countryCodes: ['CHN', 'TWN', 'SGP'],
    flag: '🇨🇳',
    color: '#de2910',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    countryCodes: ['PRT', 'BRA', 'AGO', 'MOZ'],
    flag: '🇵🇹',
    color: '#006600',
  },
  {
    code: 'ru',
    name: 'Russian',
    countryCodes: ['RUS', 'KAZ', 'BLR'],
    flag: '🇷🇺',
    color: '#0039a6',
  },
  {
    code: 'ar',
    name: 'Arabic',
    countryCodes: ['SAU', 'EGY', 'ARE', 'IRQ', 'JOR', 'LBN', 'MAR', 'DZA', 'TUN', 'LBY', 'SDN', 'YEM', 'OMN', 'QAT', 'KWT', 'BHR'],
    flag: '🇸🇦',
    color: '#006c35',
  },
  {
    code: 'hi',
    name: 'Hindi',
    countryCodes: ['IND'],
    flag: '🇮🇳',
    color: '#ff9933',
  },
  {
    code: 'nl',
    name: 'Dutch',
    countryCodes: ['NLD', 'BEL', 'SUR'],
    flag: '🇳🇱',
    color: '#ff6600',
  },
  {
    code: 'pl',
    name: 'Polish',
    countryCodes: ['POL'],
    flag: '🇵🇱',
    color: '#dc143c',
  },
  {
    code: 'sv',
    name: 'Swedish',
    countryCodes: ['SWE'],
    flag: '🇸🇪',
    color: '#005b99',
  },
  {
    code: 'tr',
    name: 'Turkish',
    countryCodes: ['TUR'],
    flag: '🇹🇷',
    color: '#e30a17',
  },
  {
    code: 'th',
    name: 'Thai',
    countryCodes: ['THA'],
    flag: '🇹🇭',
    color: '#2d2a4a',
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    countryCodes: ['VNM'],
    flag: '🇻🇳',
    color: '#da251d',
  },
];

const COUNTRY_TO_LANG = new Map<string, string>();
for (const lc of LANGUAGE_COUNTRIES) {
  for (const cc of lc.countryCodes) {
    COUNTRY_TO_LANG.set(cc, lc.code);
  }
}

export function getLanguageForCountry(countryCode: string): string | undefined {
  return COUNTRY_TO_LANG.get(countryCode);
}

export function getLanguageCountry(code: string): LanguageCountry | undefined {
  return LANGUAGE_COUNTRIES.find((lc) => lc.code === code);
}
