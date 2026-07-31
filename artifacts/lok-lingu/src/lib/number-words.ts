/* ------------------------------------------------------------------
   LokLingu — infinite number generation

   The numbers category is not a word list, it is a sequence. A learner
   should be able to keep counting until they get bored, in any supported
   language, so we generate the spoken form of an arbitrary integer
   instead of reading from a fixed table.

   Every generator covers 0 .. 999,999,999. Above that we return null and
   the caller falls back to the word list.
------------------------------------------------------------------ */

export interface GeneratedNumber {
  word: string;
  translation: string;
  /** Latin-script hint used both for display and as a recognition alternate. */
  pronunciation?: string;
}

/* ── English (also used for the translation column) ─────────────── */

const EN_UNITS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const EN_TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

function enBelow100(n: number): string {
  if (n < 20) return EN_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${EN_TENS[t]}-${EN_UNITS[u]}` : EN_TENS[t];
}

function enBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return enBelow100(r);
  const head = `${EN_UNITS[h]} hundred`;
  return r ? `${head} ${enBelow100(r)}` : head;
}

export function enNumber(n: number): string {
  if (n === 0) return 'zero';
  const parts: string[] = [];
  const groups: [number, string][] = [
    [1_000_000, 'million'],
    [1_000, 'thousand'],
  ];
  let rest = n;
  for (const [size, label] of groups) {
    const q = Math.floor(rest / size);
    if (q) {
      parts.push(`${enBelow1000(q)} ${label}`);
      rest %= size;
    }
  }
  if (rest) parts.push(enBelow1000(rest));
  return parts.join(' ');
}

/* ── Romance ────────────────────────────────────────────────────── */

const ES_UNITS = [
  '',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
];
const ES_TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const ES_HUNDREDS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
];

function esBelow100(n: number): string {
  if (n === 0) return 'cero';
  if (n < 30) return ES_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${ES_TENS[t]} y ${ES_UNITS[u]}` : ES_TENS[t];
}

function esBelow1000(n: number): string {
  if (n === 100) return 'cien';
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return esBelow100(r);
  return r ? `${ES_HUNDREDS[h]} ${esBelow100(r)}` : ES_HUNDREDS[h];
}

function esNumber(n: number): string {
  if (n === 0) return 'cero';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return esBelow1000(rest);
  const head = mil === 1 ? 'mil' : `${esBelow1000(mil)} mil`;
  return rest ? `${head} ${esBelow1000(rest)}` : head;
}

const FR_UNITS = [
  '',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
];
const FR_TENS: Record<number, string> = {
  2: 'vingt',
  3: 'trente',
  4: 'quarante',
  5: 'cinquante',
  6: 'soixante',
};

function frBelow100(n: number): string {
  if (n === 0) return 'zéro';
  if (n < 20) return FR_UNITS[n];
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return FR_TENS[t];
    if (u === 1) return `${FR_TENS[t]} et un`;
    return `${FR_TENS[t]}-${FR_UNITS[u]}`;
  }
  if (n < 80) {
    const u = n - 60;
    if (u === 11) return 'soixante et onze';
    return `soixante-${FR_UNITS[u]}`;
  }
  const u = n - 80;
  if (u === 0) return 'quatre-vingts';
  return `quatre-vingt-${FR_UNITS[u]}`;
}

function frBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return frBelow100(r);
  const head = h === 1 ? 'cent' : `${FR_UNITS[h]} cent${r === 0 ? 's' : ''}`;
  return r ? `${head} ${frBelow100(r)}` : head;
}

function frNumber(n: number): string {
  if (n === 0) return 'zéro';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return frBelow1000(rest);
  const head = mil === 1 ? 'mille' : `${frBelow1000(mil)} mille`;
  return rest ? `${head} ${frBelow1000(rest)}` : head;
}

