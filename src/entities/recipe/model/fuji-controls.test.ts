import { describe, expect, it } from 'vitest';

import {
  FUJI_WHITE_BALANCE_CHOICES,
  kelvinText,
  readShift,
  readWhiteBalance,
  SHIFT_CELLS,
  shiftAt,
  shiftChanges,
  shiftLabel,
  shiftPosition,
  stepShift,
} from './fuji-controls';
import { parseRecipeText } from './parse-recipe-text';
import { sameSettings } from './recipe';
import { formatRecipeText } from './recipe-lines';
import { SYSTEMS } from './systems';

describe('readWhiteBalance', () => {
  it('when a listed setting is stored, it must read as that setting', () => {
    expect(readWhiteBalance('Auto White Priority')).toEqual({
      kind: 'preset',
      value: 'Auto White Priority',
    });
    expect(readWhiteBalance('Custom 2')).toEqual({ kind: 'preset', value: 'Custom 2' });
  });

  it('when a color temperature is stored in any common spelling, it must read as kelvin', () => {
    for (const text of ['5600K', '5600 K', '5600k'])
      expect(readWhiteBalance(text)).toEqual({ kind: 'kelvin', kelvin: 5600, usual: true });
  });

  it('when a temperature is outside 2500–10000 K or off the 10 K step, it must say it is unusual', () => {
    expect(readWhiteBalance('12000K')).toMatchObject({ kind: 'kelvin', usual: false });
    expect(readWhiteBalance('5655K')).toMatchObject({ kind: 'kelvin', usual: false });
  });

  it('when nothing is stored, it must read as not set', () => {
    expect(readWhiteBalance('')).toEqual({ kind: 'empty' });
  });

  it('when the text is neither, it must read as text so it is kept as written', () => {
    expect(readWhiteBalance('daylight')).toEqual({ kind: 'other' });
    expect(readWhiteBalance('Auto, a bit warm')).toEqual({ kind: 'other' });
  });
});

describe('kelvinText', () => {
  it('when digits are typed, it must store them as a temperature', () => {
    expect(kelvinText('5600')).toBe('5600K');
  });

  it('when the box is emptied, it must store nothing rather than a default', () => {
    expect(kelvinText('')).toBe('');
  });
});

describe('readShift', () => {
  it('when neither axis is set, it must read as not set', () => {
    expect(readShift('', undefined)).toEqual({ kind: 'empty' });
  });

  it('when both axes are set in any notation, it must read the point', () => {
    expect(readShift('3', '+1.0')).toEqual({ kind: 'value', value: { r: 3, b: 1 } });
  });

  it('when an axis is outside -9 to +9 or not a whole step, it must read as text', () => {
    expect(readShift('+12', '0')).toEqual({ kind: 'other' });
    expect(readShift('+1', '0.5')).toEqual({ kind: 'other' });
    expect(readShift('warm', '')).toEqual({ kind: 'other' });
  });
});

