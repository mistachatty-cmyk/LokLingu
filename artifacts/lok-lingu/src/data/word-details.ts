export interface WordDetail {
  word: string;
  translation: string;
  pronunciation?: string;
  ipa?: string;
  gender?: 'm' | 'f' | 'n' | 'common' | null;
  article?: string;
  plural?: string;
  examples?: string[];
  etymology?: string;
  frequency?: 1 | 2 | 3 | 4 | 5;
  category?: string;
}

export const WORD_DETAILS: Record<string, Record<string, WordDetail[]>> = {
  es: {
    numbers: [
      { word: 'uno', translation: 'one', pronunciation: 'OO-no', ipa: '/ˈuno/', gender: 'm', article: 'un', examples: ['Tengo un libro', 'Uno, dos, tres'], frequency: 1 },
      { word: 'dos', translation: 'two', pronunciation: 'dohs', ipa: '/ˈdos/', examples: ['Son las dos', 'Dos cafés por favor'], frequency: 1 },
      { word: 'tres', translation: 'three', pronunciation: 'trehs', ipa: '/ˈtɾes/', examples: ['Tres gatos', 'A las tres'], frequency: 1 },
      { word: 'cuatro', translation: 'four', pronunciation: 'KWAH-troh', ipa: '/ˈkwatɾo/', examples: ['Cuatro estaciones'], frequency: 1 },
      { word: 'cinco', translation: 'five', pronunciation: 'SEEN-koh', ipa: '/ˈθinko/', examples: ['Cinco dedos'], frequency: 1 },
      { word: 'seis', translation: 'six', pronunciation: 'says', ipa: '/ˈseis/', examples: ['Seis meses'], frequency: 1 },
      { word: 'siete', translation: 'seven', pronunciation: 'SYEH-teh', ipa: '/ˈsjete/', examples: ['Siete días'], frequency: 1 },
      { word: 'ocho', translation: 'eight', pronunciation: 'OH-choh', ipa: '/ˈotʃo/', examples: ['Ocho horas'], frequency: 1 },
      { word: 'nueve', translation: 'nine', pronunciation: 'NWEH-beh', ipa: '/ˈnweβe/', examples: ['Nueve vidas'], frequency: 1 },
      { word: 'diez', translation: 'ten', pronunciation: 'dyehs', ipa: '/ˈdjeθ/', examples: ['Diez dedos'], frequency: 1 },
    ],
    colors: [
      { word: 'rojo', translation: 'red', pronunciation: 'ROH-hoh', ipa: '/ˈroxo/', gender: 'm', examples: ['El coche rojo', 'Sangre roja'], frequency: 1 },
      { word: 'azul', translation: 'blue', pronunciation: 'ah-SOOL', ipa: '/aˈθul/', gender: 'm', examples: ['El cielo azul'], frequency: 1 },
      { word: 'verde', translation: 'green', pronunciation: 'BEHR-deh', ipa: '/ˈbeɾðe/', gender: 'm', examples: ['La hierba verde'], frequency: 1 },
      { word: 'amarillo', translation: 'yellow', pronunciation: 'ah-mah-REE-yoh', ipa: '/amaˈɾiʎo/', gender: 'm', examples: ['El sol amarillo'], frequency: 1 },
      { word: 'negro', translation: 'black', pronunciation: 'NEH-groh', ipa: '/ˈneɡɾo/', gender: 'm', examples: ['La noche negra'], frequency: 1 },
      { word: 'blanco', translation: 'white', pronunciation: 'BLAHN-koh', ipa: '/ˈblaŋko/', gender: 'm', examples: ['La nieve blanca'], frequency: 1 },
      { word: 'naranja', translation: 'orange', pronunciation: 'nah-RAHN-hah', ipa: '/naˈɾanxa/', gender: 'm', examples: ['El jugo de naranja'], frequency: 1 },
      { word: 'morado', translation: 'purple', pronunciation: 'moh-RAH-doh', ipa: '/moˈɾaðo/', gender: 'm', examples: ['El cielo morado'], frequency: 1 },
      { word: 'rosa', translation: 'pink', pronunciation: 'ROH-sah', ipa: '/ˈrosa/', gender: 'f', examples: ['La flor rosa'], frequency: 1 },
      { word: 'gris', translation: 'grey', pronunciation: 'grees', ipa: '/ɡɾis/', gender: 'm', examples: ['El lobo gris'], frequency: 1 },
      { word: 'marrón', translation: 'brown', pronunciation: 'mah-RROHN', ipa: '/maˈron/', gender: 'm', examples: ['El oso marrón'], frequency: 1 },
      { word: 'dorado', translation: 'gold', pronunciation: 'doh-RAH-doh', ipa: '/doˈɾaðo/', gender: 'm', examples: ['El anillo dorado'], frequency: 2 },
    ],
    greetings: [
      { word: 'hola', translation: 'hello', pronunciation: 'OH-lah', examples: ['¡Hola! ¿Cómo estás?'], frequency: 1 },
      { word: 'adiós', translation: 'goodbye', pronunciation: 'ah-DYOHS', examples: ['Adiós, nos vemos'], frequency: 1 },
      { word: 'gracias', translation: 'thank you', pronunciation: 'GRAH-syahs', examples: ['Muchas gracias'], frequency: 1 },
      { word: 'por favor', translation: 'please', pronunciation: 'por fah-VOR', examples: ['Un café por favor'], frequency: 1 },
      { word: 'sí', translation: 'yes', pronunciation: 'see', examples: ['Sí, claro'], frequency: 1 },
      { word: 'no', translation: 'no', pronunciation: 'noh', examples: ['No, gracias'], frequency: 1 },
      { word: 'buenos días', translation: 'good morning', pronunciation: 'BWEH-nohs DEE-ahs', examples: ['¡Buenos días!'], frequency: 1 },
      { word: 'buenas noches', translation: 'good night', pronunciation: 'BWEH-nahs NOH-chehs', examples: ['Buenas noches, que descanses'], frequency: 1 },
      { word: 'cómo estás', translation: 'how are you', pronunciation: 'KOH-moh ehs-TAHS', examples: ['Hola, ¿cómo estás?'], frequency: 1 },
      { word: 'me llamo', translation: 'my name is', pronunciation: 'meh YAH-moh', examples: ['Me llamo Juan'], frequency: 1 },
    ],
  },
  fr: {},
  it: {},
  de: {},
  ja: {},
  ko: {},
  pt: {},
  zh: {},
  ru: {},
  ar: {},
  hi: {},
  nl: {},
  pl: {},
  sv: {},
  tr: {},
  th: {},
  vi: {},
};

export function getWordDetail(language: string, word: string, category: string): WordDetail | undefined {
  const langData = WORD_DETAILS[language];
  if (!langData) return;
  const catData = langData[category];
  if (!catData) return;
  return catData.find((d) => d.word === word);
}
