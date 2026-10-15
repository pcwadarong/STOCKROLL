import { closestEntry } from '@/shared/lib/closest-match';
import { isPlainNumber, onScale, scaleText } from '@/shared/lib/field-value';

import { KOREAN_LABELS, KOREAN_PARTICLES, KOREAN_SIMULATIONS, KOREAN_WORDS } from './paste-korean';
import type { RecipeSettings } from './recipe';
import {
  FUJI_RANGES,
  type FUJI_SIMULATIONS,
  type FUJI_WHITE_BALANCES,
  type RecipeSystem,
  writtenLabels,
} from './systems';

/**
 * Something about a filled-in field that needs a second look. Flags are always reported, so
 * nothing guessed or doubtful is saved unseen.
 */
export type PasteFlag = {
  /** Field the flag is about. */
  key: string;
  /**
   * `value`: the value was a misspelling and the nearest known word was filled in.
   * `label`: the setting's name was misspelled; the value itself is as written.
   * `range`: the value is a number outside what the camera usually accepts; kept as written.
   * `number`: the value is not a number but would be with a letter read as a digit ("-l" for
   *   "-1"), as happens when text is lifted off a screenshot; kept as written.
   * `repeat`: the text gave this setting again with another value; the first was kept.
   */
  kind: 'value' | 'label' | 'range' | 'number' | 'repeat';
  /**
   * The pasted text the flag is about: the misspelling, or the other value given. For `range`,
   * the usual range; for `number`, the number it may stand for.
   */
  from: string;
  /** What is in the field. */
  to: string;
};

/** What a pasted recipe text yielded. */
export type ParsedRecipeText = {
  /** Settings found in the text, keyed like the system's fields. Nothing is filled in beyond it. */
  settings: RecipeSettings;
  /** What the user should check among them, in the order the fields were filled. */
  flags: PasteFlag[];
  /** Lines that named no known setting, so the user can see what was left out. */
  unread: string[];
};

/** Stores a value. `guessedFrom` is the pasted text when the value was guessed from a misspelling. */
type Put = (key: string, value: string, guessedFrom?: string) => void;
/** Reads a value into fields. May return a part of it that it had no use for, to be reported. */
type Sink = (value: string, put: Put) => string | void;
type Reader = {
  labels: readonly string[];
  read: Sink;
  /**
   * The value is free text, so anything after the name would be taken. Without a colon such a
   * name counts only when what follows looks like a value — "Noise -4", not "Noise is fine".
   */
  free?: boolean;
};

// Hangul syllables, written as escapes so Korean stays in `paste-korean.ts` alone.
const HANGUL = '\\uac00-\\ud7a3';
const LETTER = `a-z${HANGUL}`;
const NOT_WORD = new RegExp(`[^a-z0-9${HANGUL}]+`, 'gi');

const squash = (value: string) => value.toLowerCase().replace(NOT_WORD, '');

/** Trims separators a value picks up from the text around it. */
const tidy = (value: string) =>
  value
    .replace(/^[\s:=,;|·/&]+/, '')
    .replace(/[\s,;|·/&]+$/, '')
    .trim();

/**
 * Writes a number the plain way: "+ 3" as "+3", "-1,5" as "-1.5". Only the notation changes;
 * anything that is not wholly a number comes back untouched.
 */
const plainNumber = (text: string) =>
  /^[+-]?\s*\d+([.,]\d+)?$/.test(text) ? text.replace(/\s+/g, '').replace(',', '.') : text;

const raw =
  (key: string): Sink =>
  (value, put) => {
    const text = plainNumber(tidy(value));
    if (text) put(key, text);
  };

/** Known spellings, squashed, each pointing at the value the form uses. */
type Words = ReadonlyMap<string, string>;

const wordsOf = (...lists: Readonly<Record<string, readonly string[]>>[]): Words =>
  new Map(
    lists.flatMap(list =>
      Object.entries(list).flatMap(([value, spellings]) =>
        [value, ...spellings].map(spelling => [squash(spelling), value] as const),
      ),
    ),
  );

type Found = { value: string; guessed: boolean };

/**
 * Looks text up among known spellings: exactly first, then as a misspelling. Only Latin text is
 * guessed at — edit distance means little across Hangul syllables.
 */
