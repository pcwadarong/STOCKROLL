import { describe, expect, it } from 'vitest';

import { parseRecipeText } from './parse-recipe-text';
import { formatRecipeText, recipeLines } from './recipe-lines';

const FULL = {
  simulation: 'Classic Neg.',
  grainStrength: 'Strong',
  grainSize: 'Small',
  colorChrome: 'Strong',
  colorChromeFxBlue: 'Weak',
  whiteBalance: 'Auto',
  wbShiftR: '+3',
  wbShiftB: '-5',
  dynamicRange: 'DR400',
  toneCurve: 'Weak',
  highlight: '-1.5',
  shadow: '+1',
  color: '+3',
  monochromeColor: 'WC +2',
  sharpness: '-1',
  noiseReduction: '-4',
  clarity: '-2',
  exposureCompensation: '+1/3',
  customSlot: 'C1',
};

describe('recipeLines', () => {
  it('when grain and white balance have their parts, it must write each as one line', () => {
    const lines = recipeLines('fujifilm', FULL);
    expect(lines).toContainEqual({ label: 'Grain effect', value: 'Strong, Small' });
    expect(lines).toContainEqual({ label: 'White balance', value: 'Auto, R+3 B-5' });
  });

  it('when a setting has no value, it must not get a line', () => {
    expect(recipeLines('fujifilm', { simulation: 'ACROS', color: ' ' })).toEqual([
      { label: 'Film simulation', value: 'ACROS' },
    ]);
  });

  it('when only a shift is known, it must write the shift without inventing a white balance', () => {
    expect(recipeLines('fujifilm', { wbShiftB: '-2' })).toEqual([
      { label: 'WB shift', value: 'B-2' },
    ]);
  });

  it('when the system is not Fujifilm, it must list its own fields under their labels', () => {
    expect(recipeLines('ricoh', { simulation: 'Positive Film', toning: 'Sepia' })).toEqual([
      { label: 'Image control', value: 'Positive Film' },
      { label: 'Toning', value: 'Sepia' },
    ]);
  });
});

describe('formatRecipeText', () => {
  it('when a recipe is written out, it must open with its name and system', () => {
    expect(formatRecipeText('Afternoon Street', 'fujifilm', { color: '+3' })).toBe(
      'Afternoon Street\nFujifilm\nColor: +3',
    );
  });

  it('when the copied text is pasted back, it must give the same settings', () => {
    const text = formatRecipeText('Afternoon Street', 'fujifilm', FULL);
    expect(parseRecipeText('fujifilm', text).settings).toEqual(FULL);
  });

  it('when only parts of grain or white balance exist, pasting back must keep just those', () => {
    const partial: Record<string, string>[] = [
      { grainSize: 'Large' },
      { wbShiftR: '+2' },
      { whiteBalance: '5600K' },
    ];
    for (const settings of partial)
      expect(
        parseRecipeText('fujifilm', formatRecipeText('x', 'fujifilm', settings)).settings,
      ).toEqual(settings);
  });

  it('when a Canon recipe with dashed labels is pasted back, it must give the same settings', () => {
    const settings = { sharpness: '4', sharpnessFineness: '2', sharpnessThreshold: '3' };
    expect(parseRecipeText('canon', formatRecipeText('x', 'canon', settings)).settings).toEqual(
      settings,
    );
  });

  it('when a Ricoh recipe is pasted back, it must give the same settings', () => {
    const settings = {
      simulation: 'Positive Film',
      saturation: '+2',
      contrast: '+2',
      contrastHighlight: '-1',
      contrastShadow: '+3',
      toning: 'Sepia',
    };
    expect(parseRecipeText('ricoh', formatRecipeText('x', 'ricoh', settings)).settings).toEqual(
      settings,
    );
  });
});
