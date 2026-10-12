import type { RecipeSettings } from './recipe';
import { type FUJI_SIMULATIONS, type RecipeSystem, writtenLabels } from './systems';

/** What a pasted recipe text yielded. */
export type ParsedRecipeText = {
  /** Settings found in the text, keyed like the system's fields. Nothing is filled in beyond it. */
  settings: RecipeSettings;
  /** Lines that named no known setting, so the user can see what was left out. */
  unread: string[];
};

type Sink = (value: string, out: RecipeSettings) => void;
type Reader = { labels: readonly string[]; read: Sink };

const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Trims separators a value picks up from the text around it. */
const tidy = (value: string) =>
  value
    .replace(/^[\s:=,;|·/&]+/, '')
    .replace(/[\s,;|·/&]+$/, '')
    .trim();

const put =
  (key: string): Sink =>
  (value, out) => {
    const text = tidy(value);
    if (text) out[key] = text;
  };

// Spellings recipes use for each film simulation, squashed to letters and digits.
const SIMULATION_ALIASES: Record<(typeof FUJI_SIMULATIONS)[number], readonly string[]> = {
  'PROVIA / Standard': ['provia', 'proviastandard', 'standard'],
  'Velvia / Vivid': ['velvia', 'velviavivid', 'vivid'],
  'ASTIA / Soft': ['astia', 'astiasoft', 'soft'],
  'Classic Chrome': ['classicchrome'],
  'REALA ACE': ['realaace', 'reala'],
  'PRO Neg. Hi': ['proneghi', 'pronegativehi', 'pronegh'],
  'PRO Neg. Std': ['pronegstd', 'pronegstandard', 'pronegativestd', 'pronegativestandard'],
  'Classic Neg.': ['classicneg', 'classicnegative'],
  'Nostalgic Neg.': ['nostalgicneg', 'nostalgicnegative'],
  'ETERNA / Cinema': ['eterna', 'eternacinema'],
  'ETERNA Bleach Bypass': ['eternableachbypass', 'bleachbypass'],
  ACROS: ['acros'],
  'ACROS + Ye': ['acrosye', 'acrosyellow', 'acrosyefilter'],
  'ACROS + R': ['acrosr', 'acrosred', 'acrosrfilter'],
  'ACROS + G': ['acrosg', 'acrosgreen', 'acrosgfilter'],
  Monochrome: ['monochrome'],
  Sepia: ['sepia'],
};

const SIMULATION_BY_ALIAS = new Map(
  Object.entries(SIMULATION_ALIASES).flatMap(([name, aliases]) =>
    [squash(name), ...aliases].map(alias => [alias, name] as const),
  ),
);

/**
 * Finds the film simulation a piece of text names, by its usual spellings.
 * @param value text such as "Classic Negative" or "CLASSIC Neg."
 * @returns the simulation as the form lists it, or undefined when the text names none
 */
export const matchSimulation = (value: string) => SIMULATION_BY_ALIAS.get(squash(value));

const LEVEL_WORDS: readonly (readonly [RegExp, string])[] = [
  [/\b(off)\b/i, 'Off'],
  [/\b(weak)\b/i, 'Weak'],
  [/\b(strong)\b/i, 'Strong'],
];
const SIZE_WORDS: readonly (readonly [RegExp, string])[] = [
  [/\b(small)\b/i, 'Small'],
  [/\b(large)\b/i, 'Large'],
];

const wordIn = (value: string, words: readonly (readonly [RegExp, string])[]) =>
  words.find(([pattern]) => pattern.test(value))?.[1];

const level =
  (key: string): Sink =>
  (value, out) => {
    const found = wordIn(value, LEVEL_WORDS);
    if (found) out[key] = found;
  };

// "R+3", "R: +3", "+3 Red", "Red +3". A bare number is not taken for a shift.
const NUMBER = '([+-]?\\d+)';
const shiftPattern = (letter: string, word: string) =>
  new RegExp(
    `(?<![a-z])(?:${word}|${letter})\\s*[:=]?\\s*${NUMBER}(?!\\d)|${NUMBER}\\s*(?:${word}|${letter})(?![a-z])`,
    'i',
  );
const RED = shiftPattern('r', 'red');
const BLUE = shiftPattern('b', 'blue');

/** Pulls the R and B shift out of a value and returns what is left of it. */
const takeShift = (value: string, out: RecipeSettings) => {
  let rest = value;
  for (const [pattern, key] of [
    [RED, 'wbShiftR'],
    [BLUE, 'wbShiftB'],
  ] as const) {
    const match = rest.match(pattern);
    if (!match) continue;
    out[key] = (match[1] ?? match[2])!;
    rest = rest.replace(match[0], ' ');
  }
  return rest;
};