const lookUp = (text: string, words: Words): Found | undefined => {
  const key = squash(text);
  const exact = words.get(key);
  if (exact) return { value: exact, guessed: false };
  if (!/^[a-z0-9]+$/.test(key)) return undefined;
  const near = closestEntry(
    key,
    [...words].filter(([spelling]) => /^[a-z0-9]+$/.test(spelling)),
  );
  return near ? { value: near, guessed: true } : undefined;
};

/** Finds a known word among the words of a value, preferring one that is spelled right. */
/**
 * Finds a known word among the words of a value. A word spelled right wins; then a word that
 * means the same in other terms ("Low" for Weak), which counts as a guess; then a misspelling.
 */
const findWord = (value: string, words: Words, alike?: Words) => {
  const tokens = value.split(NOT_WORD).filter(Boolean);
  const found = tokens.map(token => ({ token, ...lookUp(token, words) }));
  const similar = tokens.flatMap(token => {
    const meaning = alike?.get(squash(token));
    return meaning ? [{ token, value: meaning, guessed: true }] : [];
  });
  return (
    found.find(item => item.value && !item.guessed) ??
    similar[0] ??
    found.find(item => item.value !== undefined)
  );
};

/**
 * Reads a value into fields that are each picked from a short list, and hands back the words it
 * had no use for — "Strong, Tiny" fills the strength and reports "Tiny", instead of the size the
 * form cannot hold being dropped without a word.
 */
const picked =
  (...fields: readonly (readonly [key: string, words: Words, alike?: Words])[]): Sink =>
  (value, put) => {
    const used = fields.flatMap(([key, words, alike]) => {
      const found = findWord(value, words, alike);
      if (!found?.value) return [];
      put(key, found.value, found.guessed ? found.token : undefined);
      return [found.token];
    });
    // Nothing recognized: the caller reports the whole setting, name included.
    if (used.length === 0) return undefined;
    return value
      .split(NOT_WORD)
      .filter(token => token && !used.includes(token))
      .join(' ');
  };

// Spellings recipes use for each film simulation.
const SIMULATION_ALIASES: Record<(typeof FUJI_SIMULATIONS)[number], readonly string[]> = {
  'PROVIA / Standard': ['provia', 'provia standard', 'standard'],
  'Velvia / Vivid': ['velvia', 'velvia vivid', 'vivid'],
  'ASTIA / Soft': ['astia', 'astia soft', 'soft'],
  'Classic Chrome': [],
  'REALA ACE': ['reala'],
  'PRO Neg. Hi': ['pro negative hi', 'pro neg h'],
  'PRO Neg. Std': ['pro neg standard', 'pro negative std', 'pro negative standard'],
  'Classic Neg.': ['classic negative'],
  'Nostalgic Neg.': ['nostalgic negative'],
  'ETERNA / Cinema': ['eterna', 'eterna cinema'],
  'ETERNA Bleach Bypass': ['bleach bypass'],
  ACROS: [],
  'ACROS + Ye': ['acros yellow', 'acros ye filter'],
  'ACROS + R': ['acros red', 'acros r filter'],
  'ACROS + G': ['acros green', 'acros g filter'],
  Monochrome: [],
  Sepia: [],
};

