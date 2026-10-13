import { describe, expect, it } from 'vitest';

import { activePicks, ANY, FAVORITES_ONLY, listFilter } from './pick-filter';

describe('activePicks', () => {
  it('when nothing is picked, it must ask for no filter', () => {
    expect(activePicks({})).toEqual({});
  });

  it('when a pick is All, it must be left out so it does not narrow the list', () => {
    expect(activePicks({ status: ANY, kind: 'film' })).toEqual({ kind: 'film' });
  });

  it('when several facts are picked, it must keep all of them', () => {
    expect(activePicks({ status: 'repair', kind: 'film' })).toEqual({
      status: 'repair',
      kind: 'film',
    });
  });

  it('when favorites only is picked, it must ask for starred records as text', () => {
    expect(activePicks(FAVORITES_ONLY)).toEqual({ isFavorite: 'true' });
  });
});

describe('listFilter', () => {
  it('when a filter is built, All must come first so it is the resting choice', () => {
    const filter = listFilter('kind', 'Type', [{ value: 'film', label: 'Film' }]);
    expect(filter.options.map(option => option.value)).toEqual([ANY, 'film']);
  });
});
