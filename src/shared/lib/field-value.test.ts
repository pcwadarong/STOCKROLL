import { describe, expect, it } from 'vitest';

import {
  earlierValue,
  formatScaleValue,
  formatSigned,
  readOption,
  readScale,
  scaleText,
} from './field-value';

const TONE = { min: -2, max: 4, step: 0.5 };
const FINE = { min: -4, max: 4, step: 1 };

describe('readScale', () => {
  it('when nothing is stored, it must read as not set rather than as zero', () => {
    expect(readScale('', FINE)).toEqual({ kind: 'empty' });
    expect(readScale('  ', FINE)).toEqual({ kind: 'empty' });
    expect(readScale(undefined, FINE)).toEqual({ kind: 'empty' });
  });

  it('when zero is stored, it must read as the value zero', () => {
    expect(readScale('0', FINE)).toEqual({ kind: 'value', value: 0 });
  });

  it('when a number is written with or without a sign or trailing zeros, it must read as the same stop', () => {
    for (const text of ['1', '+1', '1.0', ' +1 '])
      expect(readScale(text, FINE)).toEqual({ kind: 'value', value: 1 });
  });

  it('when a half step is stored on a half-step scale, it must read as that stop', () => {
    expect(readScale('-1.5', TONE)).toEqual({ kind: 'value', value: -1.5 });
  });

  it('when a number is outside the range, it must read as text the slider cannot show', () => {
    expect(readScale('+5', FINE)).toEqual({ kind: 'other' });
    expect(readScale('-3', TONE)).toEqual({ kind: 'other' });
  });

  it('when a number is off the step, it must read as text the slider cannot show', () => {
    expect(readScale('+1.3', TONE)).toEqual({ kind: 'other' });
    expect(readScale('0.5', FINE)).toEqual({ kind: 'other' });
  });

  it('when the value is words or an unusual notation, it must read as text the slider cannot show', () => {
    for (const text of ['slightly strong', '+ 1', '-1,5', '-l', '1/3'])
      expect(readScale(text, FINE)).toEqual({ kind: 'other' });
  });
});

describe('formatSigned', () => {
  it('when a value is positive, it must carry a plus sign, and zero none', () => {
    expect(formatSigned(1)).toBe('+1');
    expect(formatSigned(1.5)).toBe('+1.5');
    expect(formatSigned(0)).toBe('0');
    expect(formatSigned(-0)).toBe('0');
    expect(formatSigned(-0.5)).toBe('-0.5');
  });

  it('when a scale does not run below zero, it must write plain numbers', () => {
    expect(formatScaleValue(3, { min: 0, max: 9, step: 1 })).toBe('3');
  });
});

describe('scaleText', () => {
  it('when a scale runs either side of zero, it must describe both ends signed', () => {
    expect(scaleText(TONE)).toBe('-2 to +4');
  });
});

describe('readOption', () => {
  const LEVELS = ['Off', 'Weak', 'Strong'];

  it('when the stored text is one of the options, it must read as that option', () => {
    expect(readOption('Weak', LEVELS)).toEqual({ kind: 'value', value: 'Weak' });
  });

  it('when nothing is stored, it must read as not set', () => {
    expect(readOption('', LEVELS)).toEqual({ kind: 'empty' });
  });

  it('when the text only resembles an option, it must read as text so it is not rewritten', () => {
    expect(readOption('weak', LEVELS)).toEqual({ kind: 'other' });
    expect(readOption('Medium', LEVELS)).toEqual({ kind: 'other' });
  });
});

describe('earlierValue', () => {
  const BEFORE = { highlight: '1', shadow: '', color: ' +2 ' };

  it('when a value is unchanged apart from surrounding spaces, it must report no change', () => {
    expect(earlierValue(BEFORE, 'highlight', '1')).toBeUndefined();
    expect(earlierValue(BEFORE, 'color', '+2')).toBeUndefined();
  });

  it('when a value only reads alike, it must count as changed, as saving does', () => {
    expect(earlierValue(BEFORE, 'highlight', '+1')).toBe('1');
  });

  it('when a setting was not set before, it must report it as empty rather than zero', () => {
    expect(earlierValue(BEFORE, 'shadow', '+1')).toBe('');
    expect(earlierValue(BEFORE, 'clarity', '0')).toBe('');
  });

  it('when a setting is cleared, it must report what it held', () => {
    expect(earlierValue(BEFORE, 'highlight', '')).toBe('1');
  });

  it('when there is nothing to compare with, it must report no change', () => {
    expect(earlierValue(undefined, 'highlight', '+3')).toBeUndefined();
  });
});
