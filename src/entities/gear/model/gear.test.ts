import { describe, expect, it } from 'vitest';

import { gearLabel, matchGear } from './gear';

const CAMERAS = [{ name: 'Fujifilm X-T50' }, { name: 'Canon EOS 650D' }];

describe('matchGear', () => {
  it('when the EXIF name differs only by case and punctuation, it must find the registered gear', () => {
    expect(matchGear(CAMERAS, 'FUJIFILM X-T50')).toBe(CAMERAS[0]);
  });

  it('when the registered name is longer than the EXIF name, it must still match by containment', () => {
    expect(
      matchGear([{ name: 'Fujinon XF 16-80mm F4 R OIS WR' }], 'XF16-80mmF4 R OIS WR'),
    ).toBeDefined();
  });

  it('when nothing is registered under that name or the EXIF name is empty, it must return undefined', () => {
    expect(matchGear(CAMERAS, 'NIKON Z f')).toBeUndefined();
    expect(matchGear(CAMERAS, '')).toBeUndefined();
  });
});

describe('gearLabel', () => {
  it('when a display alias is set it must be used, otherwise the model name', () => {
    expect(gearLabel({ name: 'Fujifilm X-T50', displayName: 'X-T50' })).toBe('X-T50');
    expect(gearLabel({ name: 'Fujifilm X-T50', displayName: null })).toBe('Fujifilm X-T50');
  });
});