const SIMULATIONS = wordsOf(SIMULATION_ALIASES, KOREAN_SIMULATIONS);
const LEVELS = wordsOf(
  { Off: ['none', 'no', 'disabled'], Weak: [], Strong: [] },
  KOREAN_WORDS.level,
);
const SIZES = wordsOf({ Small: [], Large: [] }, KOREAN_WORDS.size);
// Other words people use for the same steps. The camera does not say "Low", so reading it as
// Weak is a guess and is flagged as one.
const LEVELS_ALIKE = wordsOf({ Weak: ['low', 'mild', 'light'], Strong: ['high', 'heavy'] });
const SIZES_ALIKE = wordsOf({ Small: ['fine'], Large: ['big', 'coarse', 'rough'] });
// A dynamic range written on a line of its own has to say "DR": a bare "400" could be anything.
const BARE_RANGES = wordsOf({ DR100: [], DR200: [], DR400: [], Auto: ['dr auto'] });
const RANGES = wordsOf(
  {
    DR100: ['100'],
    DR200: ['200'],
    DR400: ['400'],
    Auto: ['dr auto', ...KOREAN_WORDS.whiteBalance.Auto],
  },
  // Under its label, "400%" and "DR 400" are plainly the same setting.
);
// White balance presets as Fujifilm's manuals list them. Only used to tidy and to catch
// misspellings: a value that is none of these (a Kelvin figure, a custom setting) stays as written.
const WHITE_BALANCE_ALIASES: Record<(typeof FUJI_WHITE_BALANCES)[number], readonly string[]> = {
  Auto: ['awb', 'auto wb'],
  'Auto White Priority': ['white priority', 'auto white'],
  'Auto Ambience Priority': ['ambience priority', 'auto ambience'],
  Daylight: ['sunlight', 'direct sunlight'],
  Shade: [],
  'Fluorescent 1': ['fluorescent light 1'],
  'Fluorescent 2': ['fluorescent light 2'],
  'Fluorescent 3': ['fluorescent light 3'],
  Incandescent: ['tungsten'],
  Underwater: [],
};
const WHITE_BALANCES = wordsOf(WHITE_BALANCE_ALIASES, KOREAN_WORDS.whiteBalance);

/**
 * Finds the film simulation a piece of text names, by its usual spellings.
 * @param value text such as "Classic Negative" or "CLASSIC Neg."
 * @returns the simulation as the form lists it, or undefined when the text names none exactly
 */
export const matchSimulation = (value: string) => SIMULATIONS.get(squash(value));

// "R+3", "R: +3", "+3 Red", "Red +3". A bare number is not taken for a shift.
const NUMBER = '([+-]?\\s*\\d+)';
const shiftPattern = (...names: readonly string[]) => {
  const name = `(?:${names.join('|')})`;
  return new RegExp(
    `(?<![a-z])${name}\\s*[:=]?\\s*${NUMBER}(?!\\d)|${NUMBER}\\s*${name}(?![a-z])`,
    'i',
  );
};
const RED = shiftPattern('red', 'r', ...KOREAN_WORDS.red);
const BLUE = shiftPattern('blue', 'b', ...KOREAN_WORDS.blue);

/** Pulls the R and B shift out of a value and returns what is left of it. */
const takeShift = (value: string, put: Put) => {
  let rest = value;
  for (const [pattern, key] of [
    [RED, 'wbShiftR'],
    [BLUE, 'wbShiftB'],
  ] as const) {
    const match = rest.match(pattern);
    if (!match) continue;
    put(key, (match[1] ?? match[2])!.replace(/\s+/g, ''));
    rest = rest.replace(match[0], ' ');
  }
  return rest;
};