const IT_UNITS = [
  '',
  'uno',
  'due',
  'tre',
  'quattro',
  'cinque',
  'sei',
  'sette',
  'otto',
  'nove',
  'dieci',
  'undici',
  'dodici',
  'tredici',
  'quattordici',
  'quindici',
  'sedici',
  'diciassette',
  'diciotto',
  'diciannove',
];
const IT_TENS = [
  '',
  '',
  'venti',
  'trenta',
  'quaranta',
  'cinquanta',
  'sessanta',
  'settanta',
  'ottanta',
  'novanta',
];

function itBelow100(n: number): string {
  if (n === 0) return 'zero';
  if (n < 20) return IT_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (!u) return IT_TENS[t];
  // Elision before vowel-initial uno/otto: ventuno, ventotto.
  const tens = u === 1 || u === 8 ? IT_TENS[t].slice(0, -1) : IT_TENS[t];
  // tre takes an accent when final: ventitré.
  const unit = u === 3 ? 'tré' : IT_UNITS[u];
  return `${tens}${unit}`;
}

function itBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return itBelow100(r);
  const head = h === 1 ? 'cento' : `${IT_UNITS[h]}cento`;
  return r ? `${head}${itBelow100(r)}` : head;
}

function itNumber(n: number): string {
  if (n === 0) return 'zero';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return itBelow1000(rest);
  const head = mil === 1 ? 'mille' : `${itBelow1000(mil)}mila`;
  return rest ? `${head}${itBelow1000(rest)}` : head;
}

const PT_UNITS = [
  '',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'onze',
  'doze',
  'treze',
  'catorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
];
const PT_TENS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
];
const PT_HUNDREDS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
];

function ptBelow100(n: number): string {
  if (n === 0) return 'zero';
  if (n < 20) return PT_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${PT_TENS[t]} e ${PT_UNITS[u]}` : PT_TENS[t];
}

function ptBelow1000(n: number): string {
  if (n === 100) return 'cem';
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return ptBelow100(r);
  return r ? `${PT_HUNDREDS[h]} e ${ptBelow100(r)}` : PT_HUNDREDS[h];
}

function ptNumber(n: number): string {
  if (n === 0) return 'zero';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return ptBelow1000(rest);
  const head = mil === 1 ? 'mil' : `${ptBelow1000(mil)} mil`;
  return rest ? `${head} e ${ptBelow1000(rest)}` : head;
}

/* ── Germanic ───────────────────────────────────────────────────── */

const DE_UNITS = [
  '',
  'eins',
  'zwei',
  'drei',
  'vier',
  'fünf',
  'sechs',
  'sieben',
  'acht',
  'neun',
  'zehn',
  'elf',
  'zwölf',
  'dreizehn',
  'vierzehn',
  'fünfzehn',
  'sechzehn',
  'siebzehn',
  'achtzehn',
  'neunzehn',
];
const DE_TENS = [
  '',
  '',
  'zwanzig',
  'dreißig',
  'vierzig',
  'fünfzig',
  'sechzig',
  'siebzig',
  'achtzig',
  'neunzig',
];

function deBelow100(n: number): string {
  if (n === 0) return 'null';
  if (n < 20) return DE_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (!u) return DE_TENS[t];
  // "einundzwanzig" — ein, not eins, when compounded.
  const unit = u === 1 ? 'ein' : DE_UNITS[u];
  return `${unit}und${DE_TENS[t]}`;
}

function deBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return deBelow100(r);
  const head = h === 1 ? 'einhundert' : `${DE_UNITS[h]}hundert`;
  return r ? `${head}${deBelow100(r)}` : head;
}

function deNumber(n: number): string {
  if (n === 0) return 'null';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return deBelow1000(rest);
  const head = mil === 1 ? 'eintausend' : `${deBelow1000(mil)}tausend`;
  return rest ? `${head}${deBelow1000(rest)}` : head;
}

const NL_UNITS = [
  '',
  'een',
  'twee',
  'drie',
  'vier',
  'vijf',
  'zes',
  'zeven',
  'acht',
  'negen',
  'tien',
  'elf',
  'twaalf',
  'dertien',
  'veertien',
  'vijftien',
  'zestien',
  'zeventien',
  'achttien',
  'negentien',
];
const NL_TENS = [
  '',
  '',
  'twintig',
  'dertig',
  'veertig',
  'vijftig',
  'zestig',
  'zeventig',
  'tachtig',
  'negentig',
];

function nlBelow100(n: number): string {
  if (n === 0) return 'nul';
  if (n < 20) return NL_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (!u) return NL_TENS[t];
  // Dutch inserts an "-en-" and adds a trema after a vowel: tweeëntwintig.
  const unit = NL_UNITS[u];
  const joiner = /[aeiou]$/.test(unit) ? 'ën' : 'en';
  return `${unit}${joiner}${NL_TENS[t]}`;
}

function nlBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return nlBelow100(r);
  const head = h === 1 ? 'honderd' : `${NL_UNITS[h]}honderd`;
  return r ? `${head}${nlBelow100(r)}` : head;
}

function nlNumber(n: number): string {
  if (n === 0) return 'nul';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return nlBelow1000(rest);
  const head = mil === 1 ? 'duizend' : `${nlBelow1000(mil)}duizend`;
  return rest ? `${head} ${nlBelow1000(rest)}` : head;
}

const SV_UNITS = [
  '',
  'ett',
  'två',
  'tre',
  'fyra',
  'fem',
  'sex',
  'sju',
  'åtta',
  'nio',
  'tio',
  'elva',
  'tolv',
  'tretton',
  'fjorton',
  'femton',
  'sexton',
  'sjutton',
  'arton',
  'nitton',
];
const SV_TENS = [
  '',
  '',
  'tjugo',
  'trettio',
  'fyrtio',
  'femtio',
  'sextio',
  'sjuttio',
  'åttio',
  'nittio',
];

function svBelow100(n: number): string {
  if (n === 0) return 'noll';
  if (n < 20) return SV_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${SV_TENS[t]}${SV_UNITS[u]}` : SV_TENS[t];
}

function svBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return svBelow100(r);
  const head = h === 1 ? 'etthundra' : `${SV_UNITS[h]}hundra`;
  return r ? `${head}${svBelow100(r)}` : head;
}

function svNumber(n: number): string {
  if (n === 0) return 'noll';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return svBelow1000(rest);
  const head = mil === 1 ? 'ettusen' : `${svBelow1000(mil)}tusen`;
  return rest ? `${head}${svBelow1000(rest)}` : head;
}

/* ── Slavic ─────────────────────────────────────────────────────── */

const RU_UNITS = [
  '',
  'один',
  'два',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
  'десять',
  'одиннадцать',
  'двенадцать',
  'тринадцать',
  'четырнадцать',
  'пятнадцать',
  'шестнадцать',
  'семнадцать',
  'восемнадцать',
  'девятнадцать',
];
const RU_TENS = [
  '',
  '',
  'двадцать',
  'тридцать',
  'сорок',
  'пятьдесят',
  'шестьдесят',
  'семьдесят',
  'восемьдесят',
  'девяносто',
];
const RU_HUNDREDS = [
  '',
  'сто',
  'двести',
  'триста',
  'четыреста',
  'пятьсот',
  'шестьсот',
  'семьсот',
  'восемьсот',
  'девятьсот',
];

