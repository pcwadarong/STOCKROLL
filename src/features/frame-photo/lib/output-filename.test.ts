import { describe, expect, it } from 'vitest';

import { outputFilename, outputFilenames } from './output-filename';

describe('outputFilename', () => {
  it('when the source has an extension, it must replace it with the preset suffix and .jpg', () => {
    expect(outputFilename('DSCF0001.RAF.png', '3x4')).toBe('DSCF0001.RAF_stockroll_3x4.jpg');
  });

  it('when the source name is only an extension, it must fall back to "photo"', () => {
    expect(outputFilename('.jpg', '1x1')).toBe('photo_stockroll_1x1.jpg');
  });
});

describe('outputFilenames', () => {
  it('when every source name differs, it must name each file as a single export would', () => {
    expect(outputFilenames(['a.jpg', 'b.png'], '4x5')).toEqual([
      outputFilename('a.jpg', '4x5'),
      outputFilename('b.png', '4x5'),
    ]);
  });

  it('when two files share a name, it must keep the first and number the later ones', () => {
    expect(outputFilenames(['a.jpg', 'a.jpg', 'a.jpg'], '3x4')).toEqual([
      'a_stockroll_3x4.jpg',
      'a-2_stockroll_3x4.jpg',
      'a-3_stockroll_3x4.jpg',
    ]);
  });

  it('when names differ only by extension or letter case, it must still treat them as the same output', () => {
    expect(outputFilenames(['Roll.jpg', 'roll.png'], '3x4')).toEqual([
      'Roll_stockroll_3x4.jpg',
      'roll-2_stockroll_3x4.jpg',
    ]);
  });

  it('when a numbered name is already used by another file, it must skip to a free number', () => {
    const names = outputFilenames(['a.jpg', 'a-2.jpg', 'a.jpg'], '3x4');
    expect(names).toEqual([
      'a_stockroll_3x4.jpg',
      'a-2_stockroll_3x4.jpg',
      'a-3_stockroll_3x4.jpg',
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('when the queue is empty, it must return no names', () => {
    expect(outputFilenames([], '3x4')).toEqual([]);
  });
});