const FUJI_READERS: readonly Reader[] = [
  {
    labels: [
      'film simulation',
      'film sim',
      'simulation',
      'film',
      'sim',
      ...KOREAN_LABELS.simulation,
    ],
    read: (value, put) => {
      const found = lookUp(value, SIMULATIONS);
      if (found) return put('simulation', found.value, found.guessed ? tidy(value) : undefined);
      // "Classic Chrome (base look)": the name may be followed by a remark. The longest
      // opening that is a simulation, spelled right, is taken and the remark handed back.
      const words = tidy(value).split(/\s+/);
      for (let count = words.length - 1; count > 0; count--) {
        const name = matchSimulation(words.slice(0, count).join(' '));
        if (!name) continue;
        put('simulation', name);
        return words.slice(count).join(' ');
      }
    },
  },
  {
    labels: ['grain effect', 'grain', ...KOREAN_LABELS.grain],
    read: picked(['grainStrength', LEVELS, LEVELS_ALIKE], ['grainSize', SIZES, SIZES_ALIKE]),
  },
  {
    labels: ['grain size', 'grain roughness', ...KOREAN_LABELS.grainSize],
    read: picked(['grainSize', SIZES, SIZES_ALIKE]),
  },
  {
    labels: [
      'color chrome fx blue',
      'color chrome effect blue',
      'color chrome blue',
      'cc fx blue',
      'cc blue',
      'ccfx blue',
      'ccfx',
      'fx blue',
      ...KOREAN_LABELS.colorChromeFxBlue,
    ],
    read: picked(['colorChromeFxBlue', LEVELS, LEVELS_ALIKE]),
  },
  {
    labels: [
      'color chrome effect',
      'color chrome',
      'cc effect',
      'cce',
      ...KOREAN_LABELS.colorChrome,
    ],
    read: picked(['colorChrome', LEVELS, LEVELS_ALIKE]),
  },
  {
    labels: ['white balance', 'wb', ...KOREAN_LABELS.whiteBalance],
    free: true,
    read: (value, put) => {
      const rest = tidy(takeShift(value, put));
      const found = lookUp(rest, WHITE_BALANCES);
      if (found) put('whiteBalance', found.value, found.guessed ? rest : undefined);
      else raw('whiteBalance')(rest, put);
    },
  },
  { labels: ['wb shift red', 'wb shift r'], free: true, read: raw('wbShiftR') },
  { labels: ['wb shift blue', 'wb shift b'], free: true, read: raw('wbShiftB') },
  {
    labels: ['wb shift', 'white balance shift', ...KOREAN_LABELS.wbShift],
    read: (value, put) => void takeShift(value, put),
  },
  {
    labels: ['dynamic range', ...KOREAN_LABELS.dynamicRange],
    read: (value, put) => {
      const found = lookUp(value, RANGES);
      // Anything else ("DR-P weak", a note) is kept as written rather than forced into a range.
      if (found) put('dynamicRange', found.value, found.guessed ? tidy(value) : undefined);
      else raw('dynamicRange')(value, put);
    },
  },
  {
    // The abbreviation, as in "DR: 400" or "DR400". Unlike the full name it takes nothing but a
    // range: "DR-P" and the like are other settings.
    labels: ['dr'],
    read: (value, put) => {
      const written = `DR${tidy(value)}`;
      const found = lookUp(value, RANGES) ?? lookUp(written, BARE_RANGES);
      if (found) put('dynamicRange', found.value, found.guessed ? written : undefined);
    },
  },
  {
    labels: ['d range priority', 'd-range priority', 'tone curve', ...KOREAN_LABELS.toneCurve],
    free: true,
    read: (value, put) => {
      // "Tone curve: H-1 S+2" is the older menu's way of writing highlight and shadow.
      const highlight = value.match(/(?<![a-z])h\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)/i);
      const shadow = value.match(/(?<![a-z])s\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)/i);
      if (highlight) put('highlight', highlight[1]!);
      if (shadow) put('shadow', shadow[1]!);
      if (!highlight && !shadow) raw('toneCurve')(value, put);
    },
  },
  {
    labels: ['highlight tone', 'highlights', 'highlight', 'hl', ...KOREAN_LABELS.highlight],
    free: true,
    read: raw('highlight'),
  },
  {
    labels: ['shadow tone', 'shadows', 'shadow', 'sh', ...KOREAN_LABELS.shadow],
    free: true,
    read: raw('shadow'),
  },
  {
    labels: ['monochromatic color', ...KOREAN_LABELS.monochromeColor],
    free: true,
    read: raw('monochromeColor'),
  },
  { labels: ['color', 'colour', ...KOREAN_LABELS.color], free: true, read: raw('color') },
  {
    labels: ['sharpness', 'sharpening', 'sharp', ...KOREAN_LABELS.sharpness],
    free: true,
    read: raw('sharpness'),
  },
  {
    labels: [
      'high iso nr',
      'high iso noise reduction',
      'noise reduction',
      'nr',
      'noise',
      ...KOREAN_LABELS.noiseReduction,
    ],
    free: true,
    read: raw('noiseReduction'),
  },
  { labels: ['clarity', ...KOREAN_LABELS.clarity], free: true, read: raw('clarity') },
  {
    labels: [
      'exposure compensation',
      'exp. comp',
      'exp comp',
      'exposure',
      'ev',
      ...KOREAN_LABELS.exposureCompensation,
    ],
    free: true,
    read: raw('exposureCompensation'),
  },
  { labels: ['custom slot', 'custom setting'], free: true, read: raw('customSlot') },
];