function ruBelow100(n: number): string {
  if (n === 0) return 'ноль';
  if (n < 20) return RU_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${RU_TENS[t]} ${RU_UNITS[u]}` : RU_TENS[t];
}

function ruBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return ruBelow100(r);
  return r ? `${RU_HUNDREDS[h]} ${ruBelow100(r)}` : RU_HUNDREDS[h];
}

function ruNumber(n: number): string {
  if (n === 0) return 'ноль';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return ruBelow1000(rest);
  // тысяча is feminine and takes a count-dependent form.
  const lastTwo = mil % 100;
  const last = mil % 10;
  let label: string;
  if (lastTwo >= 11 && lastTwo <= 14) label = 'тысяч';
  else if (last === 1) label = 'тысяча';
  else if (last >= 2 && last <= 4) label = 'тысячи';
  else label = 'тысяч';
  // одна/две тысячи, not один/два.
  let count = ruBelow1000(mil);
  if (last === 1 && lastTwo !== 11) count = count.replace(/один$/, 'одна');
  if (last === 2 && lastTwo !== 12) count = count.replace(/два$/, 'две');
  const head = mil === 1 ? 'тысяча' : `${count} ${label}`;
  return rest ? `${head} ${ruBelow1000(rest)}` : head;
}

const PL_UNITS = [
  '',
  'jeden',
  'dwa',
  'trzy',
  'cztery',
  'pięć',
  'sześć',
  'siedem',
  'osiem',
  'dziewięć',
  'dziesięć',
  'jedenaście',
  'dwanaście',
  'trzynaście',
  'czternaście',
  'piętnaście',
  'szesnaście',
  'siedemnaście',
  'osiemnaście',
  'dziewiętnaście',
];
const PL_TENS = [
  '',
  '',
  'dwadzieścia',
  'trzydzieści',
  'czterdzieści',
  'pięćdziesiąt',
  'sześćdziesiąt',
  'siedemdziesiąt',
  'osiemdziesiąt',
  'dziewięćdziesiąt',
];
const PL_HUNDREDS = [
  '',
  'sto',
  'dwieście',
  'trzysta',
  'czterysta',
  'pięćset',
  'sześćset',
  'siedemset',
  'osiemset',
  'dziewięćset',
];

function plBelow100(n: number): string {
  if (n === 0) return 'zero';
  if (n < 20) return PL_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${PL_TENS[t]} ${PL_UNITS[u]}` : PL_TENS[t];
}

function plBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return plBelow100(r);
  return r ? `${PL_HUNDREDS[h]} ${plBelow100(r)}` : PL_HUNDREDS[h];
}

function plNumber(n: number): string {
  if (n === 0) return 'zero';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return plBelow1000(rest);
  const lastTwo = mil % 100;
  const last = mil % 10;
  let label: string;
  if (mil === 1) label = 'tysiąc';
  else if (lastTwo >= 12 && lastTwo <= 14) label = 'tysięcy';
  else if (last >= 2 && last <= 4) label = 'tysiące';
  else label = 'tysięcy';
  const head = mil === 1 ? 'tysiąc' : `${plBelow1000(mil)} ${label}`;
  return rest ? `${head} ${plBelow1000(rest)}` : head;
}

/* ── Turkish (fully regular) ────────────────────────────────────── */

const TR_UNITS = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TR_TENS = [
  '',
  'on',
  'yirmi',
  'otuz',
  'kırk',
  'elli',
  'altmış',
  'yetmiş',
  'seksen',
  'doksan',
];

function trBelow100(n: number): string {
  if (n === 0) return 'sıfır';
  const t = Math.floor(n / 10);
  const u = n % 10;
  const parts = [t ? TR_TENS[t] : '', u ? TR_UNITS[u] : ''].filter(Boolean);
  return parts.join(' ');
}

function trBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return trBelow100(r);
  const head = h === 1 ? 'yüz' : `${TR_UNITS[h]} yüz`;
  return r ? `${head} ${trBelow100(r)}` : head;
}

function trNumber(n: number): string {
  if (n === 0) return 'sıfır';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return trBelow1000(rest);
  const head = mil === 1 ? 'bin' : `${trBelow1000(mil)} bin`;
  return rest ? `${head} ${trBelow1000(rest)}` : head;
}

/* ── East Asian: myriad-grouped (10^4) ──────────────────────────── */

interface CjkSpec {
  digits: string[];
  ten: string;
  hundred: string;
  thousand: string;
  myriad: string;
  zero: string;
  /** Chinese/Japanese say 十 not 一十 for 10-19. */
  dropLeadingOne: boolean;
  /**
   * Scales that drop a leading "one" entirely: Japanese 百/千 (not 一百),
   * Korean 백/천/만. Chinese keeps 一百 and 一千, so its list is empty.
   */
  dropOneBefore: ('hundred' | 'thousand' | 'myriad')[];
  sep: string;
}

