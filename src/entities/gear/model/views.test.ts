import { describe, expect, it } from 'vitest';

import { arrangeGear, FILM_VIEWS, GEAR_VIEWS, isCurrent } from './views';

const view = (value: string) => GEAR_VIEWS.find(item => item.value === value)!;
const filmView = (value: string) => FILM_VIEWS.find(item => item.value === value)!;

const GEAR = [
  { name: 'display', ownership: 'owned', status: 'display' },
  { name: 'rented', ownership: 'rented', status: 'inactive' },
  { name: 'repair', ownership: 'owned', status: 'repair' },
  { name: 'active-1', ownership: 'owned', status: 'active' },
  { name: 'shelved', ownership: 'owned', status: 'inactive' },
  { name: 'active-2', ownership: 'owned', status: 'active' },
];

const names = (items: readonly { name: string }[]) => items.map(item => item.name);

describe('arrangeGear', () => {
  it('when showing everything, gear in use must lead and rented gear must come last', () => {
    expect(names(arrangeGear(GEAR, view('all')))).toEqual([
      'active-1',
      'active-2',
      'repair',
      'shelved',
      'display',
      'rented',
    ]);
  });

  it('when the view is In use, it must list only owned gear that is in use', () => {
    expect(names(arrangeGear(GEAR, view('active')))).toEqual(['active-1', 'active-2']);
  });

  it('when the view is Not in use, rented gear must not appear even though its status is inactive', () => {
    expect(names(arrangeGear(GEAR, view('inactive')))).toEqual(['shelved']);
  });

  it('when the view is Rented or gone, it must list gear the user does not own', () => {
    expect(names(arrangeGear(GEAR, view('not-owned')))).toEqual(['rented']);
  });

  it('when films are shown, favorites must lead and candidates must follow films that were shot', () => {
    const films = [
      { name: 'interested', usage: 'interested', isFavorite: false },
      { name: 'used', usage: 'used', isFavorite: false },
      { name: 'favorite', usage: 'used', isFavorite: true },
      { name: 'planned', usage: 'planned', isFavorite: false },
    ];
    expect(names(arrangeGear(films, filmView('all')))).toEqual([
      'favorite',
      'used',
      'planned',
      'interested',
    ]);
    expect(names(arrangeGear(films, filmView('favorite')))).toEqual(['favorite']);
  });
});

describe('isCurrent', () => {
  it('when gear is owned and in use, or film has been shot, it must count as current', () => {
    expect(isCurrent({ ownership: 'owned', status: 'active' })).toBe(true);
    expect(isCurrent({ usage: 'used' })).toBe(true);
  });

  it('when gear is in repair, on display, rented, or film is only a candidate, it must not count as current', () => {
    expect(isCurrent({ ownership: 'owned', status: 'repair' })).toBe(false);
    expect(isCurrent({ ownership: 'owned', status: 'display' })).toBe(false);
    expect(isCurrent({ ownership: 'rented', status: 'active' })).toBe(false);
    expect(isCurrent({ usage: 'interested' })).toBe(false);
  });
});
