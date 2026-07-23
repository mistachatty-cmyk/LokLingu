import type { VercelRequest, VercelResponse } from '@vercel/node';

const LANGUAGES = [
  { code: 'es', name: 'Spanish', categories: ['numbers', 'colors', 'greetings'] },
  { code: 'fr', name: 'French', categories: ['numbers', 'colors', 'greetings'] },
  { code: 'it', name: 'Italian', categories: ['numbers', 'colors', 'greetings'] },
  { code: 'de', name: 'German', categories: ['numbers', 'colors', 'greetings'] },
  { code: 'ja', name: 'Japanese', categories: ['numbers', 'greetings'] },
];

const WORDS: Record<string, Record<string, { word: string; translation: string; index: number; pronunciation?: string }[]>> = {
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
      { word: 'onze', translation: 'eleven', index: 10, pronunciation: 'ohnz' },
      { word: 'douze', translation: 'twelve', index: 11, pronunciation: 'dooz' },
      { word: 'treize', translation: 'thirteen', index: 12, pronunciation: 'trehz' },
      { word: 'quatorze', translation: 'fourteen', index: 13, pronunciation: 'kah-TORZ' },
      { word: 'quinze', translation: 'fifteen', index: 14, pronunciation: 'kanz' },
      { word: 'seize', translation: 'sixteen', index: 15, pronunciation: 'sehz' },
      { word: 'dix-sept', translation: 'seventeen', index: 16, pronunciation: 'dee-set' },
      { word: 'dix-huit', translation: 'eighteen', index: 17, pronunciation: 'dee-weet' },
      { word: 'dix-neuf', translation: 'nineteen', index: 18, pronunciation: 'dee-nuhf' },
      { word: 'vingt', translation: 'twenty', index: 19, pronunciation: 'van' },
    ],
    colors: [
      { word: 'rouge', translation: 'red', index: 0 },
      { word: 'bleu', translation: 'blue', index: 1 },
      { word: 'vert', translation: 'green', index: 2 },
      { word: 'jaune', translation: 'yellow', index: 3 },
      { word: 'noir', translation: 'black', index: 4 },
      { word: 'blanc', translation: 'white', index: 5 },
      { word: 'orange', translation: 'orange', index: 6 },
      { word: 'violet', translation: 'purple', index: 7 },
      { word: 'rose', translation: 'pink', index: 8 },
      { word: 'gris', translation: 'grey', index: 9 },
      { word: 'marron', translation: 'brown', index: 10 },
      { word: 'or', translation: 'gold', index: 11 },
    ],
    greetings: [
      { word: 'bonjour', translation: 'hello', index: 0 },
      { word: 'au revoir', translation: 'goodbye', index: 1 },
      { word: 'merci', translation: 'thank you', index: 2 },
      { word: "s'il vous plaît", translation: 'please', index: 3 },
      { word: 'oui', translation: 'yes', index: 4 },
      { word: 'non', translation: 'no', index: 5 },
      { word: 'bonsoir', translation: 'good evening', index: 6 },
      { word: 'bonne nuit', translation: 'good night', index: 7 },
      { word: 'comment allez-vous', translation: 'how are you', index: 8 },
      { word: "je m'appelle", translation: 'my name is', index: 9 },
    ],
  },
  it: {
    numbers: [
      { word: 'uno', translation: 'one', index: 0 },
      { word: 'due', translation: 'two', index: 1 },
      { word: 'tre', translation: 'three', index: 2 },
      { word: 'quattro', translation: 'four', index: 3 },
      { word: 'cinque', translation: 'five', index: 4 },
      { word: 'sei', translation: 'six', index: 5 },
      { word: 'sette', translation: 'seven', index: 6 },
      { word: 'otto', translation: 'eight', index: 7 },
      { word: 'nove', translation: 'nine', index: 8 },
      { word: 'dieci', translation: 'ten', index: 9 },
      { word: 'undici', translation: 'eleven', index: 10 },
      { word: 'dodici', translation: 'twelve', index: 11 },
      { word: 'tredici', translation: 'thirteen', index: 12 },
      { word: 'quattordici', translation: 'fourteen', index: 13 },
      { word: 'quindici', translation: 'fifteen', index: 14 },
      { word: 'sedici', translation: 'sixteen', index: 15 },
      { word: 'diciassette', translation: 'seventeen', index: 16 },
      { word: 'diciotto', translation: 'eighteen', index: 17 },
      { word: 'diciannove', translation: 'nineteen', index: 18 },
      { word: 'venti', translation: 'twenty', index: 19 },
    ],
    colors: [
      { word: 'rosso', translation: 'red', index: 0 },
      { word: 'blu', translation: 'blue', index: 1 },
      { word: 'verde', translation: 'green', index: 2 },
      { word: 'giallo', translation: 'yellow', index: 3 },
      { word: 'nero', translation: 'black', index: 4 },
      { word: 'bianco', translation: 'white', index: 5 },
      { word: 'arancione', translation: 'orange', index: 6 },
      { word: 'viola', translation: 'purple', index: 7 },
      { word: 'rosa', translation: 'pink', index: 8 },
      { word: 'grigio', translation: 'grey', index: 9 },
      { word: 'marrone', translation: 'brown', index: 10 },
      { word: 'oro', translation: 'gold', index: 11 },
    ],
    greetings: [
      { word: 'ciao', translation: 'hello/bye', index: 0 },
      { word: 'arrivederci', translation: 'goodbye', index: 1 },
      { word: 'grazie', translation: 'thank you', index: 2 },
      { word: 'per favore', translation: 'please', index: 3 },
      { word: 'sì', translation: 'yes', index: 4 },
      { word: 'no', translation: 'no', index: 5 },
      { word: 'buongiorno', translation: 'good morning', index: 6 },
      { word: 'buonanotte', translation: 'good night', index: 7 },
      { word: 'come stai', translation: 'how are you', index: 8 },
      { word: 'mi chiamo', translation: 'my name is', index: 9 },
    ],
  },
  de: {
    numbers: [
      { word: 'eins', translation: 'one', index: 0 },
      { word: 'zwei', translation: 'two', index: 1 },
      { word: 'drei', translation: 'three', index: 2 },
      { word: 'vier', translation: 'four', index: 3 },
      { word: 'fünf', translation: 'five', index: 4 },
      { word: 'sechs', translation: 'six', index: 5 },
      { word: 'sieben', translation: 'seven', index: 6 },
      { word: 'acht', translation: 'eight', index: 7 },
      { word: 'neun', translation: 'nine', index: 8 },
      { word: 'zehn', translation: 'ten', index: 9 },
      { word: 'elf', translation: 'eleven', index: 10 },
      { word: 'zwölf', translation: 'twelve', index: 11 },
      { word: 'dreizehn', translation: 'thirteen', index: 12 },
      { word: 'vierzehn', translation: 'fourteen', index: 13 },
      { word: 'fünfzehn', translation: 'fifteen', index: 14 },
      { word: 'sechzehn', translation: 'sixteen', index: 15 },
      { word: 'siebzehn', translation: 'seventeen', index: 16 },
      { word: 'achtzehn', translation: 'eighteen', index: 17 },
      { word: 'neunzehn', translation: 'nineteen', index: 18 },
      { word: 'zwanzig', translation: 'twenty', index: 19 },
    ],
    colors: [
      { word: 'rot', translation: 'red', index: 0 },
      { word: 'blau', translation: 'blue', index: 1 },
      { word: 'grün', translation: 'green', index: 2 },
      { word: 'gelb', translation: 'yellow', index: 3 },
      { word: 'schwarz', translation: 'black', index: 4 },
      { word: 'weiß', translation: 'white', index: 5 },
      { word: 'orange', translation: 'orange', index: 6 },
      { word: 'lila', translation: 'purple', index: 7 },
      { word: 'rosa', translation: 'pink', index: 8 },
      { word: 'grau', translation: 'grey', index: 9 },
      { word: 'braun', translation: 'brown', index: 10 },
      { word: 'gold', translation: 'gold', index: 11 },
    ],
    greetings: [
      { word: 'hallo', translation: 'hello', index: 0 },
      { word: 'auf wiedersehen', translation: 'goodbye', index: 1 },
      { word: 'danke', translation: 'thank you', index: 2 },
      { word: 'bitte', translation: 'please', index: 3 },
      { word: 'ja', translation: 'yes', index: 4 },
      { word: 'nein', translation: 'no', index: 5 },
      { word: 'guten morgen', translation: 'good morning', index: 6 },
      { word: 'gute nacht', translation: 'good night', index: 7 },
      { word: 'wie geht es ihnen', translation: 'how are you', index: 8 },
      { word: 'ich heiße', translation: 'my name is', index: 9 },
    ],
  },
  ja: {
    numbers: [
      { word: 'ichi', translation: 'one', index: 0, pronunciation: 'ee-chee' },
      { word: 'ni', translation: 'two', index: 1, pronunciation: 'nee' },
      { word: 'san', translation: 'three', index: 2, pronunciation: 'sahn' },
      { word: 'shi', translation: 'four', index: 3, pronunciation: 'shee' },
      { word: 'go', translation: 'five', index: 4, pronunciation: 'goh' },
      { word: 'roku', translation: 'six', index: 5, pronunciation: 'roh-koo' },
      { word: 'nana', translation: 'seven', index: 6, pronunciation: 'nah-nah' },
      { word: 'hachi', translation: 'eight', index: 7, pronunciation: 'hah-chee' },
      { word: 'ku', translation: 'nine', index: 8, pronunciation: 'koo' },
      { word: 'ju', translation: 'ten', index: 9, pronunciation: 'joo' },
    ],
    greetings: [
      { word: 'konnichiwa', translation: 'hello', index: 0 },
      { word: 'sayonara', translation: 'goodbye', index: 1 },
      { word: 'arigatou', translation: 'thank you', index: 2 },
      { word: 'onegaishimasu', translation: 'please', index: 3 },
      { word: 'hai', translation: 'yes', index: 4 },
      { word: 'iie', translation: 'no', index: 5 },
      { word: 'ohayou', translation: 'good morning', index: 6 },
      { word: 'oyasumi', translation: 'good night', index: 7 },
    ],
  },
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { pathname } = new URL(req.url!, 'http://localhost');
  const segments = pathname.replace(/^\/api/, '').split('/').filter(Boolean);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (pathname === '/api/languages' || pathname === '/api/words/languages') {
      return res.status(200).json(LANGUAGES);
    }

    if (segments[0] === 'words' && segments[1] && segments[2]) {
      const lang = segments[1];
      const cat = segments[2];
      const data = WORDS[lang]?.[cat];
      if (!data) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.status(200).json(data);
    }

    if (pathname === '/api/health') {
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