function cjkScale(digit: number, scale: 'hundred' | 'thousand' | 'myriad', s: CjkSpec): string {
  const label = s[scale];
  if (digit === 1 && s.dropOneBefore.includes(scale)) return label;
  return `${s.digits[digit]}${label}`;
}

function cjkBelow10000(n: number, s: CjkSpec): string {
  if (n === 0) return '';
  const out: string[] = [];
  const th = Math.floor(n / 1000);
  const h = Math.floor((n % 1000) / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  if (th) out.push(cjkScale(th, 'thousand', s));
  if (h) out.push(cjkScale(h, 'hundred', s));
  if (t) out.push(t === 1 && s.dropLeadingOne ? s.ten : `${s.digits[t]}${s.ten}`);
  if (u) out.push(s.digits[u]);
  return out.join(s.sep);
}

function cjkNumber(n: number, s: CjkSpec): string {
  if (n === 0) return s.zero;
  const parts: string[] = [];
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  if (man) {
    const body = cjkBelow10000(man, s);
    parts.push(man === 1 && s.dropOneBefore.includes('myriad') ? s.myriad : `${body}${s.myriad}`);
  }
  if (rest) parts.push(cjkBelow10000(rest, s));
  return parts.join(s.sep);
}

const ZH: CjkSpec = {
  digits: ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'],
  ten: '十',
  hundred: '百',
  thousand: '千',
  myriad: '万',
  zero: '零',
  dropLeadingOne: true,
  dropOneBefore: [],
  sep: '',
};

const JA_KANJI: CjkSpec = {
  digits: ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'],
  ten: '十',
  hundred: '百',
  thousand: '千',
  myriad: '万',
  zero: '零',
  dropLeadingOne: true,
  dropOneBefore: ['hundred', 'thousand'],
  sep: '',
};

const KO: CjkSpec = {
  digits: ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'],
  ten: '십',
  hundred: '백',
  thousand: '천',
  myriad: '만',
  zero: '영',
  dropLeadingOne: true,
  dropOneBefore: ['hundred', 'thousand', 'myriad'],
  sep: '',
};

/* Romanisations, generated with the same shape so they stay in sync. */

const JA_ROMAJI: CjkSpec = {
  digits: ['', 'ichi', 'ni', 'san', 'yon', 'go', 'roku', 'nana', 'hachi', 'kyū'],
  ten: 'jū',
  hundred: 'hyaku',
  thousand: 'sen',
  myriad: 'man',
  zero: 'rei',
  dropLeadingOne: true,
  dropOneBefore: ['hundred', 'thousand'],
  sep: '-',
};

const KO_ROMAN: CjkSpec = {
  digits: ['', 'il', 'i', 'sam', 'sa', 'o', 'yuk', 'chil', 'pal', 'gu'],
  ten: 'sip',
  hundred: 'baek',
  thousand: 'cheon',
  myriad: 'man',
  zero: 'yeong',
  dropLeadingOne: true,
  dropOneBefore: ['hundred', 'thousand', 'myriad'],
  sep: '-',
};

const ZH_PINYIN: CjkSpec = {
  digits: ['', 'yī', 'èr', 'sān', 'sì', 'wǔ', 'liù', 'qī', 'bā', 'jiǔ'],
  ten: 'shí',
  hundred: 'bǎi',
  thousand: 'qiān',
  myriad: 'wàn',
  zero: 'líng',
  dropLeadingOne: true,
  dropOneBefore: [],
  sep: ' ',
};

/* ── Vietnamese ─────────────────────────────────────────────────── */

const VI_UNITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function viBelow100(n: number): string {
  if (n < 10) return VI_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 1) {
    if (u === 0) return 'mười';
    if (u === 5) return 'mười lăm';
    return `mười ${VI_UNITS[u]}`;
  }
  const head = `${VI_UNITS[t]} mươi`;
  if (u === 0) return head;
  if (u === 1) return `${head} mốt`;
  if (u === 4) return `${head} tư`;
  if (u === 5) return `${head} lăm`;
  return `${head} ${VI_UNITS[u]}`;
}

function viBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return viBelow100(r);
  const head = `${VI_UNITS[h]} trăm`;
  if (!r) return head;
  // "linh" fills the empty tens slot: 101 = một trăm linh một.
  if (r < 10) return `${head} linh ${VI_UNITS[r]}`;
  return `${head} ${viBelow100(r)}`;
}

function viNumber(n: number): string {
  if (n === 0) return 'không';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return viBelow1000(rest);
  const head = `${viBelow1000(mil)} nghìn`;
  if (!rest) return head;
  if (rest < 100) return `${head} không trăm ${viBelow100(rest)}`;
  return `${head} ${viBelow1000(rest)}`;
}

/* ── Thai ───────────────────────────────────────────────────────── */

const TH_UNITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const TH_ROMAN = ['sun', 'nueng', 'song', 'sam', 'si', 'ha', 'hok', 'chet', 'paet', 'kao'];

function thBelow100(n: number, roman: boolean): string {
  const U = roman ? TH_ROMAN : TH_UNITS;
  const TEN = roman ? 'sip' : 'สิบ';
  const YI = roman ? 'yi' : 'ยี่';
  const ET = roman ? 'et' : 'เอ็ด';
  if (n < 10) return U[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  const tens = t === 1 ? TEN : t === 2 ? `${YI}${roman ? '-' : ''}${TEN}` : `${U[t]}${roman ? '-' : ''}${TEN}`;
  if (!u) return tens;
  const unit = u === 1 ? ET : U[u];
  return roman ? `${tens}-${unit}` : `${tens}${unit}`;
}

function thBelow1000(n: number, roman: boolean): string {
  const U = roman ? TH_ROMAN : TH_UNITS;
  const HUN = roman ? 'roi' : 'ร้อย';
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return thBelow100(r, roman);
  const head = roman ? `${U[h]}-${HUN}` : `${U[h]}${HUN}`;
  if (!r) return head;
  return roman ? `${head}-${thBelow100(r, roman)}` : `${head}${thBelow100(r, roman)}`;
}

function thNumber(n: number, roman = false): string {
  const U = roman ? TH_ROMAN : TH_UNITS;
  if (n === 0) return U[0];
  const THOU = roman ? 'phan' : 'พัน';
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return thBelow1000(rest, roman);
  const head = roman ? `${thBelow1000(mil, roman)}-${THOU}` : `${thBelow1000(mil, roman)}${THOU}`;
  if (!rest) return head;
  return roman ? `${head}-${thBelow1000(rest, roman)}` : `${head}${thBelow1000(rest, roman)}`;
}

/* ── Hindi (1–100 are individually irregular) ───────────────────── */

const HI_1_100 = [
  'शून्य','एक','दो','तीन','चार','पाँच','छह','सात','आठ','नौ','दस',
  'ग्यारह','बारह','तेरह','चौदह','पंद्रह','सोलह','सत्रह','अठारह','उन्नीस','बीस',
  'इक्कीस','बाईस','तेईस','चौबीस','पच्चीस','छब्बीस','सत्ताईस','अट्ठाईस','उनतीस','तीस',
  'इकतीस','बत्तीस','तैंतीस','चौंतीस','पैंतीस','छत्तीस','सैंतीस','अड़तीस','उनतालीस','चालीस',
  'इकतालीस','बयालीस','तैंतालीस','चौवालीस','पैंतालीस','छियालीस','सैंतालीस','अड़तालीस','उनचास','पचास',
  'इक्यावन','बावन','तिरेपन','चौवन','पचपन','छप्पन','सत्तावन','अट्ठावन','उनसठ','साठ',
  'इकसठ','बासठ','तिरेसठ','चौंसठ','पैंसठ','छियासठ','सड़सठ','अड़सठ','उनहत्तर','सत्तर',
  'इकहत्तर','बहत्तर','तिहत्तर','चौहत्तर','पचहत्तर','छिहत्तर','सतहत्तर','अठहत्तर','उन्यासी','अस्सी',
  'इक्यासी','बयासी','तिरासी','चौरासी','पचासी','छियासी','सतासी','अठासी','नवासी','नब्बे',
  'इक्यानवे','बानवे','तिरानवे','चौरानवे','पचानवे','छियानवे','सत्तानवे','अट्ठानवे','निन्यानवे','सौ',
];

function hiNumber(n: number): string {
  if (n <= 100) return HI_1_100[n];
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (mil) {
    const head = `${hiNumber(mil)} हज़ार`;
    return rest ? `${head} ${hiNumber(rest)}` : head;
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = `${HI_1_100[h]} सौ`;
  return r ? `${head} ${HI_1_100[r]}` : head;
}

/* ── Arabic ─────────────────────────────────────────────────────── */

const AR_UNITS = [
  'صفر',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
  'عشرة',
];
const AR_TEENS = [
  '',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];
const AR_TENS = [
  '',
  '',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];
const AR_HUNDREDS = [
  '',
  'مائة',
  'مائتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

function arBelow100(n: number): string {
  if (n <= 10) return AR_UNITS[n];
  if (n < 20) return AR_TEENS[n - 10];
  const t = Math.floor(n / 10);
  const u = n % 10;
  // Units precede tens and are joined with و: واحد وعشرون.
  return u ? `${AR_UNITS[u]} و${AR_TENS[t]}` : AR_TENS[t];
}

function arBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return arBelow100(r);
  return r ? `${AR_HUNDREDS[h]} و${arBelow100(r)}` : AR_HUNDREDS[h];
}

function arNumber(n: number): string {
  if (n === 0) return AR_UNITS[0];
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (!mil) return arBelow1000(rest);
  const head = mil === 1 ? 'ألف' : mil === 2 ? 'ألفان' : `${arBelow1000(mil)} آلاف`;
  return rest ? `${head} و${arBelow1000(rest)}` : head;
}

/* ── Registry ───────────────────────────────────────────────────── */

type Generator = (n: number) => { word: string; pronunciation?: string };

const GENERATORS: Record<string, Generator> = {
  en: (n) => ({ word: enNumber(n) }),
  es: (n) => ({ word: esNumber(n) }),
  fr: (n) => ({ word: frNumber(n) }),
  it: (n) => ({ word: itNumber(n) }),
  pt: (n) => ({ word: ptNumber(n) }),
  de: (n) => ({ word: deNumber(n) }),
  nl: (n) => ({ word: nlNumber(n) }),
  sv: (n) => ({ word: svNumber(n) }),
  ru: (n) => ({ word: ruNumber(n) }),
  pl: (n) => ({ word: plNumber(n) }),
  tr: (n) => ({ word: trNumber(n) }),
  vi: (n) => ({ word: viNumber(n) }),
  hi: (n) => ({ word: hiNumber(n) }),
  ar: (n) => ({ word: arNumber(n) }),
  zh: (n) => ({ word: cjkNumber(n, ZH), pronunciation: cjkNumber(n, ZH_PINYIN) }),
  ja: (n) => ({ word: cjkNumber(n, JA_KANJI), pronunciation: cjkNumber(n, JA_ROMAJI) }),
  ko: (n) => ({ word: cjkNumber(n, KO), pronunciation: cjkNumber(n, KO_ROMAN) }),
  th: (n) => ({ word: thNumber(n), pronunciation: thNumber(n, true) }),
};

/** Largest value the generators are defined for. */
export const MAX_GENERATED_NUMBER = 999_999_999;

export function supportsInfiniteCounting(language: string): boolean {
  return language in GENERATORS;
}

/**
 * Spoken form of `n` in `language`, or null when the language has no
 * generator or the value is out of range.
 */
export function generateNumber(n: number, language: string): GeneratedNumber | null {
  if (!Number.isInteger(n) || n < 0 || n > MAX_GENERATED_NUMBER) return null;
  const gen = GENERATORS[language];
  if (!gen) return null;
  const { word, pronunciation } = gen(n);
  if (!word) return null;
  return { word, translation: enNumber(n), pronunciation };
}
