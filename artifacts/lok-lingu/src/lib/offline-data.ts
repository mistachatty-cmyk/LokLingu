export interface WordEntry {
  word: string;
  translation: string;
  index: number;
  pronunciation?: string;
}

export interface LanguageData {
  code: string;
  name: string;
  categories: string[];
}

export const FALLBACK_LANGUAGES: LanguageData[] = [
  { code: 'es', name: 'Spanish', categories: ['numbers', 'colors', 'greetings'] },
  { code: 'fr', name: 'French', categories: ['numbers', 'colors', 'greetings'] },
  { code: 'it', name: 'Italian', categories: ['numbers', 'colors', 'greetings'] },
  { code: 'de', name: 'German', categories: ['numbers', 'colors', 'greetings'] },
  { code: 'ja', name: 'Japanese', categories: ['numbers', 'greetings'] },
  { code: 'ko', name: 'Korean', categories: ['numbers', 'greetings'] },
  { code: 'pt', name: 'Portuguese', categories: ['numbers', 'colors', 'greetings'] },
  { code: 'zh', name: 'Chinese', categories: ['numbers', 'greetings'] },
  { code: 'ru', name: 'Russian', categories: ['numbers', 'greetings'] },
  { code: 'ar', name: 'Arabic', categories: ['numbers', 'greetings'] },
  { code: 'hi', name: 'Hindi', categories: ['numbers', 'greetings'] },
  { code: 'nl', name: 'Dutch', categories: ['numbers', 'greetings'] },
  { code: 'pl', name: 'Polish', categories: ['numbers', 'greetings'] },
  { code: 'sv', name: 'Swedish', categories: ['numbers', 'greetings'] },
  { code: 'tr', name: 'Turkish', categories: ['numbers', 'greetings'] },
  { code: 'th', name: 'Thai', categories: ['numbers', 'greetings'] },
  { code: 'vi', name: 'Vietnamese', categories: ['numbers', 'greetings'] },
];

export function normalizeLanguagesData(value: unknown): LanguageData[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is LanguageData =>
        typeof item === 'object' && item !== null && 'code' in item && 'name' in item,
    );
  }

  if (value && typeof value === 'object') {
    const maybeLanguages = (value as { languages?: unknown }).languages;
    if (Array.isArray(maybeLanguages)) {
      return maybeLanguages.filter(
        (item): item is LanguageData =>
          typeof item === 'object' && item !== null && 'code' in item && 'name' in item,
      );
    }
  }

  return FALLBACK_LANGUAGES;
}

