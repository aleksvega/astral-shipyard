/**
 * Текст → сборка. Человек пишет «имперский дредноут без парусов, две башни,
 * сид 12», а движок достаёт из этого фракцию, класс, оснастку и seed. Разбор
 * нарочно грубый: слова-стемы, никакой модели языка, зато предсказуемый и
 * покрытый тестами. Всё, что не распознано, остаётся на усмотрение генератора.
 */

export interface ParsedBuild {
  faction?: string;
  classId?: string;
  seed?: number;
  masts?: number;
  sails?: 'petalFan' | 'squareRig' | 'none';
  gunRows?: 1 | 2;
  traits: string[];
  paletteHints: string[];
}

export interface ParsedText {
  build: ParsedBuild;
  notes: string[];
}

const FACTION_STEMS: [string, string[]][] = [
  ['league', ['лиг', 'league', 'гондол']],
  ['empire', ['импер', 'empire', 'клин']],
  ['ork', ['орк', 'ork', 'орч']],
  ['goblin', ['гоблин', 'goblin', 'гобл']],
  ['neutral', ['нейтрал', 'neutral', 'транспорт', 'граждан']],
];

const CLASS_STEMS: [string, string[]][] = [
  ['sloop', ['шлюп', 'посыльн', 'sloop']],
  ['frigate', ['фрегат', 'frigate']],
  ['galleon', ['галеон', 'galleon']],
  ['dreadnought', ['дредноут', 'линкор', 'dread']],
  ['ram', ['таран', 'ram ']],
  ['crab', ['краб', 'crab']],
];

const PALETTE_HINTS: [string, string[]][] = [
  ['red', ['алый', 'багров', 'красн']],
  ['ice', ['ледян', 'голуб', 'син']],
  ['gold', ['золот', 'латун', 'янтар']],
  ['acid', ['изумруд', 'зелен', 'кислотн']],
  ['bone', ['костян', 'бел']],
  ['void', ['черн', 'смолян']],
];

const MAST_WORDS: [number, string[]][] = [
  [1, ['одна мачт', 'одну мачт', '1 мачт']],
  [2, ['две мачт', 'двух мачт', '2 мачт']],
  [3, ['три мачт', 'трех мачт', '3 мачт']],
  [4, ['четыре мачт', '4 мачт']],
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

function firstStem(haystack: string, table: [string, string[]][]): string | undefined {
  for (const [value, stems] of table) {
    if (stems.some((stem) => haystack.includes(stem))) return value;
  }
  return undefined;
}

export function parseShipText(text: string): ParsedText {
  const build: ParsedBuild = { traits: [], paletteHints: [] };
  const notes: string[] = [];
  const haystack = normalize(text);
  if (!haystack) return { build, notes: ['описание пустое — берём фракцию и класс по умолчанию'] };

  const faction = firstStem(haystack, FACTION_STEMS);
  if (faction) {
    build.faction = faction;
    notes.push(`фракция: ${faction}`);
  }

  const classId = firstStem(haystack, CLASS_STEMS);
  if (classId) {
    build.classId = classId;
    notes.push(`класс: ${classId}`);
  }

  const seedMatch = haystack.match(/(?:seed|сид)\D{0,3}(\d+)/) ?? haystack.match(/№\s*(\d+)/);
  if (seedMatch) {
    build.seed = Number(seedMatch[1]);
    notes.push(`seed: ${build.seed}`);
  }

  for (const [count, words] of MAST_WORDS) {
    if (words.some((word) => haystack.includes(word))) {
      build.masts = count;
      notes.push(`мачт: ${count}`);
      break;
    }
  }

  if (/без парус|никаких парус|no sails/.test(haystack)) {
    build.sails = 'none';
    notes.push('паруса: убрать');
  } else if (/квадратн|прямы[ех] парус|square/.test(haystack)) {
    build.sails = 'squareRig';
    notes.push('паруса: прямые');
  } else if (/лепестк|веер|petal/.test(haystack)) {
    build.sails = 'petalFan';
    notes.push('паруса: лепестковые');
  }

  if (/две башн|два ярус|двухъярус|2 ярус/.test(haystack)) {
    build.gunRows = 2;
    notes.push('орудия: два яруса');
  } else if (/одна батаре|один ярус|one row/.test(haystack)) {
    build.gunRows = 1;
    notes.push('орудия: один ярус');
  }

  for (const trait of ['быстр', 'скорост', 'тяжел', 'брон', 'маневр', 'тих'] as const) {
    if (haystack.includes(trait)) build.traits.push(trait);
  }

  const palette = firstStem(haystack, PALETTE_HINTS);
  if (palette) {
    build.paletteHints.push(palette);
    notes.push(`краска: ${palette}`);
  }

  if (notes.length === 0) notes.push('ничего не распознано — параметры останутся по умолчанию');
  return { build, notes };
}
