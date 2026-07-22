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
];

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
      { word: 'diecisiete', translation: 'seventeen', index: 16, pronunciation: 'dyeh-see-SYEH-teh' },
      { word: 'dieciocho', translation: 'eighteen', index: 17, pronunciation: 'dyeh-see-OH-choh' },
      { word: 'diecinueve', translation: 'nineteen', index: 18, pronunciation: 'dyeh-see-NWEH-beh' },
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
      { word: 'buenos días', translation: 'good morning', index: 6, pronunciation: 'BWEH-nohs DEE-ahs' },
      { word: 'buenas noches', translation: 'good night', index: 7, pronunciation: 'BWEH-nahs NOH-chehs' },
      { word: 'cómo estás', translation: 'how are you', index: 8, pronunciation: 'KOH-moh ehs-TAHS' },
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
