import type { Scale } from '@/shared/lib/field-value';
import type { RecordField } from '@/shared/lib/record-field';

/** Which camera family a recipe is written for. Each has its own set of settings. */
export type RecipeSystem =
  | 'fujifilm'
  | 'ricoh'
  | 'canon'
  | 'nikon'
  | 'sony'
  | 'panasonic'
  | 'olympus'
  | 'iphone'
  | 'galaxy'
  | 'other';

export const FUJI_SIMULATIONS = [
  'PROVIA / Standard',
  'Velvia / Vivid',
  'ASTIA / Soft',
  'Classic Chrome',
  'REALA ACE',
  'PRO Neg. Hi',
  'PRO Neg. Std',
  'Classic Neg.',
  'Nostalgic Neg.',
  'ETERNA / Cinema',
  'ETERNA Bleach Bypass',
  'ACROS',
  'ACROS + Ye',
  'ACROS + R',
  'ACROS + G',
  'Monochrome',
  'Sepia',
] as const;

/**
 * White balance presets as Fujifilm's manuals list them, written the way recipes store them. The
 * form offers these (and the custom settings) to pick from; pasted text is tidied to them.
 */
export const FUJI_WHITE_BALANCES = [
  'Auto',
  'Auto White Priority',
  'Auto Ambience Priority',
  'Daylight',
  'Shade',
  'Fluorescent 1',
  'Fluorescent 2',
  'Fluorescent 3',
  'Incandescent',
  'Underwater',
] as const;

/**
 * The stops of Fujifilm's numeric settings: the form's sliders offer exactly these, and pasted
 * text outside them is pointed out. Bodies and firmware differ, so a value outside them is never
 * rejected or changed — the form keeps it as text and pasting flags it.
 */
export const FUJI_RANGES: Readonly<Record<string, Scale>> = {
  highlight: { min: -2, max: 4, step: 0.5 },
  shadow: { min: -2, max: 4, step: 0.5 },
  color: { min: -4, max: 4, step: 1 },
  sharpness: { min: -4, max: 4, step: 1 },
  noiseReduction: { min: -4, max: 4, step: 1 },
  clarity: { min: -5, max: 5, step: 1 },
  wbShiftR: { min: -9, max: 9, step: 1 },
  wbShiftB: { min: -9, max: 9, step: 1 },
};

type SystemSpec = {
  label: string;
  /** What this system calls a look, used as the field label in the frame editor. */
  lookLabel: string;
  /** Matches camera names that belong to this system. */
  cameraPattern: RegExp | null;
  /** Looks that can be picked without a recipe. Empty when the list is not known for certain. */
  baseLooks: readonly string[];
  fields: readonly RecordField[];
};

const choices = (values: readonly string[]) => values.map(value => ({ value, label: value }));
const LEVELS = choices(['Off', 'Weak', 'Strong']);
/** Puts a run of fields under one heading, so a long settings list reads in sections. */
const grouped = (group: string, fields: readonly RecordField[]): RecordField[] =>
  fields.map(field => ({ ...field, group }));

const text = (key: string, label: string, placeholder?: string): RecordField => ({
  key,
  label,
  type: 'text',
  placeholder,
});

const scale = (key: string, label: string): RecordField => ({
  key,
  label,
  type: 'scale',
  scale: FUJI_RANGES[key],
});

