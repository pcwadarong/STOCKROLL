import type { RecipeSettings } from './recipe';
import { type RecipeSystem, SYSTEMS } from './systems';

/** One setting as it is written out for reading: a label and its value. */
export type RecipeLine = { label: string; value: string };

const filled = (settings: RecipeSettings, key: string) => settings[key]?.trim() ?? '';

// Settings the camera menu shows as one line are written as one line. The labels are the ones
// `parseRecipeText` reads, so text copied here can be pasted back in.
const fujiLines = (settings: RecipeSettings): RecipeLine[] => {
  const value = (key: string) => filled(settings, key);
  const shift = [
    value('wbShiftR') && `R${value('wbShiftR')}`,
    value('wbShiftB') && `B${value('wbShiftB')}`,
  ]
    .filter(Boolean)
    .join(' ');
  const grain = [value('grainStrength'), value('grainSize')].filter(Boolean).join(', ');

  const lines: (RecipeLine | false)[] = [
    { label: 'Film simulation', value: value('simulation') },
    value('grainStrength')
      ? { label: 'Grain effect', value: grain }
      : { label: 'Grain size', value: value('grainSize') },
    { label: 'Color Chrome Effect', value: value('colorChrome') },
    { label: 'Color Chrome FX Blue', value: value('colorChromeFxBlue') },
    value('whiteBalance')
      ? { label: 'White balance', value: [value('whiteBalance'), shift].filter(Boolean).join(', ') }
      : { label: 'WB shift', value: shift },
    { label: 'Dynamic range', value: value('dynamicRange') },
    { label: 'D-Range Priority', value: value('toneCurve') },
    { label: 'Highlight', value: value('highlight') },
    { label: 'Shadow', value: value('shadow') },
    { label: 'Color', value: value('color') },
    { label: 'Monochromatic color', value: value('monochromeColor') },
    { label: 'Sharpness', value: value('sharpness') },
    { label: 'High ISO NR', value: value('noiseReduction') },
    { label: 'Clarity', value: value('clarity') },
    { label: 'Exposure compensation', value: value('exposureCompensation') },
    { label: 'Custom slot', value: value('customSlot') },
  ];
  return lines.filter(
    (line): line is RecipeLine => Boolean(line) && (line as RecipeLine).value !== '',
  );
};

/**
 * Writes a version's settings out as label/value lines, in menu order. Only settings that have a
 * value are listed. Fujifilm settings the menu shows together (grain strength and size, white
 * balance and its shift) share a line.
 * @param system camera system, which decides labels and order
 * @param settings settings of one version
 * @returns one line per filled-in setting
 */
export const recipeLines = (system: RecipeSystem, settings: RecipeSettings): RecipeLine[] =>
  system === 'fujifilm'
    ? fujiLines(settings)
    : SYSTEMS[system].fields.flatMap(field => {
        const value = filled(settings, field.key);
        // Bracketed remarks are for the form; the paste reader matches labels without them.
        const label = field.label.replace(/\s*\(.*?\)/g, '').trim();
        return value ? [{ label, value }] : [];
      });

/**
 * Writes a recipe as plain text for copying into a message or a note: its name, its camera
 * system, then one `Label: value` line per setting.
 * @param name recipe name
 * @param system camera system
 * @param settings settings of the version being shared
 * @returns the text, without a trailing line break
 */
export const formatRecipeText = (name: string, system: RecipeSystem, settings: RecipeSettings) =>
  [
    name,
    SYSTEMS[system].label,
    ...recipeLines(system, settings).map(({ label, value }) => `${label}: ${value}`),
  ].join('\n');