export const FALLBACK_WORDS: Record<string, Record<string, WordEntry[]>> = {
  es: {
    numbers: [
      { word: 'uno', translation: 'one', index: 0, pronunciation: 'OO-no' },
      { word: 'dos', translation: 'two', index: 1, pronunciation: 'dohs' },
      { word: 'tres', translation: 'three', index: 2, pronunciation: 'trehs' },
      { word: 'cuatro', translation: 'four', index: 3, pronunciation: 'KWAH-troh' },
      { word: 'cinco', translation: 'five', index: 4, pronunciation: 'SEEN-koh' },
      { word: 'seis', translation: 'six', index: 5, pronunciation: 'says' },
      { word: 'siete', translation: 'seven', index: 6, pronunciation: 'SYEH-teh' },
      { word: 'ocho', translation: 'eight', index: 7, pronunciation: 'OH-choh' },
      { word: 'nueve', translation: 'nine', index: 8, pronunciation: 'NWEH-beh' },
      { word: 'diez', translation: 'ten', index: 9, pronunciation: 'dyehs' },
      { word: 'once', translation: 'eleven', index: 10, pronunciation: 'OHN-seh' },
      { word: 'doce', translation: 'twelve', index: 11, pronunciation: 'DOH-seh' },
      { word: 'trece', translation: 'thirteen', index: 12, pronunciation: 'TREH-seh' },
      { word: 'catorce', translation: 'fourteen', index: 13, pronunciation: 'kah-TOR-seh' },
      { word: 'quince', translation: 'fifteen', index: 14, pronunciation: 'KEEN-seh' },
      { word: 'dieciséis', translation: 'sixteen', index: 15, pronunciation: 'dyeh-see-SAYS' },
      {
        word: 'diecisiete',
        translation: 'seventeen',
        index: 16,
        pronunciation: 'dyeh-see-SYEH-teh',
      },
      { word: 'dieciocho', translation: 'eighteen', index: 17, pronunciation: 'dyeh-see-OH-choh' },
      {
        word: 'diecinueve',
        translation: 'nineteen',
        index: 18,
        pronunciation: 'dyeh-see-NWEH-beh',
      },
      { word: 'veinte', translation: 'twenty', index: 19, pronunciation: 'BAYN-teh' },
    ],
    colors: [
      { word: 'rojo', translation: 'red', index: 0, pronunciation: 'ROH-hoh' },
      { word: 'azul', translation: 'blue', index: 1, pronunciation: 'ah-SOOL' },
      { word: 'verde', translation: 'green', index: 2, pronunciation: 'BEHR-deh' },
      { word: 'amarillo', translation: 'yellow', index: 3, pronunciation: 'ah-mah-REE-yoh' },
      { word: 'negro', translation: 'black', index: 4, pronunciation: 'NEH-groh' },
      { word: 'blanco', translation: 'white', index: 5, pronunciation: 'BLAHN-koh' },
      { word: 'naranja', translation: 'orange', index: 6, pronunciation: 'nah-RAHN-hah' },
      { word: 'morado', translation: 'purple', index: 7, pronunciation: 'moh-RAH-doh' },
      { word: 'rosa', translation: 'pink', index: 8, pronunciation: 'ROH-sah' },
      { word: 'gris', translation: 'grey', index: 9, pronunciation: 'grees' },
      { word: 'marrón', translation: 'brown', index: 10, pronunciation: 'mah-RROHN' },
      { word: 'dorado', translation: 'gold', index: 11, pronunciation: 'doh-RAH-doh' },
    ],
    greetings: [
      { word: 'hola', translation: 'hello', index: 0, pronunciation: 'OH-lah' },
      { word: 'adiós', translation: 'goodbye', index: 1, pronunciation: 'ah-DYOHS' },
      { word: 'gracias', translation: 'thank you', index: 2, pronunciation: 'GRAH-syahs' },
      { word: 'por favor', translation: 'please', index: 3, pronunciation: 'por fah-VOR' },
      { word: 'sí', translation: 'yes', index: 4, pronunciation: 'see' },
      { word: 'no', translation: 'no', index: 5, pronunciation: 'noh' },
      {
        word: 'buenos días',
        translation: 'good morning',
        index: 6,
        pronunciation: 'BWEH-nohs DEE-ahs',
      },
      {
        word: 'buenas noches',
        translation: 'good night',
        index: 7,
        pronunciation: 'BWEH-nahs NOH-chehs',
      },
      {
        word: 'cómo estás',
        translation: 'how are you',
        index: 8,
        pronunciation: 'KOH-moh ehs-TAHS',
      },
      { word: 'me llamo', translation: 'my name is', index: 9, pronunciation: 'meh YAH-moh' },
    ],
  },
  fr: {
    numbers: [
      { word: 'un', translation: 'one', index: 0, pronunciation: 'uhn' },
      { word: 'deux', translation: 'two', index: 1, pronunciation: 'duh' },
      { word: 'trois', translation: 'three', index: 2, pronunciation: 'trwah' },
      { word: 'quatre', translation: 'four', index: 3, pronunciation: 'KAH-truh' },
      { word: 'cinq', translation: 'five', index: 4, pronunciation: 'sank' },
      { word: 'six', translation: 'six', index: 5, pronunciation: 'sees' },
      { word: 'sept', translation: 'seven', index: 6, pronunciation: 'set' },
      { word: 'huit', translation: 'eight', index: 7, pronunciation: 'weet' },
      { word: 'neuf', translation: 'nine', index: 8, pronunciation: 'nuhf' },
      { word: 'dix', translation: 'ten', index: 9, pronunciation: 'dees' },
    ],
    colors: [
      { word: 'rouge', translation: 'red', index: 0 },
      { word: 'bleu', translation: 'blue', index: 1 },
      { word: 'vert', translation: 'green', index: 2 },
      { word: 'jaune', translation: 'yellow', index: 3 },
      { word: 'noir', translation: 'black', index: 4 },
      { word: 'blanc', translation: 'white', index: 5 },
    ],
    greetings: [
      { word: 'bonjour', translation: 'hello', index: 0 },
      { word: 'au revoir', translation: 'goodbye', index: 1 },
      { word: 'merci', translation: 'thank you', index: 2 },
      { word: "s'il vous plaît", translation: 'please', index: 3 },
      { word: 'oui', translation: 'yes', index: 4 },
      { word: 'non', translation: 'no', index: 5 },
    ],
  },
  it: {
    numbers: [
      { word: 'uno', translation: 'one', index: 0 },
      { word: 'due', translation: 'two', index: 1 },
      { word: 'tre', translation: 'three', index: 2 },
      { word: 'quattro', translation: 'four', index: 3 },
      { word: 'cinque', translation: 'five', index: 4 },
    ],
    colors: [
      { word: 'rosso', translation: 'red', index: 0 },
      { word: 'blu', translation: 'blue', index: 1 },
      { word: 'verde', translation: 'green', index: 2 },
    ],
    greetings: [
      { word: 'ciao', translation: 'hello/bye', index: 0 },
      { word: 'grazie', translation: 'thank you', index: 2 },
    ],
  },
  de: {
    numbers: [
      { word: 'eins', translation: 'one', index: 0 },
      { word: 'zwei', translation: 'two', index: 1 },
      { word: 'drei', translation: 'three', index: 2 },
      { word: 'vier', translation: 'four', index: 3 },
      { word: 'fünf', translation: 'five', index: 4 },
    ],
    colors: [
      { word: 'rot', translation: 'red', index: 0 },
      { word: 'blau', translation: 'blue', index: 1 },
      { word: 'grün', translation: 'green', index: 2 },
    ],
    greetings: [
      { word: 'hallo', translation: 'hello', index: 0 },
      { word: 'danke', translation: 'thank you', index: 2 },
    ],
  },
  ja: {
    numbers: [
      { word: 'ichi', translation: 'one', index: 0, pronunciation: 'ee-chee' },
      { word: 'ni', translation: 'two', index: 1, pronunciation: 'nee' },
      { word: 'san', translation: 'three', index: 2, pronunciation: 'sahn' },
      { word: 'shi', translation: 'four', index: 3, pronunciation: 'shee' },
      { word: 'go', translation: 'five', index: 4, pronunciation: 'goh' },
    ],
    greetings: [
      { word: 'konnichiwa', translation: 'hello', index: 0 },
      { word: 'arigatou', translation: 'thank you', index: 2 },
    ],
  },
  ko: {
    numbers: [
      { word: 'hana', translation: 'one', index: 0, pronunciation: 'ha-na' },
      { word: 'dul', translation: 'two', index: 1, pronunciation: 'dul' },
      { word: 'set', translation: 'three', index: 2, pronunciation: 'set' },
      { word: 'net', translation: 'four', index: 3, pronunciation: 'net' },
      { word: 'daseot', translation: 'five', index: 4, pronunciation: 'da-seot' },
      { word: 'yeoseot', translation: 'six', index: 5, pronunciation: 'yeo-seot' },
      { word: 'ilgop', translation: 'seven', index: 6, pronunciation: 'il-gop' },
      { word: 'yeodeol', translation: 'eight', index: 7, pronunciation: 'yeo-deol' },
      { word: 'ahop', translation: 'nine', index: 8, pronunciation: 'a-hop' },
      { word: 'yeol', translation: 'ten', index: 9, pronunciation: 'yeol' },
    ],
    greetings: [
      { word: 'annyeonghaseyo', translation: 'hello', index: 0, pronunciation: 'an-nyeong-ha-se-yo' },
      { word: 'gamsahamnida', translation: 'thank you', index: 1, pronunciation: 'gam-sa-ham-ni-da' },
      { word: 'annyeonghi gyeseyo', translation: 'goodbye', index: 2, pronunciation: 'an-nyeong-hi gye-se-yo' },
      { word: 'joe song hamnida', translation: 'sorry', index: 3, pronunciation: 'joe-song ham-ni-da' },
      { word: 'ne', translation: 'yes', index: 4, pronunciation: 'ne' },
      { word: 'ani', translation: 'no', index: 5, pronunciation: 'a-ni' },
    ],
  },
  pt: {
    numbers: [
      { word: 'um', translation: 'one', index: 0, pronunciation: 'oong' },
      { word: 'dois', translation: 'two', index: 1, pronunciation: 'doysh' },
      { word: 'três', translation: 'three', index: 2, pronunciation: 'trehs' },
      { word: 'quatro', translation: 'four', index: 3, pronunciation: 'KWAH-troo' },
      { word: 'cinco', translation: 'five', index: 4, pronunciation: 'SEEN-koo' },
      { word: 'seis', translation: 'six', index: 5, pronunciation: 'says' },
      { word: 'sete', translation: 'seven', index: 6, pronunciation: 'SEH-chee' },
      { word: 'oito', translation: 'eight', index: 7, pronunciation: 'OY-too' },
      { word: 'nove', translation: 'nine', index: 8, pronunciation: 'NOH-vee' },
      { word: 'dez', translation: 'ten', index: 9, pronunciation: 'dehzh' },
    ],
    colors: [
      { word: 'vermelho', translation: 'red', index: 0, pronunciation: 'ver-MEH-lyoo' },
      { word: 'azul', translation: 'blue', index: 1, pronunciation: 'ah-ZOOL' },
      { word: 'verde', translation: 'green', index: 2, pronunciation: 'VEHR-jee' },
      { word: 'amarelo', translation: 'yellow', index: 3, pronunciation: 'ah-mah-REH-loo' },
      { word: 'preto', translation: 'black', index: 4, pronunciation: 'PREH-too' },
      { word: 'branco', translation: 'white', index: 5, pronunciation: 'BRAHN-koo' },
    ],
    greetings: [
      { word: 'olá', translation: 'hello', index: 0, pronunciation: 'oh-LAH' },
      { word: 'tchau', translation: 'goodbye', index: 1, pronunciation: 'chow' },
      { word: 'obrigado', translation: 'thank you', index: 2, pronunciation: 'oh-bree-GAH-doo' },
      { word: 'por favor', translation: 'please', index: 3, pronunciation: 'por fah-VOR' },
      { word: 'sim', translation: 'yes', index: 4, pronunciation: 'seeng' },
      { word: 'não', translation: 'no', index: 5, pronunciation: 'nowng' },
    ],
  },
  zh: {
    numbers: [
      { word: 'yī', translation: 'one', index: 0, pronunciation: 'yee' },
      { word: 'èr', translation: 'two', index: 1, pronunciation: 'ar' },
      { word: 'sān', translation: 'three', index: 2, pronunciation: 'sahn' },
      { word: 'sì', translation: 'four', index: 3, pronunciation: 'suh' },
      { word: 'wǔ', translation: 'five', index: 4, pronunciation: 'woo' },
      { word: 'liù', translation: 'six', index: 5, pronunciation: 'lyoh' },
      { word: 'qī', translation: 'seven', index: 6, pronunciation: 'chee' },
      { word: 'bā', translation: 'eight', index: 7, pronunciation: 'bah' },
      { word: 'jiǔ', translation: 'nine', index: 8, pronunciation: 'jyoh' },
      { word: 'shí', translation: 'ten', index: 9, pronunciation: 'shir' },
    ],
    greetings: [
      { word: 'nǐ hǎo', translation: 'hello', index: 0, pronunciation: 'nee how' },
      { word: 'xiè xiè', translation: 'thank you', index: 1, pronunciation: 'shyeh shyeh' },
      { word: 'zài jiàn', translation: 'goodbye', index: 2, pronunciation: 'dzye jyen' },
      { word: 'qǐng', translation: 'please', index: 3, pronunciation: 'ching' },
      { word: 'shì', translation: 'yes', index: 4, pronunciation: 'shir' },
      { word: 'bù', translation: 'no', index: 5, pronunciation: 'boo' },
    ],
  },
  ru: {
    numbers: [
      { word: 'odin', translation: 'one', index: 0, pronunciation: 'ah-DEEN' },
      { word: 'dva', translation: 'two', index: 1, pronunciation: 'dvah' },
      { word: 'tri', translation: 'three', index: 2, pronunciation: 'tree' },
      { word: 'chetyre', translation: 'four', index: 3, pronunciation: 'cheh-TYH-rye' },
      { word: 'pyat\'', translation: 'five', index: 4, pronunciation: 'pyat' },
      { word: 'shest\'', translation: 'six', index: 5, pronunciation: 'shest' },
      { word: 'sem\'', translation: 'seven', index: 6, pronunciation: 'syem' },
      { word: 'vosem\'', translation: 'eight', index: 7, pronunciation: 'VOH-syem' },
      { word: 'devyat\'', translation: 'nine', index: 8, pronunciation: 'DEHV-yat' },
      { word: 'desyat\'', translation: 'ten', index: 9, pronunciation: 'DEH-syat' },
    ],
    greetings: [
      { word: 'zdra-vstvuy-te', translation: 'hello', index: 0, pronunciation: 'zdra-stvoo-ee-tye' },
      { word: 'spa-si-bo', translation: 'thank you', index: 1, pronunciation: 'spa-SEE-ba' },
      { word: 'do svi-da-ni-ya', translation: 'goodbye', index: 2, pronunciation: 'da svee-da-NEE-ya' },
      { word: 'po-zha-luys-ta', translation: 'please', index: 3, pronunciation: 'pa-ZHA-loo-sta' },
      { word: 'da', translation: 'yes', index: 4, pronunciation: 'da' },
      { word: 'nyet', translation: 'no', index: 5, pronunciation: 'nyet' },
    ],
  },
  ar: {
    numbers: [
      { word: 'wahid', translation: 'one', index: 0, pronunciation: 'wah-HEED' },
      { word: 'ithnan', translation: 'two', index: 1, pronunciation: 'ith-NAAN' },
      { word: 'thalatha', translation: 'three', index: 2, pronunciation: 'tha-LAH-thah' },
      { word: 'arba\'a', translation: 'four', index: 3, pronunciation: 'ar-BAH-ah' },
      { word: 'khamsa', translation: 'five', index: 4, pronunciation: 'KHAHM-sah' },
      { word: 'sitta', translation: 'six', index: 5, pronunciation: 'SIT-tah' },
      { word: 'sab\'a', translation: 'seven', index: 6, pronunciation: 'SAH-bah' },
      { word: 'thamania', translation: 'eight', index: 7, pronunciation: 'tha-MAH-nee-ah' },
      { word: 'tis\'a', translation: 'nine', index: 8, pronunciation: 'TEE-sah' },
      { word: 'ashara', translation: 'ten', index: 9, pronunciation: 'AH-shah-rah' },
    ],
    greetings: [
      { word: 'marhaban', translation: 'hello', index: 0, pronunciation: 'MAR-hah-ban' },
      { word: 'shukran', translation: 'thank you', index: 1, pronunciation: 'SHOOK-rahn' },
      { word: 'ila al-liqa\'', translation: 'goodbye', index: 2, pronunciation: 'EE-lah al-LEE-kah' },
      { word: 'min fadlik', translation: 'please', index: 3, pronunciation: 'min FAD-lik' },
      { word: 'na\'am', translation: 'yes', index: 4, pronunciation: 'NAH-am' },
      { word: 'la', translation: 'no', index: 5, pronunciation: 'lah' },
    ],
  },
  hi: {
    numbers: [
      { word: 'ek', translation: 'one', index: 0, pronunciation: 'ayk' },
      { word: 'do', translation: 'two', index: 1, pronunciation: 'doh' },
      { word: 'teen', translation: 'three', index: 2, pronunciation: 'teen' },
      { word: 'chaar', translation: 'four', index: 3, pronunciation: 'chaar' },
      { word: 'paanch', translation: 'five', index: 4, pronunciation: 'paanch' },
      { word: 'chhah', translation: 'six', index: 5, pronunciation: 'chhah' },
      { word: 'saat', translation: 'seven', index: 6, pronunciation: 'saat' },
      { word: 'aath', translation: 'eight', index: 7, pronunciation: 'aath' },
      { word: 'nau', translation: 'nine', index: 8, pronunciation: 'nau' },
      { word: 'das', translation: 'ten', index: 9, pronunciation: 'das' },
    ],
    greetings: [
      { word: 'namaste', translation: 'hello', index: 0, pronunciation: 'nah-mah-STAY' },
      { word: 'dhanyavaad', translation: 'thank you', index: 1, pronunciation: 'dhun-yuh-VAHD' },
      { word: 'alvida', translation: 'goodbye', index: 2, pronunciation: 'ahl-vee-DAH' },
      { word: 'kripya', translation: 'please', index: 3, pronunciation: 'KRIP-ya' },
      { word: 'haan', translation: 'yes', index: 4, pronunciation: 'haan' },
      { word: 'nahin', translation: 'no', index: 5, pronunciation: 'nah-HEEN' },
    ],
  },
  nl: {
    numbers: [
      { word: 'een', translation: 'one', index: 0, pronunciation: 'ayn' },
      { word: 'twee', translation: 'two', index: 1, pronunciation: 'tway' },
      { word: 'drie', translation: 'three', index: 2, pronunciation: 'dree' },
      { word: 'vier', translation: 'four', index: 3, pronunciation: 'veer' },
      { word: 'vijf', translation: 'five', index: 4, pronunciation: 'vayf' },
      { word: 'zes', translation: 'six', index: 5, pronunciation: 'zehs' },
      { word: 'zeven', translation: 'seven', index: 6, pronunciation: 'ZAY-vuh' },
      { word: 'acht', translation: 'eight', index: 7, pronunciation: 'ahcht' },
      { word: 'negen', translation: 'nine', index: 8, pronunciation: 'NAY-guh' },
      { word: 'tien', translation: 'ten', index: 9, pronunciation: 'teen' },
    ],
    greetings: [
      { word: 'hallo', translation: 'hello', index: 0, pronunciation: 'hah-LOH' },
      { word: 'dank u', translation: 'thank you', index: 1, pronunciation: 'dahnk oo' },
      { word: 'tot ziens', translation: 'goodbye', index: 2, pronunciation: 'tot zeens' },
      { word: 'alstublieft', translation: 'please', index: 3, pronunciation: 'AHL-stoo-bleeft' },
      { word: 'ja', translation: 'yes', index: 4, pronunciation: 'yah' },
      { word: 'nee', translation: 'no', index: 5, pronunciation: 'nay' },
    ],
  },
  pl: {
    numbers: [
      { word: 'jeden', translation: 'one', index: 0, pronunciation: 'YEH-den' },
      { word: 'dwa', translation: 'two', index: 1, pronunciation: 'dvah' },
      { word: 'trzy', translation: 'three', index: 2, pronunciation: 'tshih' },
      { word: 'cztery', translation: 'four', index: 3, pronunciation: 'CHTEH-rih' },
      { word: 'pięć', translation: 'five', index: 4, pronunciation: 'pyench' },
      { word: 'sześć', translation: 'six', index: 5, pronunciation: 'sheshch' },
      { word: 'siedem', translation: 'seven', index: 6, pronunciation: 'SHEH-dem' },
      { word: 'osiem', translation: 'eight', index: 7, pronunciation: 'OH-shem' },
      { word: 'dziewięć', translation: 'nine', index: 8, pronunciation: 'JEV-yench' },
      { word: 'dziesięć', translation: 'ten', index: 9, pronunciation: 'JESH-yench' },
    ],
    greetings: [
      { word: 'dzień dobry', translation: 'hello', index: 0, pronunciation: 'jeyn DOH-brih' },
      { word: 'dziękuję', translation: 'thank you', index: 1, pronunciation: 'jen-KOO-yeh' },
      { word: 'do widzenia', translation: 'goodbye', index: 2, pronunciation: 'do vee-DZEN-ya' },
      { word: 'proszę', translation: 'please', index: 3, pronunciation: 'PROH-sheh' },
      { word: 'tak', translation: 'yes', index: 4, pronunciation: 'tahk' },
      { word: 'nie', translation: 'no', index: 5, pronunciation: 'nyeh' },
    ],
  },
  sv: {
    numbers: [
      { word: 'ett', translation: 'one', index: 0, pronunciation: 'eht' },
      { word: 'två', translation: 'two', index: 1, pronunciation: 'tvoh' },
      { word: 'tre', translation: 'three', index: 2, pronunciation: 'tray' },
      { word: 'fyra', translation: 'four', index: 3, pronunciation: 'FEE-rah' },
      { word: 'fem', translation: 'five', index: 4, pronunciation: 'fehm' },
      { word: 'sex', translation: 'six', index: 5, pronunciation: 'seks' },
      { word: 'sju', translation: 'seven', index: 6, pronunciation: 'shoo' },
      { word: 'åtta', translation: 'eight', index: 7, pronunciation: 'OH-tah' },
      { word: 'nio', translation: 'nine', index: 8, pronunciation: 'NEE-oh' },
      { word: 'tio', translation: 'ten', index: 9, pronunciation: 'TEE-oh' },
    ],
    greetings: [
      { word: 'hej', translation: 'hello', index: 0, pronunciation: 'hay' },
      { word: 'tack', translation: 'thank you', index: 1, pronunciation: 'tahk' },
      { word: 'hej då', translation: 'goodbye', index: 2, pronunciation: 'hay doh' },
      { word: 'snälla', translation: 'please', index: 3, pronunciation: 'SNEH-lah' },
      { word: 'ja', translation: 'yes', index: 4, pronunciation: 'yah' },
      { word: 'nej', translation: 'no', index: 5, pronunciation: 'nay' },
    ],
  },
  tr: {
    numbers: [
      { word: 'bir', translation: 'one', index: 0, pronunciation: 'beer' },
      { word: 'iki', translation: 'two', index: 1, pronunciation: 'ee-KEE' },
      { word: 'üç', translation: 'three', index: 2, pronunciation: 'ooch' },
      { word: 'dört', translation: 'four', index: 3, pronunciation: 'durt' },
      { word: 'beş', translation: 'five', index: 4, pronunciation: 'besh' },
      { word: 'altı', translation: 'six', index: 5, pronunciation: 'ahl-TUH' },
      { word: 'yedi', translation: 'seven', index: 6, pronunciation: 'yeh-DEE' },
      { word: 'sekiz', translation: 'eight', index: 7, pronunciation: 'seh-KEEZ' },
      { word: 'dokuz', translation: 'nine', index: 8, pronunciation: 'doh-KOOZ' },
      { word: 'on', translation: 'ten', index: 9, pronunciation: 'on' },
    ],
    greetings: [
      { word: 'merhaba', translation: 'hello', index: 0, pronunciation: 'mehr-HAH-bah' },
      { word: 'teşekkür ederim', translation: 'thank you', index: 1, pronunciation: 'teh-shek-KOOR eh-deh-REEM' },
      { word: 'hoşça kal', translation: 'goodbye', index: 2, pronunciation: 'hosh-cha kahl' },
      { word: 'lütfen', translation: 'please', index: 3, pronunciation: 'LEWT-fehn' },
      { word: 'evet', translation: 'yes', index: 4, pronunciation: 'eh-VEHT' },
      { word: 'hayır', translation: 'no', index: 5, pronunciation: 'hah-YUHR' },
    ],
  },
  th: {
    numbers: [
      { word: 'nueng', translation: 'one', index: 0, pronunciation: 'noo-eng' },
      { word: 'song', translation: 'two', index: 1, pronunciation: 'song' },
      { word: 'sam', translation: 'three', index: 2, pronunciation: 'sahm' },
      { word: 'si', translation: 'four', index: 3, pronunciation: 'see' },
      { word: 'ha', translation: 'five', index: 4, pronunciation: 'hah' },
      { word: 'hok', translation: 'six', index: 5, pronunciation: 'hok' },
      { word: 'chet', translation: 'seven', index: 6, pronunciation: 'chet' },
      { word: 'paet', translation: 'eight', index: 7, pronunciation: 'paet' },
      { word: 'kao', translation: 'nine', index: 8, pronunciation: 'kao' },
      { word: 'sip', translation: 'ten', index: 9, pronunciation: 'sip' },
    ],
    greetings: [
      { word: 'sawasdee', translation: 'hello', index: 0, pronunciation: 'sah-wah-DEE' },
      { word: 'khob khun', translation: 'thank you', index: 1, pronunciation: 'khawp khun' },
      { word: 'la gorn', translation: 'goodbye', index: 2, pronunciation: 'lah gawn' },
      { word: 'karuna', translation: 'please', index: 3, pronunciation: 'kah-roo-NAH' },
      { word: 'chai', translation: 'yes', index: 4, pronunciation: 'chai' },
      { word: 'mai', translation: 'no', index: 5, pronunciation: 'mai' },
    ],
  },
  vi: {
    numbers: [
      { word: 'mot', translation: 'one', index: 0, pronunciation: 'moht' },
      { word: 'hai', translation: 'two', index: 1, pronunciation: 'hai' },
      { word: 'ba', translation: 'three', index: 2, pronunciation: 'bah' },
      { word: 'bon', translation: 'four', index: 3, pronunciation: 'bohn' },
      { word: 'nam', translation: 'five', index: 4, pronunciation: 'nahm' },
      { word: 'sau', translation: 'six', index: 5, pronunciation: 'sau' },
      { word: 'bay', translation: 'seven', index: 6, pronunciation: 'bai' },
      { word: 'tam', translation: 'eight', index: 7, pronunciation: 'tahm' },
      { word: 'chin', translation: 'nine', index: 8, pronunciation: 'chin' },
      { word: 'muoi', translation: 'ten', index: 9, pronunciation: 'moo-oi' },
    ],
    greetings: [
      { word: 'xin chao', translation: 'hello', index: 0, pronunciation: 'sin chow' },
      { word: 'cam on', translation: 'thank you', index: 1, pronunciation: 'kahm uhn' },
      { word: 'tam biet', translation: 'goodbye', index: 2, pronunciation: 'tam bee-eht' },
      { word: 'lam on', translation: 'please', index: 3, pronunciation: 'lahm uhn' },
      { word: 'vang', translation: 'yes', index: 4, pronunciation: 'vahng' },
      { word: 'khong', translation: 'no', index: 5, pronunciation: 'khawng' },
    ],
  },
};