// Field sets mirror each camera's menu. Only the Fujifilm list was checked against a camera, so
// only Fujifilm picks its values the way the camera menu does (segments, sliders); every value is
// still stored as text, and one the control cannot show stays text. The other systems were
// written from memory and keep free text, so a menu that differs by model or firmware can still
// be recorded as shown — correct the labels here if a menu disagrees.
// Order matters for `systemOfCamera`: the first matching pattern wins.
export const SYSTEMS: Record<RecipeSystem, SystemSpec> = {
  fujifilm: {
    label: 'Fujifilm',
    lookLabel: 'Film simulation',
    cameraPattern: /fuji/i,
    baseLooks: FUJI_SIMULATIONS,
    fields: [
      ...grouped('Look', [
        {
          key: 'simulation',
          label: 'Film simulation',
          type: 'select',
          options: FUJI_SIMULATIONS.map(value => ({ value, label: value })),
        },
        // Drawn together as one setting (`FujiGrain`), as the camera's menu shows them.
        {
          key: 'grainStrength',
          label: 'Grain effect — strength',
          type: 'segmented',
          options: LEVELS,
        },
        {
          key: 'grainSize',
          label: 'Grain effect — size',
          type: 'segmented',
          options: choices(['Small', 'Large']),
        },
        { key: 'colorChrome', label: 'Color Chrome Effect', type: 'segmented', options: LEVELS },
        {
          key: 'colorChromeFxBlue',
          label: 'Color Chrome FX Blue',
          type: 'segmented',
          options: LEVELS,
        },
      ]),
      // White balance is a preset or a color temperature (`FujiWhiteBalance`), and the shift is
      // one grid for both axes (`FujiWbShift`).
      ...grouped('White balance', [
        text('whiteBalance', 'White balance', 'Auto, Daylight, 5600K…'),
        scale('wbShiftR', 'WB shift R'),
        scale('wbShiftB', 'WB shift B'),
      ]),
      ...grouped('Tone', [
        {
          key: 'dynamicRange',
          label: 'Dynamic range',
          type: 'segmented',
          options: choices(['Auto', 'DR100', 'DR200', 'DR400']),
        },
        text('toneCurve', 'Tone curve / D-Range Priority', 'DR-P…'),
        scale('highlight', 'Highlight tone'),
        scale('shadow', 'Shadow tone'),
      ]),
      ...grouped('Color and detail', [
        scale('color', 'Color'),
        text('monochromeColor', 'Monochromatic color', 'WC / MG'),
        scale('sharpness', 'Sharpness'),
        scale('noiseReduction', 'High ISO NR'),
        scale('clarity', 'Clarity'),
      ]),
      ...grouped('In the camera', [
        text('exposureCompensation', 'Exposure compensation', '+1/3 EV'),
        text('customSlot', 'Custom slot', 'C1–C7'),
      ]),
    ],
  },
  ricoh: {
    label: 'Ricoh GR',
    lookLabel: 'Image control',
    cameraPattern: /ricoh|\bGR\b|\bGR ?(II|III|IV)/i,
    baseLooks: [],
    fields: [
      text('simulation', 'Image control', 'Positive Film, Negative Film, Hi-Contrast B&W…'),
      text('saturation', 'Saturation', '-4 to +4'),
      text('hue', 'Hue', '-4 to +4'),
      text('highLowKey', 'High/Low key', '-4 to +4'),
      text('contrast', 'Contrast', '-4 to +4'),
      text('contrastHighlight', 'Contrast (highlight)', '-4 to +4'),
      text('contrastShadow', 'Contrast (shadow)', '-4 to +4'),
      text('sharpness', 'Sharpness', '-4 to +4'),
      text('shading', 'Shading', '-4 to +4'),
      text('clarity', 'Clarity', '-4 to +4'),
      text('toning', 'Toning (monotone)'),
      text('filterEffect', 'Filter effect (monotone)'),
      text('grainEffect', 'Grain effect', 'Off, 1, 2, 3'),
      text('whiteBalance', 'White balance', 'Auto, Daylight, CT…'),
      text('wbCompensation', 'WB compensation', 'A/B and G/M'),
      text('exposureCompensation', 'Exposure compensation', '+1/3 EV'),
      text('customSlot', 'User mode', 'U1–U3'),
    ],
  },
  canon: {
    label: 'Canon',
    lookLabel: 'Picture Style',
    cameraPattern: /canon/i,
    baseLooks: [],
    fields: [
      text('simulation', 'Picture Style', 'Standard, Portrait, Landscape, Neutral, Faithful…'),
      text('sharpness', 'Sharpness — strength', '0 to 7'),
      text('sharpnessFineness', 'Sharpness — fineness'),
      text('sharpnessThreshold', 'Sharpness — threshold'),
      text('contrast', 'Contrast', '-4 to +4'),
      text('saturation', 'Saturation', '-4 to +4'),
      text('colorTone', 'Color tone', '-4 to +4'),
      text('filterEffect', 'Filter effect (monochrome)'),
      text('toning', 'Toning effect (monochrome)'),
      text('whiteBalance', 'White balance'),
      text('wbShift', 'WB shift', 'B/A and M/G'),
      text('customSlot', 'Custom mode', 'C1–C3, User Def. 1–3'),
    ],
  },
  nikon: {
    label: 'Nikon',
    lookLabel: 'Picture Control',
    cameraPattern: /nikon/i,
    baseLooks: [],
    fields: [
      text('simulation', 'Picture Control', 'Standard, Neutral, Vivid, Flat, Monochrome…'),
      text('sharpness', 'Sharpening'),
      text('midRangeSharpening', 'Mid-range sharpening'),
      text('clarity', 'Clarity'),
      text('contrast', 'Contrast'),
      text('brightness', 'Brightness'),
      text('saturation', 'Saturation'),
      text('hue', 'Hue'),
      text('filterEffect', 'Filter effects (monochrome)'),
      text('toning', 'Toning (monochrome)'),
      text('whiteBalance', 'White balance'),
      text('customSlot', 'User setting', 'U1–U3'),
    ],
  },
  sony: {
    label: 'Sony',
    lookLabel: 'Creative Look',
    cameraPattern: /sony|ilce-|dsc-/i,
    baseLooks: [],
    fields: [
      text('simulation', 'Creative Look', 'ST, PT, NT, VV, FL, IN, SH, BW, SE'),
      text('contrast', 'Contrast', '-9 to +9'),
      text('highlight', 'Highlights', '-9 to +9'),
      text('shadow', 'Shadows', '-9 to +9'),
      text('fade', 'Fade', '0 to 9'),
      text('saturation', 'Saturation', '-9 to +9'),
      text('sharpness', 'Sharpness', '0 to 9'),
      text('sharpnessRange', 'Sharpness range', '1 to 5'),
      text('clarity', 'Clarity', '0 to 9'),
      text('whiteBalance', 'White balance'),
      text('customSlot', 'Custom look / memory', 'Custom 1–6, MR 1–3'),
    ],
  },
  panasonic: {
    label: 'Panasonic Lumix',
    lookLabel: 'Photo Style',
    cameraPattern: /panasonic|lumix|dc-|dmc-/i,
    baseLooks: [],
    fields: [
      text('simulation', 'Photo Style', 'Standard, Vivid, Natural, L.Classic Neo, L.Monochrome…'),
      text('contrast', 'Contrast'),
      text('highlight', 'Highlight'),
      text('shadow', 'Shadow'),
      text('saturation', 'Saturation'),
      text('hue', 'Hue'),
      text('sharpness', 'Sharpness'),
      text('noiseReduction', 'Noise reduction'),
      text('grainEffect', 'Grain effect'),
      text('whiteBalance', 'White balance'),
      text('customSlot', 'Custom mode', 'C1–C3'),
    ],
  },
  olympus: {
    label: 'OM System / Olympus',
    lookLabel: 'Picture Mode',
    cameraPattern: /olympus|om system|om digital|\bom-\d|e-m\d|pen-f/i,
    baseLooks: [],
    fields: [
      text('simulation', 'Picture Mode', 'Natural, Vivid, Muted, Portrait, Monotone…'),
      text('contrast', 'Contrast'),
      text('sharpness', 'Sharpness'),
      text('saturation', 'Saturation'),
      text('gradation', 'Gradation', 'Auto, Normal, High key, Low key'),
      text('highlightShadow', 'Highlight & shadow control'),
      text('colorCreator', 'Color Creator / Color Profile'),
      text('filterEffect', 'B&W filter (monotone)'),
      text('whiteBalance', 'White balance'),
      text('customSlot', 'Custom mode', 'C1–C4'),
    ],
  },
  iphone: {
    label: 'iPhone',
    lookLabel: 'Photographic style',
    cameraPattern: /iphone|apple/i,
    baseLooks: [],
    fields: [
      text('simulation', 'Photographic style', 'Standard, Amber, Stark B&W…'),
      text('tone', 'Tone', '-100 to +100'),
      text('color', 'Color', '-100 to +100'),
      text('palette', 'Palette', '0 to 100'),
      text('exposureCompensation', 'Exposure compensation'),
      text('format', 'Format', 'HEIF, JPEG, ProRAW'),
    ],
  },
  // Matches Galaxy phones only. Older Samsung compact cameras fall through to "Other".
  galaxy: {
    label: 'Samsung Galaxy',
    lookLabel: 'Filter / tone',
    cameraPattern: /galaxy|\bsm-[a-z]\d/i,
    baseLooks: [],
    fields: [
      text('simulation', 'Filter or mode', 'None, Warm, Cool, Pro, Expert RAW…'),
      text('contrast', 'Contrast'),
      text('highlight', 'Highlights'),
      text('shadow', 'Shadows'),
      text('saturation', 'Saturation'),
      text('tint', 'Tint'),
      text('whiteBalance', 'White balance', 'Auto or K value'),
      text('exposureCompensation', 'Exposure compensation'),
      text('format', 'Format', 'JPEG, HEIF, RAW'),
    ],
  },
  // Anything else: name the camera yourself and write down whatever its menu offers.
  other: {
    label: 'Other (type your own)',
    lookLabel: 'Picture style',
    cameraPattern: null,
    baseLooks: [],
    fields: [
      text('cameraName', 'Camera or system', 'Leica Q3, Pentax K-3, Sigma fp…'),
      text('simulation', 'Picture style / profile', 'Standard, Portrait, Vivid…'),
      text('contrast', 'Contrast'),
      text('saturation', 'Saturation'),
      text('hue', 'Color tone / hue'),
      text('sharpness', 'Sharpness'),
      text('whiteBalance', 'White balance'),
      text('wbShift', 'WB shift'),
      text('exposureCompensation', 'Exposure compensation'),
      text('customSlot', 'Custom mode', 'C1, U1…'),
      text('extra', 'Anything else', 'Settings this list does not cover, as free text'),
    ],
  },
};