describe('shift grid', () => {
  it('when the pointer is at the corners and middle, it must pick the matching steps', () => {
    expect(shiftAt(0, 0)).toEqual({ r: -9, b: 9 });
    expect(shiftAt(1, 1)).toEqual({ r: 9, b: -9 });
    expect(shiftAt(0.5, 0.5)).toEqual({ r: 0, b: 0 });
  });

  it('when the pointer is dragged past the edge, it must stop at the last step', () => {
    expect(shiftAt(-0.3, 1.4)).toEqual({ r: -9, b: -9 });
  });

  it('when a point is placed and read back, it must land on the same step', () => {
    for (const point of [
      { r: 3, b: -2 },
      { r: -9, b: 9 },
      { r: 0, b: 0 },
    ]) {
      const { x, y } = shiftPosition(point);
      expect(shiftAt(x, y)).toEqual(point);
    }
  });

  it('when a point is drawn, it must sit at the centre of its own cell, where the dot is', () => {
    const cells = [-9, -3, 0, 4, 9].map(r => shiftPosition({ r, b: 0 }).x * SHIFT_CELLS);
    expect(cells).toEqual([0.5, 6.5, 9.5, 13.5, 18.5]);
  });

  it('when the outermost values are drawn, they must sit inside the border', () => {
    const { x, y } = shiftPosition({ r: 9, b: 9 });
    expect(x).toBeLessThan(1);
    expect(y).toBeGreaterThan(0);
  });

  it('when the pointer is anywhere in a cell, it must pick that cell, not a neighbour', () => {
    const cell = 1 / SHIFT_CELLS;
    // The cell of R +3 is the 13th from the left: index 12.
    expect(shiftAt(12 * cell + 0.01, 0.5).r).toBe(3);
    expect(shiftAt(13 * cell - 0.01, 0.5).r).toBe(3);
    expect(shiftAt(13 * cell + 0.01, 0.5).r).toBe(4);
  });

  it('when arrow keys are pressed, it must move red across and blue up and down, stopping at the edge', () => {
    expect(stepShift({ r: 0, b: 0 }, 'ArrowRight')).toEqual({ r: 1, b: 0 });
    expect(stepShift({ r: 0, b: 0 }, 'ArrowUp')).toEqual({ r: 0, b: 1 });
    expect(stepShift({ r: 9, b: -9 }, 'ArrowRight')).toEqual({ r: 9, b: -9 });
    expect(stepShift({ r: 9, b: -9 }, 'ArrowDown')).toEqual({ r: 9, b: -9 });
    expect(stepShift({ r: 0, b: 0 }, 'Enter')).toBeUndefined();
  });

  it('when a point is announced, it must name both axes with their signs', () => {
    expect(shiftLabel({ r: 3, b: -2 })).toBe('Red +3, Blue −2');
    expect(shiftLabel({ r: 0, b: 0 })).toBe('Red 0, Blue 0');
  });
});

describe('shiftChanges', () => {
  it('when one axis moves, it must leave the other exactly as stored', () => {
    expect(shiftChanges({ wbShiftR: '3', wbShiftB: '-1' }, { r: 4, b: -1 })).toEqual({
      wbShiftR: '+4',
    });
  });

  it('when an axis was not set, picking a point must set it', () => {
    expect(shiftChanges({ wbShiftR: '+2' }, { r: 2, b: 0 })).toEqual({ wbShiftB: '0' });
  });
});

describe('Fujifilm form values', () => {
  const STORED = {
    simulation: 'Classic Neg.',
    grainStrength: 'Weak',
    grainSize: 'Small',
    whiteBalance: '5600K',
    wbShiftR: '3',
    wbShiftB: '-5',
    dynamicRange: 'DR400',
    highlight: '-1.5',
    shadow: '1',
    color: '+3',
    sharpness: '-1',
    clarity: '-2',
  };

  it('when settings are opened and saved untouched, they must count as unchanged', () => {
    // The controls read these strings but write nothing until touched.
    expect(sameSettings(STORED, { ...STORED })).toBe(true);
  });

  it('when values the controls write are copied as text and pasted back, they must come back the same', () => {
    const written = {
      grainStrength: 'Off',
      grainSize: 'Large',
      colorChrome: 'Strong',
      whiteBalance: '5600K',
      wbShiftR: '+3',
      wbShiftB: '-5',
      dynamicRange: 'Auto',
      highlight: '+1.5',
      shadow: '0',
      noiseReduction: '-4',
      clarity: '+5',
    };
    const text = formatRecipeText('Recipe', 'fujifilm', written);
    expect(parseRecipeText('fujifilm', text).settings).toMatchObject(written);
  });

  it('when any white balance the picker offers is copied and pasted back, it must come back as picked', () => {
    for (const whiteBalance of FUJI_WHITE_BALANCE_CHOICES) {
      const text = formatRecipeText('Recipe', 'fujifilm', { whiteBalance, wbShiftR: '+3' });
      const { settings, flags } = parseRecipeText('fujifilm', text);
      expect(settings).toMatchObject({ whiteBalance, wbShiftR: '+3' });
      expect(flags).toEqual([]);
    }
  });

  it('when a value is outside a slider, pasting must still flag it with the slider range', () => {
    const { flags } = parseRecipeText('fujifilm', 'Color: +5');
    expect(flags).toContainEqual({ key: 'color', kind: 'range', from: '-4 to +4', to: '+5' });
  });

  it('when the form is built, every Fujifilm slider must have its range', () => {
    for (const field of SYSTEMS.fujifilm.fields.filter(item => item.type === 'scale'))
      expect(field.scale).toBeDefined();
  });
});
