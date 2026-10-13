import { describe, expect, it } from 'vitest';

import { likePattern, searchWords } from './search';

describe('searchWords', () => {
  it('when the search is empty or only spaces, it must give no words', () => {
    expect(searchWords('')).toEqual([]);
    expect(searchWords('   ')).toEqual([]);
  });

  it('when words are separated by spaces, it must give each word on its own', () => {
    expect(searchWords('  fuji   used ')).toEqual(['fuji', 'used']);
  });

  it('when a word has capitals, it must be lowered', () => {
    expect(searchWords('UltraMax')).toEqual(['ultramax']);
  });

  it('when a word has a dash or an underscore, it must be dropped from the word', () => {
    expect(searchWords('X-T50')).toEqual(['xt50']);
    expect(searchWords('16–80')).toEqual(['1680']);
    expect(searchWords('mju_zoom')).toEqual(['mjuzoom']);
  });

  it('when a word is only dashes, it must be left out', () => {
    expect(searchWords('-- fuji')).toEqual(['fuji']);
  });

  it('when a word has a dot or a slash, it must be kept', () => {
    expect(searchWords('f/2.8')).toEqual(['f/2.8']);
  });

  it('when a word is full-width, it must be folded to the plain letters', () => {
    expect(searchWords('ＸＴ５０')).toEqual(['xt50']);
  });

  it('when a word is not Latin, it must be kept as typed', () => {
    expect(searchWords('現場 μZoom')).toEqual(['現場', 'μzoom']);
  });
});

describe('likePattern', () => {
  it('when a word is plain, it must be wrapped to match anywhere', () => {
    expect(likePattern('xt50')).toBe('%xt50%');
  });

  it('when a word has a like wildcard or a backslash, it must be escaped', () => {
    expect(likePattern('100%')).toBe('%100\\%%');
    expect(likePattern('a\\b')).toBe('%a\\\\b%');
  });
});
