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
      flags: [],
      unread: ['ISO: Auto, up to 6400'],
    });
  });

  it('when a value is a range rather than a number, it must keep it as written', () => {
    expect(
      parseRecipeText('fujifilm', 'Exposure Compensation: +1/3 to +2/3 (typically)').settings,
    ).toEqual({ exposureCompensation: '+1/3 to +2/3 (typically)' });
  });
});

describe('parseRecipeText (settings the form has no field for)', () => {
  it('when an unknown setting follows a known one on a line, it must not join its value', () => {
    expect(parseRecipeText('fujifilm', 'Clarity: -2 ISO: 400')).toEqual({
      settings: { clarity: '-2' },
      flags: [],
      unread: ['ISO: 400'],
    });
  });

  it('when an unknown setting follows a white balance, it must keep the shift and drop the rest', () => {
    expect(parseRecipeText('fujifilm', 'White Balance: Auto, R: +3 B: -5 ISO: 400')).toEqual({
      settings: { whiteBalance: 'Auto', wbShiftR: '+3', wbShiftB: '-5' },
      flags: [],
      unread: ['ISO: 400'],
    });
  });

  it('when a value itself opens with a colon phrase, it must be kept whole', () => {
    expect(parseRecipeText('other', 'Anything else: Note: use with ND').settings).toEqual({
      extra: 'Note: use with ND',
    });
  });
});