export const SYSTEM_OPTIONS = (Object.keys(SYSTEMS) as RecipeSystem[]).map(value => ({
  value,
  label: SYSTEMS[value].label,
}));

/**
 * Works out which recipe system a camera belongs to from its name.
 * @param cameraName camera name from gear or EXIF
 * @returns the matching system, or `other` when the name fits none of the known families
 */
export const systemOfCamera = (cameraName: string): RecipeSystem =>
  (Object.keys(SYSTEMS) as RecipeSystem[]).find(id =>
    SYSTEMS[id].cameraPattern?.test(cameraName),
  ) ?? 'other';

const withoutRemark = (label: string) => label.replace(/\s*\(.*?\)/g, '').trim();

/**
 * Names a system's fields the way recipes are written out and read back in: without the
 * bracketed remark a form label may carry, unless dropping it would make two fields share a name
 * (Ricoh's "Contrast", "Contrast (highlight)" and "Contrast (shadow)" keep theirs).
 * @param system camera system
 * @returns the written label per field key
 */
export const writtenLabels = (system: RecipeSystem): Record<string, string> => {
  const fields = SYSTEMS[system].fields;
  const uses = (short: string) =>
    fields.filter(field => withoutRemark(field.label) === short).length;
  return Object.fromEntries(
    fields.map(field => {
      const short = withoutRemark(field.label);
      return [field.key, uses(short) === 1 ? short : field.label];
    }),
  );
};
