import { describe, expect, it } from 'vitest';

import {
  formatCamera,
  formatExposure,
  formatShutter,
  isScannerDevice,
  parseShutter,
} from './format-exif';

describe('formatCamera', () => {
  it('when both make and model exist, it must join them with a space', () => {
    expect(formatCamera('FUJIFILM', 'X-T50')).toBe('FUJIFILM X-T50');
  });

  it('when the model already starts with the make, it must not repeat the make', () => {
    expect(formatCamera('Canon', 'Canon EOS 650D')).toBe('Canon EOS 650D');
  });

  it('when only one exists it must return that value, and an empty string when both are missing', () => {
    expect(formatCamera(undefined, 'X-T50')).toBe('X-T50');
    expect(formatCamera()).toBe('');
  });
});

describe('isScannerDevice', () => {
  it.each([
    ['NORITSU KOKI', 'EZ Controller'],
    ['FUJI PHOTO FILM CO., LTD.', 'SP-3000'],
    ['EPSON', 'Perfection V600'],
  ])('when Make/Model is %s %s, it must be detected as a scanner, not a camera', (make, model) => {
    expect(isScannerDevice(make, model)).toBe(true);
  });

  it.each([
    ['FUJIFILM', 'X-T50'],
    ['Canon', 'Canon EOS 650D'],
    [undefined, undefined],
  ])('when Make/Model is %s %s, it must not be detected as a scanner', (make, model) => {
    expect(isScannerDevice(make, model)).toBe(false);
  });
});

describe('formatShutter', () => {
  it.each([
    [1 / 250, '1/250s'],
    [0.008, '1/125s'],
    [0.5, '0.5s'],
    [2, '2s'],
    [1.3, '1.3s'],
  ])('when the exposure time is %s seconds, it must be formatted as %s', (seconds, expected) => {
    expect(formatShutter(seconds)).toBe(expected);
  });
});

describe('parseShutter', () => {
  it.each([
    ['1/250', 1 / 250],
    ['1/250s', 1 / 250],
    [' 1 / 60 ', 1 / 60],
    ['0.5', 0.5],
    ['2s', 2],
    ['30"', 30],
  ])('when the user types %s, it must read it as that many seconds', (text, seconds) => {
    expect(parseShutter(text)).toBeCloseTo(seconds as number, 6);
  });

  it.each(['', 'fast', '1/0', '-2', 'f/8'])(
    'when the text %s is not a shutter speed, it must return undefined instead of guessing',
    text => {
      expect(parseShutter(text)).toBeUndefined();
    },
  );
});

describe('formatExposure', () => {
  const info = {
    iso: 1250,
    focalLength: 72,
    focalLength35: 108,
    aperture: 5.6,
    exposureTime: 1 / 250,
  };

  it('when the focal mode changes, it must show the actual and 35mm-equivalent values distinctly', () => {
    expect(formatExposure(info, 'actual')).toBe('ISO1250 72mm F5.6 1/250s');
    expect(formatExposure(info, '35mm')).toBe('ISO1250 108mm F5.6 1/250s');
  });

  it('when 35mm equivalent is selected but EXIF has none, it must keep the actual value instead of computing one', () => {
    expect(formatExposure({ ...info, focalLength35: undefined }, '35mm')).toBe(
      'ISO1250 72mm F5.6 1/250s',
    );
  });

  it('when some values are missing, it must skip them and join only the present ones', () => {
    expect(formatExposure({ aperture: 4 }, 'actual')).toBe('F4');
    expect(formatExposure({}, 'actual')).toBe('');
  });
});