describe('parseRecipeText (guessing at misspellings)', () => {
  it('when a value is a misspelling of one known word, it must fill that word and report the guess', () => {
    expect(parseRecipeText('fujifilm', 'da40')).toEqual({
      settings: { dynamicRange: 'DR400' },
      flags: [{ key: 'dynamicRange', kind: 'value', from: 'da40', to: 'DR400' }],
      unread: [],
    });
  });

  it('when a setting name is misspelled, it must read the value and report the name as guessed', () => {
    const { settings, flags, unread } = parseRecipeText('fujifilm', 'Hightlight: -1  Shadw: +2');
    expect(settings).toEqual({ highlight: '-1', shadow: '+2' });
    expect(flags).toEqual([
      { key: 'highlight', kind: 'label', from: 'Hightlight', to: '-1' },
      { key: 'shadow', kind: 'label', from: 'Shadw', to: '+2' },
    ]);
    expect(unread).toEqual([]);
  });

  it('when a listed value is misspelled, it must fill the nearest and report it', () => {
    const { settings, flags } = parseRecipeText(
      'fujifilm',
      'Film Simulation: Clasic Chrom\nGrain Effect: Stong, Smal\nColor Chrome Effect: week',
    );
    expect(settings).toEqual({
      simulation: 'Classic Chrome',
      grainStrength: 'Strong',
      grainSize: 'Small',
      colorChrome: 'Weak',
    });
    expect(flags.map(flag => [flag.key, flag.from])).toEqual([
      ['simulation', 'Clasic Chrom'],
      ['grainStrength', 'Stong'],
      ['grainSize', 'Smal'],
      ['colorChrome', 'week'],
    ]);
  });

  it('when everything is spelled right, it must report no guess', () => {
    expect(parseRecipeText('fujifilm', 'Classic Negative\nDR400\nColor: +3').flags).toEqual([]);
  });

  it('when two known words are equally near, it must not pick one', () => {
    expect(parseRecipeText('fujifilm', 'DR300')).toEqual({
      settings: {},
      flags: [],
      unread: ['DR300'],
    });
  });

  it('when a number is outside the usual range, it must be kept as written and flagged', () => {
    expect(parseRecipeText('fujifilm', 'Highlight: -15\nColor: +3')).toEqual({
      settings: { highlight: '-15', color: '+3' },
      flags: [{ key: 'highlight', kind: 'range', from: '-2 to +4', to: '-15' }],
      unread: [],
    });
  });

  it('when a number is off the step of its setting, it must be flagged, and a half step for tones must not', () => {
    const { flags } = parseRecipeText('fujifilm', 'Color: +1.5\nShadow: -1.5\nWB Shift: R+10 B-9');
    expect(flags.map(flag => flag.key)).toEqual(['color', 'wbShiftR']);
  });

  it('when a value is not a plain number, it must not be judged against a range', () => {
    expect(parseRecipeText('fujifilm', 'Highlight: -1 to +1').flags).toEqual([]);
  });

  it('when a setting is given again with another value, it must keep the first and report the other', () => {
    expect(parseRecipeText('fujifilm', 'Color: +3\nClarity: -2\nColor: +1')).toEqual({
      settings: { color: '+3', clarity: '-2' },
      flags: [{ key: 'color', kind: 'repeat', from: '+1', to: '+3' }],
      unread: [],
    });
  });

  it('when a setting is given again with the same value, it must report nothing', () => {
    expect(parseRecipeText('fujifilm', 'Tone Curve: H-1 S+2\nHighlight: -1').flags).toEqual([]);
  });

  it('when a white balance preset is misspelled, it must fill the preset and flag it', () => {
    expect(parseRecipeText('fujifilm', 'White Balance: Daylihgt, R+2 B-4')).toEqual({
      settings: { wbShiftR: '+2', wbShiftB: '-4', whiteBalance: 'Daylight' },
      flags: [{ key: 'whiteBalance', kind: 'value', from: 'Daylihgt', to: 'Daylight' }],
      unread: [],
    });
  });

  it('when a white balance is not a preset, it must be kept exactly as written', () => {
    const read = (text: string) => parseRecipeText('fujifilm', text);
    expect(read('White Balance: 5600K').settings.whiteBalance).toBe('5600K');
    expect(read('White Balance: Custom 1').flags).toEqual([]);
  });

  it('when a misspelled name has no colon but a value plainly follows, it must be read', () => {
    expect(parseRecipeText('fujifilm', 'Hightlight -1\nColr Chrome Effect Strong')).toEqual({
      settings: { highlight: '-1', colorChrome: 'Strong' },
      flags: [
        { key: 'highlight', kind: 'label', from: 'Hightlight', to: '-1' },
        { key: 'colorChrome', kind: 'label', from: 'Colr Chrome Effect', to: 'Strong' },
      ],
      unread: [],
    });
  });

  it('when a line without a colon is prose, it must not be taken for a misspelled name', () => {
    expect(parseRecipeText('fujifilm', 'Shadowy alley at 5 pm\nColors of autumn').settings).toEqual(
      {},
    );
  });

  it('when a guessed setting is later stated outright, the stated value must win unflagged', () => {
    const { settings, flags } = parseRecipeText('fujifilm', 'Astral\nFilm Simulation: Velvia');
    expect(settings.simulation).toBe('Velvia / Vivid');
    expect(flags).toEqual([]);
  });

  it('when a long line of prose resembles nothing exactly, it must not be guessed at', () => {
    const { settings } = parseRecipeText('fujifilm', 'Classic chrom tones for an overcast day');
    expect(settings).toEqual({});
  });

  it('when a short unknown name is near no label, it must stay unread', () => {
    expect(parseRecipeText('fujifilm', 'Lens: XF 23mm\nISO: 400').settings).toEqual({});
  });

  it('when a misspelled name follows a value on the same line, it must not swallow the value', () => {
    const { settings } = parseRecipeText('fujifilm', 'Grain Effect: Strong Small Colr: +3');
    expect(settings).toEqual({ grainStrength: 'Strong', grainSize: 'Small', color: '+3' });
  });

  it('when a range is written loosely under its label, it must be read as that range, unflagged', () => {
    expect(parseRecipeText('fujifilm', 'Dynamic Range: 400%')).toEqual({
      settings: { dynamicRange: 'DR400' },
      flags: [],
      unread: [],
    });
  });

  it("when another system has a misspelled label, it must guess among that system's labels", () => {
    const { settings, flags } = parseRecipeText('ricoh', 'Saturaton: +2');
    expect(settings).toEqual({ saturation: '+2' });
    expect(flags).toEqual([{ key: 'saturation', kind: 'label', from: 'Saturaton', to: '+2' }]);
  });

  it('when full-width characters are pasted, it must read them as their plain forms', () => {
    expect(parseRecipeText('fujifilm', 'Highlight\uFF1A\uFF0B\uFF11').settings).toEqual({
      highlight: '+1',
    });
  });
});