const FUJI_READERS: readonly Reader[] = [
  {
    labels: ['film simulation', 'film sim', 'simulation'],
    read: (value, out) => {
      const found = matchSimulation(value);
      if (found) out.simulation = found;
    },
  },
  {
    labels: ['grain effect', 'grain'],
    read: (value, out) => {
      const strength = wordIn(value, LEVEL_WORDS);
      const size = wordIn(value, SIZE_WORDS);
      if (strength) out.grainStrength = strength;
      if (size) out.grainSize = size;
    },
  },
  {
    labels: ['grain size', 'grain roughness'],
    read: (value, out) => {
      const size = wordIn(value, SIZE_WORDS);
      if (size) out.grainSize = size;
    },
  },
  {
    labels: ['color chrome fx blue', 'color chrome effect blue', 'color chrome blue', 'cc fx blue'],
    read: level('colorChromeFxBlue'),
  },
  {
    labels: ['color chrome effect', 'color chrome'],
    read: level('colorChrome'),
  },
  {
    labels: ['white balance', 'wb'],
    read: (value, out) => put('whiteBalance')(takeShift(value, out), out),
  },
  { labels: ['wb shift red', 'wb shift r'], read: put('wbShiftR') },
  { labels: ['wb shift blue', 'wb shift b'], read: put('wbShiftB') },
  {
    labels: ['wb shift', 'white balance shift'],
    read: (value, out) => void takeShift(value, out),
  },
  {
    labels: ['dynamic range'],
    read: put('dynamicRange'),
  },
  {
    labels: ['d range priority', 'd-range priority', 'tone curve'],
    read: (value, out) => {
      // "Tone curve: H-1 S+2" is the older menu's way of writing highlight and shadow.
      const highlight = value.match(/(?<![a-z])h\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)/i);
      const shadow = value.match(/(?<![a-z])s\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)/i);
      if (highlight) out.highlight = highlight[1]!;
      if (shadow) out.shadow = shadow[1]!;
      if (!highlight && !shadow) put('toneCurve')(value, out);
    },
  },
  {
    labels: ['highlight tone', 'highlights', 'highlight'],
    read: put('highlight'),
  },
  {
    labels: ['shadow tone', 'shadows', 'shadow'],
    read: put('shadow'),
  },
  { labels: ['monochromatic color'], read: put('monochromeColor') },
  { labels: ['color', 'colour'], read: put('color') },
  { labels: ['sharpness', 'sharpening'], read: put('sharpness') },
  {
    labels: ['high iso nr', 'high iso noise reduction', 'noise reduction', 'nr'],
    read: put('noiseReduction'),
  },
  { labels: ['clarity'], read: put('clarity') },
  {
    labels: ['exposure compensation', 'exp. comp', 'exp comp'],
    read: put('exposureCompensation'),
  },
  { labels: ['custom slot', 'custom setting'], read: put('customSlot') },
];

// Other systems are read by their own field labels only: "Saturation: +2" lands in Saturation.
// The labels are the ones `recipeLines` writes, so two fields never answer to the same name.
const genericReaders = (system: RecipeSystem): Reader[] =>
  Object.entries(writtenLabels(system)).map(([key, label]) => ({
    labels: [label.toLowerCase()],
    read: put(key),
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
    .map(label => escape(label).replace(/[\s\-\u2013\u2014]+/g, '[\\s-]*'));
  const pattern = new RegExp(`(?<![a-z])(?:${alternatives.join('|')})(?![a-z])`, 'gi');
  return { byLabel, pattern };
};

// "R: +3" and "H: -1" are parts of a white balance or tone curve value, not settings of their own.
const VALUE_PARTS = /^(r|b|red|blue|h|s)$/i;
const NAMED_PART = /\s+([a-z][a-z .-]*?)\s*[:=]/gi;

/**
 * Cuts a value where a setting this system does not know begins. Known labels already end a
 * value; without this, "Clarity: -2 ISO: 400" would store "-2 ISO: 400" as the clarity.
 * @returns the value proper, and the unknown remainder to report as unread
 */
const splitStray = (segment: string): [value: string, stray: string] => {
  for (const match of segment.matchAll(NAMED_PART)) {
    // Something has to come before it: "Label: Auto: note" opens with the value itself.
    if (VALUE_PARTS.test(match[1]!) || !tidy(segment.slice(0, match.index))) continue;
    return [segment.slice(0, match.index), tidy(segment.slice(match.index))];
  }
  return [segment, ''];
};

/**
 * Reads camera settings out of pasted text: a recipe copied from a post, a message, or the text
 * iOS lifts off a screenshot. Each `Label: value` is put into the matching field, several per
 * line included. Only what the text states is returned — a setting it does not mention stays
 * absent, and a value the form could not hold (an unknown film simulation) is left unread.
 * Fujifilm is read by the spellings recipes commonly use; other systems by their field labels.
 * @param system camera system whose fields the text is read into
 * @param text pasted text
 * @returns the settings found and the lines that named none
 */
export const parseRecipeText = (system: RecipeSystem, text: string): ParsedRecipeText => {
  const { byLabel, pattern } = buildMatcher(
    system === 'fujifilm' ? FUJI_READERS : genericReaders(system),
  );
  const settings: RecipeSettings = {};
  const unread: string[] = [];

  const lines = text
    .replace(/[−–—]/g, '-')
    .replace(/：/g, ':')
    .split(/\r?\n/)
    .map(line => line.replace(/^[\s•·*\->]+/, '').trim())
    .filter(Boolean);

  for (const line of lines) {
    const before = JSON.stringify(settings);
    // A label counts when it opens the line or is followed by a colon. A label word in the
    // middle of a sentence ("the color is muted") names no setting.
    const labels = [...line.matchAll(pattern)].filter(
      match => match.index === 0 || /^\s*[:=]/.test(line.slice(match.index + match[0].length)),
    );

    const strays: string[] = [];
    labels.forEach((match, index) => {
      const start = match.index + match[0].length;
      const end = labels[index + 1]?.index ?? line.length;
      const [value, stray] = splitStray(line.slice(start, end));
      byLabel.get(squash(match[0]))?.read(value, settings);
      if (stray) strays.push(stray);
    });

    if (system === 'fujifilm' && labels.length === 0) {
      // Recipes often give the simulation and the dynamic range on lines of their own.
      const simulation = matchSimulation(line);
      const range = line.match(/^dr[\s-]?(auto|100|200|400)%?$/i);
      if (simulation && !settings.simulation) settings.simulation = simulation;
      else if (range) settings.dynamicRange = /auto/i.test(range[1]!) ? 'Auto' : `DR${range[1]}`;
    }

    if (JSON.stringify(settings) === before) unread.push(line);
    else unread.push(...strays);
  }

  return { settings, unread };
};