export interface LocalScore {
  id: number;
  userId: number;
  language: string;
  category: string;
  count: number;
  createdAt: string;
}

const LOCAL_SCORES_KEY = 'lok-lingu-local-scores';

export function saveLocalScore(score: Omit<LocalScore, 'id' | 'createdAt'>) {
  try {
    const existingStr = localStorage.getItem(LOCAL_SCORES_KEY);
    const scores: LocalScore[] = existingStr ? JSON.parse(existingStr) : [];
    const newScore: LocalScore = {
      ...score,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    scores.unshift(newScore);
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(scores.slice(0, 100)));
  } catch (err) {
    console.error('Failed to save score locally', err);
  }
}

export function getLocalScores(userId?: number): LocalScore[] {
  try {
    const existingStr = localStorage.getItem(LOCAL_SCORES_KEY);
    if (!existingStr) return [];
    const scores: LocalScore[] = JSON.parse(existingStr);
    return userId ? scores.filter((s) => s.userId === userId) : scores;
  } catch (err) {
    console.error('Failed to read local scores', err);
    return [];
  }
}

export function getLocalUserStats(userId: number) {
  const scores = getLocalScores(userId);
  const totalGames = scores.length;
  const bestCount = scores.length > 0 ? Math.max(...scores.map((s) => s.count)) : 0;
  const totalWordsSpoken = scores.reduce((acc, s) => acc + s.count, 0);

  const langCounts: Record<string, number> = {};
  const catCounts: Record<string, number> = {};
  for (const s of scores) {
    langCounts[s.language] = (langCounts[s.language] ?? 0) + 1;
    catCounts[s.category] = (catCounts[s.category] ?? 0) + 1;
  }

  const favoriteLanguage =
    Object.keys(langCounts).sort((a, b) => langCounts[b] - langCounts[a])[0] ?? null;
  const favoriteCategory =
    Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0] ?? null;

  return {
    userId,
    totalGames,
    bestCount,
    totalWordsSpoken,
    favoriteLanguage,
    favoriteCategory,
    personalBests: scores.slice(0, 10),
  };
}
