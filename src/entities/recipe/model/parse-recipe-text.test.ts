import { describe, expect, it } from 'vitest';

import { matchSimulation, parseRecipeText } from './parse-recipe-text';

describe('parseRecipeText (Fujifilm)', () => {
  it('when a post lists a whole recipe, it must put every stated value into its field', () => {
    const { settings, unread } = parseRecipeText(
      'fujifilm',
      [
        'A street recipe that works on gray days too',
        'Classic Negative',
        'DR400',
        'Grain Effect: Strong, Small',
        'Color Chrome Effect: Strong',
        'Color Chrome FX Blue: Strong',
        'White Balance: Auto, R+3 B-5',
        'Highlight: -1.5  Shadow: +1',
        'Color: +3  Sharpness: -1',
        'High ISO NR: -4  Clarity: -2',
      ].join('\n'),
    );

    expect(settings).toEqual({
      simulation: 'Classic Neg.',
      dynamicRange: 'DR400',
      grainStrength: 'Strong',
      grainSize: 'Small',
      colorChrome: 'Strong',
      colorChromeFxBlue: 'Strong',
      whiteBalance: 'Auto',
      wbShiftR: '+3',
      wbShiftB: '-5',
      highlight: '-1.5',
      shadow: '+1',
      color: '+3',
      sharpness: '-1',
      noiseReduction: '-4',
      clarity: '-2',
    });
    expect(unread).toEqual(['A street recipe that works on gray days too']);
  });

  it('when the text holds only white balance, it must fill white balance and nothing else', () => {
    expect(
      parseRecipeText('fujifilm', 'White Balance: Daylight, +2 Red & -4 Blue').settings,
    ).toEqual({ whiteBalance: 'Daylight', wbShiftR: '+2', wbShiftB: '-4' });
  });

  it('when the shift is given on its own line, it must fill the shift without a white balance', () => {
    expect(parseRecipeText('fujifilm', 'WB Shift: R: -2, B: +4').settings).toEqual({
      wbShiftR: '-2',
      wbShiftB: '+4',
    });
    expect(parseRecipeText('fujifilm', 'WB Shift Red +3\nWB Shift Blue −5').settings).toEqual({
      wbShiftR: '+3',
      wbShiftB: '-5',
    });
  });

  it('when a Kelvin white balance has no shift, it must keep the value and invent no shift', () => {
    expect(parseRecipeText('fujifilm', 'White Balance: 5600K').settings).toEqual({
      whiteBalance: '5600K',
    });
  });

  it('when labels come without colons, as copied from a settings table, it must still read them', () => {
    const { settings } = parseRecipeText(
      'fujifilm',
      'Film Simulation CLASSIC Neg.\nGrain Effect Weak / Large\nDynamic Range DR200',
    );
    expect(settings).toEqual({
      simulation: 'Classic Neg.',
      grainStrength: 'Weak',
      grainSize: 'Large',
      dynamicRange: 'DR200',
    });
  });

  it('when a recipe uses the older wording, it must map it to the same fields', () => {
    const { settings } = parseRecipeText(
      'fujifilm',
      'Color Chrome Effect Blue: Weak\nNoise Reduction: -4\nSharpening: -2\nGrain Effect: Off',
    );
    expect(settings).toEqual({
      colorChromeFxBlue: 'Weak',
      noiseReduction: '-4',
      sharpness: '-2',
      grainStrength: 'Off',
    });
  });

  it('when a tone curve line carries H and S, it must read them as highlight and shadow', () => {
    expect(parseRecipeText('fujifilm', 'Tone Curve: H-1 S+2').settings).toEqual({
      highlight: '-1',
      shadow: '+2',
    });
  });

  it('when the simulation is not one the form lists, it must leave the line unread', () => {
    const { settings, unread } = parseRecipeText('fujifilm', 'Film Simulation: Kodachrome 64');
    expect(settings).toEqual({});
    expect(unread).toEqual(['Film Simulation: Kodachrome 64']);
  });

  it('when a setting word appears inside a sentence, it must not be read as that setting', () => {
    const { settings, unread } = parseRecipeText('fujifilm', 'I love the color of this one');
    expect(settings).toEqual({});
    expect(unread).toHaveLength(1);
  });

  it('when a line states a setting the form has no field for, it must report it as unread', () => {
    expect(parseRecipeText('fujifilm', 'ISO: Auto, up to 6400\nClarity: 0')).toEqual({
      settings: { clarity: '0' },
      unread: ['ISO: Auto, up to 6400'],
    });
  });

  it('when a value is a range rather than a number, it must keep it as written', () => {
    expect(
      parseRecipeText('fujifilm', 'Exposure Compensation: +1/3 to +2/3 (typically)').settings,
    ).toEqual({ exposureCompensation: '+1/3 to +2/3 (typically)' });
  });
});

describe('parseRecipeText (other systems)', () => {
  it('when a line uses a field label of that system, it must fill that field', () => {
    expect(
      parseRecipeText('ricoh', 'Image control: Positive Film\nSaturation: +2').settings,
    ).toEqual({ simulation: 'Positive Film', saturation: '+2' });
  });

  it('when a Fujifilm-only wording is pasted into another system, it must not be mapped', () => {
    expect(parseRecipeText('ricoh', 'Color Chrome FX Blue: Strong').settings).toEqual({});
  });
});

describe('matchSimulation', () => {
  it('when given a common spelling, it must return the name the form lists', () => {
    expect(matchSimulation('Classic Negative')).toBe('Classic Neg.');
    expect(matchSimulation('ACROS+R')).toBe('ACROS + R');
    expect(matchSimulation('Eterna')).toBe('ETERNA / Cinema');
  });

  it('when the text names no simulation, it must return undefined', () => {
    expect(matchSimulation('Portra 400')).toBeUndefined();
  });
});