describe('parseRecipeText (loose ways of writing)', () => {
  const read = (text: string) => parseRecipeText('fujifilm', text);

  it('when setting names are abbreviated, it must read them as the full names', () => {
    expect(
      read('DR: 400\nSharp: -2\nHL: -1  SH: +2\nCCE: Strong\nCC FX Blue: Weak\nEV: +1/3'),
    ).toEqual({
      settings: {
        dynamicRange: 'DR400',
        sharpness: '-2',
        highlight: '-1',
        shadow: '+2',
        colorChrome: 'Strong',
        colorChromeFxBlue: 'Weak',
        exposureCompensation: '+1/3',
      },
      flags: [],
      unread: [],
    });
  });

  it('when the abbreviated range names no range, it must leave the line unread', () => {
    expect(read('DR-P: Strong').settings).toEqual({});
    expect(read('DR40')).toMatchObject({
      settings: { dynamicRange: 'DR400' },
      flags: [{ key: 'dynamicRange', kind: 'value', from: 'DR40', to: 'DR400' }],
    });
  });

  it('when a remark follows the simulation name, it must take the name and report the remark', () => {
    expect(read('Film Simulation: Classic Chrome (base look)')).toEqual({
      settings: { simulation: 'Classic Chrome' },
      flags: [],
      unread: ['(base look)'],
    });
  });

  it('when a number is written with a gap or a decimal comma, it must be written plainly', () => {
    expect(read('Color: + 3\nHighlight: -1,5\nWB Shift: R + 2, B - 4')).toEqual({
      settings: { color: '+3', highlight: '-1.5', wbShiftR: '+2', wbShiftB: '-4' },
      flags: [],
      unread: [],
    });
  });

  it('when a value that is not wholly a number has a gap, it must be left as written', () => {
    expect(read('Exposure Compensation: + 1/3 to + 2/3').settings.exposureCompensation).toBe(
      '+ 1/3 to + 2/3',
    );
  });

  it('when a number has a letter where a digit belongs, it must be kept and flagged, not fixed', () => {
    expect(read('Highlight: -l\nColor: +O')).toEqual({
      settings: { highlight: '-l', color: '+O' },
      flags: [
        { key: 'highlight', kind: 'number', from: '-1', to: '-l' },
        { key: 'color', kind: 'number', from: '+0', to: '+O' },
      ],
      unread: [],
    });
  });

  it('when a level is given in other words, it must fill the matching step and flag it', () => {
    expect(read('Grain Effect: Low, Coarse\nColor Chrome Effect: High')).toEqual({
      settings: { grainStrength: 'Weak', grainSize: 'Large', colorChrome: 'Strong' },
      flags: [
        { key: 'grainStrength', kind: 'value', from: 'Low', to: 'Weak' },
        { key: 'grainSize', kind: 'value', from: 'Coarse', to: 'Large' },
        { key: 'colorChrome', kind: 'value', from: 'High', to: 'Strong' },
      ],
      unread: [],
    });
  });

  it('when a name opens a sentence instead of a setting, it must not take the sentence as its value', () => {
    const prose =
      'Noise is fine here\nExposure triangle basics\nColor grading notes\nFilm stock I love';
    expect(read(prose)).toEqual({ settings: {}, flags: [], unread: prose.split('\n') });
  });

  it('when a name without a colon is followed by a value, it must still be read', () => {
    expect(read('Noise -4\nWhite Balance Daylight\nWB 5600K\nSharp + 1').settings).toEqual({
      noiseReduction: '-4',
      whiteBalance: 'Daylight',
      sharpness: '+1',
    });
  });

  it('when a level is given as none, it must read Off without a flag', () => {
    expect(read('Grain Effect: None')).toEqual({
      settings: { grainStrength: 'Off' },
      flags: [],
      unread: [],
    });
  });
});

describe('parseRecipeText (parts of a value it cannot use)', () => {
  const read = (text: string) => parseRecipeText('fujifilm', text);

  it('when one part of a paired value is unknown, it must fill the known part and report the other', () => {
    expect(read('Grain Effect: Strong, Tiny')).toEqual({
      settings: { grainStrength: 'Strong' },
      flags: [],
      unread: ['Tiny'],
    });
  });

  it('when every part of a paired value is known, it must report nothing', () => {
    expect(read('Grain Effect: Weak / Large').unread).toEqual([]);
  });

  it('when a setting on a shared line has a value it cannot use, it must report that setting', () => {
    expect(read('Color: +3  Grain Effect: Tiny  Film Simulation: Kodachrome 64')).toEqual({
      settings: { color: '+3' },
      flags: [],
      unread: ['Grain Effect: Tiny', 'Film Simulation: Kodachrome 64'],
    });
  });
});

describe('parseRecipeText (other systems)', () => {
  it('when fields share a name apart from a bracketed remark, each must get its own value', () => {
    const text = 'Contrast: +2\nContrast (highlight): -1\nContrast (shadow): +3';
    expect(parseRecipeText('ricoh', text).settings).toEqual({
      contrast: '+2',
      contrastHighlight: '-1',
      contrastShadow: '+3',
    });
  });

  it('when a field label carries a long dash, it must be read with a dash or a hyphen', () => {
    expect(parseRecipeText('canon', 'Sharpness — strength: 4').settings).toEqual({
      sharpness: '4',
    });
    expect(parseRecipeText('canon', 'Sharpness - fineness: 2').settings).toEqual({
      sharpnessFineness: '2',
    });
  });

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
