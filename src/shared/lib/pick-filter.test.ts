import { describe, expect, it } from 'vitest';

import { ANY, FAVORITES_ONLY, listFilter, matchesPicks } from './pick-filter';

describe('matchesPicks', () => {
  const item = { status: 'repair', kind: 'film', isFavorite: true, bodyType: null };

  it('when nothing is picked, every record must match', () => {
    expect(matchesPicks(item, {})).toBe(true);
  });

  it('when a pick is All, it must not narrow the list', () => {
    expect(matchesPicks(item, { status: ANY, kind: 'film' })).toBe(true);
  });

  it('when several facts are picked, the record must satisfy all of them', () => {
    expect(matchesPicks(item, { status: 'repair', kind: 'film' })).toBe(true);
    expect(matchesPicks(item, { status: 'repair', kind: 'digital' })).toBe(false);
  });

  it('when a value is picked for a field the record leaves empty, it must not match', () => {
    expect(matchesPicks(item, { bodyType: 'slr' })).toBe(false);
  });

  it('when favorites only is picked, it must match starred records alone', () => {
    expect(matchesPicks(item, FAVORITES_ONLY)).toBe(true);
    expect(matchesPicks({ ...item, isFavorite: false }, FAVORITES_ONLY)).toBe(false);
  });
});

describe('listFilter', () => {
  it('when a filter is built, All must come first so it is the resting choice', () => {
    const filter = listFilter('kind', 'Type', [{ value: 'film', label: 'Film' }]);
    expect(filter.options.map(option => option.value)).toEqual([ANY, 'film']);
  });
});