// Other systems are read by their own field labels only: "Saturation: +2" lands in Saturation.
// The labels are the ones `recipeLines` writes, so two fields never answer to the same name.
const genericReaders = (system: RecipeSystem): Reader[] =>
  Object.entries(writtenLabels(system)).map(([key, label]) => ({
    labels: [label.toLowerCase()],
    read: raw(key),
  }));

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildMatcher = (readers: readonly Reader[]) => {
  const byLabel = new Map(
    readers.flatMap(reader => reader.labels.map(label => [squash(label), reader] as const)),
  );
  // Longest first, so "Color Chrome FX Blue" is not read as "Color".
  const alternatives = readers
    .flatMap(reader => reader.labels)
    .sort((a, b) => b.length - a.length)
    // Pasted dashes are flattened to hyphens before matching, so a label's own dash is too.
    .map(label => escape(label).replace(/[\s\-–—]+/g, '[\\s-]*'));
  // A Korean label may be followed by a particle, so only Latin letters end a match early.
  const pattern = new RegExp(`(?<![${LETTER}])(?:${alternatives.join('|')})(?![a-z])`, 'gi');
  return { byLabel, pattern };
};

// "R: +3" and "H: -1" are parts of a white balance or tone curve value, not settings of their own.
const VALUE_PARTS = new RegExp(
  `^(r|b|red|blue|h|s|${[...KOREAN_WORDS.red, ...KOREAN_WORDS.blue].join('|')})$`,
  'i',
);
// A run of words followed by a colon: what a setting's name looks like, known or not.
const NAMED_PART = new RegExp(`(^|\\s)([${LETTER}][${LETTER} .-]*?)(\\s*[:=])`, 'gi');

/**
 * Cuts a value where a setting this system does not know begins. Known labels already end a
 * value; without this, "Clarity: -2 ISO: 400" would store "-2 ISO: 400" as the clarity.
 * @returns the value proper, and the unknown remainder to report as unread
 */
const splitStray = (segment: string): [value: string, stray: string] => {
  for (const match of segment.matchAll(NAMED_PART)) {
    if (!match[1]) continue;
    const name = match[2]!.trim().split(/\s+/).at(-1)!;
    // Something has to come before it: "Label: Auto: note" opens with the value itself.
    if (VALUE_PARTS.test(name) || !tidy(segment.slice(0, match.index))) continue;
    return [segment.slice(0, match.index), tidy(segment.slice(match.index))];
  }
  return [segment, ''];
};

// What a value looks like when no colon says where the name ends.
const VALUE_START = /^([+-]?\s*\d|(off|weak|strong|small|large|auto|dr)(?![a-z]))/i;
/** Most words a setting name has. */
const NAME_WORDS = 5;

/** The colon-less case of `fixLabels`: a misspelled name at the head of the line. */
const fixHead = (
  line: string,
  byLabel: ReadonlyMap<string, Reader>,
  firstLabel: ReadonlyMap<Reader, string>,
  fixed: Map<string, string>,
) => {
  const words = line.split(/\s+/);
  const heads = Array.from({ length: Math.min(NAME_WORDS, words.length - 1) }, (_, index) => ({
    name: words.slice(0, index + 1).join(' '),
    rest: words.slice(index + 1).join(' '),
  })).reverse();
  // A line that already opens with a known name needs no fixing.
  if (heads.some(({ name }) => byLabel.has(squash(name)))) return line;
  for (const { name, rest } of heads) {
    const key = squash(name);
    if (!/^[a-z0-9]+$/.test(key) || !VALUE_START.test(rest)) continue;
    const reader = closestEntry(key, byLabel);
    if (!reader) continue;
    const label = firstLabel.get(reader)!;
    fixed.set(label, name);
    return `${label} ${rest}`;
  }
  return line;
};

/**
 * Rewrites misspelled setting names in a line to the names the reader knows, so
 * "Hightlight: -1" is read as Highlight. A name is looked at when a colon follows it, or when it
 * opens the line and a value plainly follows ("Hightlight -1").
 * @returns the line with known names, and which of them were rewritten from what
 */
