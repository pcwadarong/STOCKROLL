import { describe, expect, it } from 'vitest';

import { closestEntry, editDistance, typoTolerance } from './closest-match';

const words = (list: Record<string, string>) => Object.entries(list);

describe('editDistance', () => {
  it('when two letters are swapped, it must count one edit', () => {
    expect(editDistance('wekak', 'weakk')).toBe(1);
    expect(editDistance('daylihgt', 'daylight')).toBe(1);
  });

  it('when letters are missing, extra or wrong, it must count each as one edit', () => {
    expect(editDistance('da40', 'dr400')).toBe(2);
    expect(editDistance('strong', 'strong')).toBe(0);
    expect(editDistance('', 'abc')).toBe(3);
  });
});

describe('typoTolerance', () => {
  it('when a word is three letters or shorter, it must allow no edit', () => {
    expect(typoTolerance(3)).toBe(0);
  });

  it('when a word is longer, it must allow more edits', () => {
    expect([4, 5, 8, 9].map(typoTolerance)).toEqual([1, 2, 2, 3]);
  });
});

describe('closestEntry', () => {
  const ranges = words({ dr100: 'DR100', dr200: 'DR200', dr400: 'DR400' });

  it('when one known word is clearly closest, it must return what that word stands for', () => {
    expect(closestEntry('da40', ranges)).toBe('DR400');
  });

  it('when two meanings are equally close, it must return nothing rather than pick one', () => {
    expect(closestEntry('dr300', ranges)).toBeUndefined();
  });

  it('when the equally close words share a meaning, it must return that meaning', () => {
    const colors = words({ color: 'color', colour: 'color' });
    expect(closestEntry('colr', colors)).toBe('color');
  });

  it('when the first letter differs, it must not guess', () => {
    expect(closestEntry('f400', ranges)).toBeUndefined();
  });

  it('when the input is shorter than four characters, it must not guess', () => {
    expect(closestEntry('wek', words({ weak: 'Weak' }))).toBeUndefined();
  });

  it('when nothing is within the tolerance, it must return nothing', () => {
    expect(closestEntry('kodachrome', words({ classicchrome: 'Classic Chrome' }))).toBeUndefined();
  });
});