const fixLabels = (line: string, byLabel: ReadonlyMap<string, Reader>) => {
  const fixed = new Map<string, string>();
  const firstLabel = new Map([...byLabel].reverse().map(([label, reader]) => [reader, label]));
  const text = line.replace(NAMED_PART, (whole, lead: string, name: string, colon: string) => {
    const words = name.trim().split(/\s+/);
    if (VALUE_PARTS.test(words.at(-1)!)) return whole;
    // "…Small Colr: +3": the name may trail words of the value before it, so the longest
    // ending that is a name wins.
    for (let start = 0; start < words.length; start++) {
      const candidate = words.slice(start).join(' ');
      const key = squash(candidate);
      if (byLabel.has(key)) return whole;
      if (!/^[a-z0-9]+$/.test(key)) continue;
      const reader = closestEntry(key, byLabel);
      if (!reader) continue;
      const label = firstLabel.get(reader)!;
      fixed.set(label, candidate);
      return `${lead}${[...words.slice(0, start), label].join(' ')}${colon}`;
    }
    return whole;
  });
  return { text: fixed.size > 0 ? text : fixHead(text, byLabel, firstLabel, fixed), fixed };
};

/**
 * Tells what number a value may stand for when letters that look like digits are read as digits:
 * "-l" as "-1", "+O" as "+0". Text lifted off a screenshot makes these swaps.
 */
const misreadNumber = (key: string, value: string) => {
  if (!FUJI_RANGES[key] || isPlainNumber(value)) return undefined;
  const digits = value.replace(/[lI|]/g, '1').replace(/[oO]/g, '0');
  return isPlainNumber(digits) ? digits : undefined;
};

/**
 * Tells whether a value is a plain number off the form's slider for it: outside the range or off
 * a step. The same test decides that the form shows such a value as text.
 */
const outOfRange = (key: string, value: string) => {
  const range = FUJI_RANGES[key];
  if (!range || !isPlainNumber(value)) return undefined;
  return onScale(Number(value), range) ? undefined : scaleText(range);
};

/** Tells whether the text after a colon-less name reads as a value rather than as prose. */
const looksLikeValue = (text: string) =>
  VALUE_START.test(text.trim()) || lookUp(text, WHITE_BALANCES)?.guessed === false;

// A Korean name may carry a particle, as nouns do in a sentence. It counts as one only when it
// ends the word, so the first syllable of a following word is not mistaken for it.
const PARTICLE = new RegExp(`^(${KOREAN_PARTICLES.join('|')})(?=[\\s:=]|$)`);
const ENDS_IN_HANGUL = new RegExp(`[${HANGUL}]$`);

/** Where a setting's value begins: after its name, and after a particle on a Korean name. */
const valueStart = (line: string, match: RegExpMatchArray) => {
  const end = match.index! + match[0].length;
  const particle = ENDS_IN_HANGUL.test(match[0]) ? line.slice(end).match(PARTICLE) : null;
  return end + (particle?.[0].length ?? 0);
};

/** Longest a line of its own may be and still be guessed at; anything longer is prose. */
const BARE_GUESS_LENGTH = 24;

/**
 * Reads camera settings out of pasted text: a recipe copied from a post, a message, or the text
 * iOS lifts off a screenshot. Each `Label: value` is put into the matching field, several per
 * line included. A setting the text does not mention stays absent, and a value the form could
 * not hold (an unknown film simulation) is left unread.
 *
 * Misspellings of a known name or value ("Hightlight", "da40" for DR400) are filled in as the
 * nearest known word when exactly one is near. Numbers and free text are never corrected: a
 * number outside the usual range is kept and flagged, and when a setting is given twice with
 * different values the first is kept and the other flagged. Everything of the kind is returned
 * in `flags` — the caller must show them.
 *
 * Fujifilm is read by the spellings recipes commonly use, in English and Korean; other systems
 * by their field labels.
 * @param system camera system whose fields the text is read into
 * @param text pasted text
 * @returns the settings found, what to check among them, and the lines that named none
 */
export const parseRecipeText = (system: RecipeSystem, text: string): ParsedRecipeText => {
  const { byLabel, pattern } = buildMatcher(
    system === 'fujifilm' ? FUJI_READERS : genericReaders(system),
  );
  const settings: RecipeSettings = {};
  const guessed = new Map<string, PasteFlag>();
  const repeated = new Map<string, PasteFlag>();
  const unread: string[] = [];
  let writes = 0;

  const store = (key: string, value: string, guess?: Pick<PasteFlag, 'kind' | 'from'>) => {
    writes++;
    const current = settings[key];
    // The first value stated outright stands. It replaces an earlier guess; a later guess does
    // not replace it; and a later, different statement — a second recipe in the same text, most
    // often — is reported instead of silently winning.
    if (current !== undefined && !guessed.has(key)) {
      if (!guess && current !== value && !repeated.has(key))
        repeated.set(key, { key, kind: 'repeat', from: value, to: current });
      return;
    }
    if (current !== undefined && guess) return;
    settings[key] = value;
    if (guess) guessed.set(key, { key, to: value, ...guess });
    else guessed.delete(key);
  };
  const valuePut: Put = (key, value, from) =>
    store(key, value, from ? { kind: 'value', from } : undefined);

  const lines = text
    // Full-width digits, signs and colons become their plain forms.
    .normalize('NFKC')
    .replace(/[−–—]/g, '-')
    .split(/\r?\n/)
    .map(line => line.replace(/^[\s•·*\->]+/, '').trim())
    .filter(Boolean);

  for (const original of lines) {
    const before = writes;
    const { text: line, fixed } = fixLabels(original, byLabel);
    // A label counts when it opens the line or is followed by a colon. A label word in the
    // middle of a sentence ("the color is muted") names no setting.
    const labels = [...line.matchAll(pattern)].filter(match => {
      const after = line.slice(valueStart(line, match));
      if (/^\s*[:=]/.test(after)) return true;
      if (match.index !== 0) return false;
      return !byLabel.get(squash(match[0]))?.free || looksLikeValue(after);
    });

    const strays: string[] = [];
    labels.forEach((match, index) => {
      const start = valueStart(line, match);
      const end = labels[index + 1]?.index ?? line.length;
      const [value, stray] = splitStray(line.slice(start, end));
      const label = squash(match[0]);
      const misspelled = fixed.get(label);
      const writesBefore = writes;
      const unused = byLabel
        .get(label)
        ?.read(
          value,
          misspelled
            ? (key, found) => store(key, found, { kind: 'label', from: misspelled })
            : valuePut,
        );
      // A setting that was named but whose value could not be used is reported with its name,
      // so it is not lost just because another setting on the line was read.
      if (writes === writesBefore) strays.push(tidy(line.slice(match.index, start) + value));
      else if (unused) strays.push(unused);
      if (stray) strays.push(stray);
    });

    if (system === 'fujifilm' && labels.length === 0) {
      // Recipes often give the simulation and the dynamic range on lines of their own.
      const candidates = [
        { key: 'simulation', found: lookUp(line, SIMULATIONS) },
        { key: 'dynamicRange', found: lookUp(line, BARE_RANGES) },
      ].flatMap(({ key, found }) => (found ? [{ key, ...found }] : []));
      const stated = candidates.find(candidate => !candidate.guessed);
      const guessable = line.length <= BARE_GUESS_LENGTH && candidates.length === 1;
      const choice = stated ?? (guessable ? candidates[0] : undefined);
      // The first simulation named wins, unless that one was only a guess.
      const taken = choice?.key === 'simulation' && settings.simulation !== undefined;
      if (choice && (!taken || (!choice.guessed && guessed.has('simulation'))))
        valuePut(choice.key, choice.value, choice.guessed ? line : undefined);
    }

    if (writes === before) unread.push(original);
    else unread.push(...strays);
  }

  const ranged =
    system === 'fujifilm'
      ? Object.entries(settings).flatMap(([key, value]): PasteFlag[] => {
          const usual = outOfRange(key, value);
          const digits = misreadNumber(key, value);
          if (usual) return [{ key, kind: 'range', from: usual, to: value }];
          return digits ? [{ key, kind: 'number', from: digits, to: value }] : [];
        })
      : [];
  // In the order the fields were filled, so the list reads like the form.
  const order = Object.keys(settings);
  const flags = [...guessed.values(), ...ranged, ...repeated.values()].sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
  );
  return { settings, flags, unread };
};
