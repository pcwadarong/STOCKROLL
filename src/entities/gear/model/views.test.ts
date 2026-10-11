import { describe, expect, it } from 'vitest';

import { ANY, arrangeGear, isCurrent } from './views';

const GEAR = [
  { name: 'display', ownership: 'owned', status: 'display' },
  { name: 'rented-shelved', ownership: 'rented', status: 'inactive' },
  { name: 'repair', ownership: 'owned', status: 'repair' },
  { name: 'active', ownership: 'owned', status: 'active' },
  { name: 'shelved', ownership: 'owned', status: 'inactive' },
  { name: 'rented-active', ownership: 'rented', status: 'active' },
];

const FILMS = [
  { name: 'interested', usage: 'interested', isFavorite: false },
  { name: 'used', usage: 'used', isFavorite: false },
  { name: 'favorite', usage: 'used', isFavorite: true },
  { name: 'planned', usage: 'planned', isFavorite: false },
];

const names = (items: readonly { name: string }[]) => items.map(item => item.name);

describe('arrangeGear', () => {
  it('when nothing is picked, it must order gear by status alone, whoever owns it', () => {
    expect(names(arrangeGear(GEAR, {}))).toEqual([
      'active',
      'rented-active',
      'repair',
      'rented-shelved',
      'shelved',
      'display',
    ]);
  });

  it('when the status is In use, rented gear being shot with must be listed too', () => {
    expect(names(arrangeGear(GEAR, { status: 'active' }))).toEqual(['active', 'rented-active']);
  });

  it('when both status and ownership are picked, an item must satisfy both', () => {
    expect(names(arrangeGear(GEAR, { status: 'inactive', ownership: 'owned' }))).toEqual([
      'shelved',
    ]);
  });

  it('when a filter is set to All, it must not narrow the list', () => {
    expect(names(arrangeGear(GEAR, { status: ANY, ownership: 'rented' }))).toEqual([
      'rented-active',
      'rented-shelved',
    ]);
  });

  it('when films are shown, favorites must lead and candidates must follow films that were shot', () => {
    expect(names(arrangeGear(FILMS, {}))).toEqual(['favorite', 'used', 'planned', 'interested']);
  });

  it('when Favorites is picked, it must list only films marked as favorite', () => {
    expect(names(arrangeGear(FILMS, { isFavorite: 'true' }))).toEqual(['favorite']);
  });
});

describe('isCurrent', () => {
  it('when gear is in use, it must count as current even if it is rented', () => {
    expect(isCurrent({ ownership: 'owned', status: 'active' })).toBe(true);
    expect(isCurrent({ ownership: 'rented', status: 'active' })).toBe(true);
  });

  it('when gear is in repair, shelved or on display, it must not count as current', () => {
    expect(isCurrent({ ownership: 'owned', status: 'repair' })).toBe(false);
    expect(isCurrent({ ownership: 'owned', status: 'inactive' })).toBe(false);
    expect(isCurrent({ ownership: 'owned', status: 'display' })).toBe(false);
  });

  it('when a film has been shot it must count as current, and a candidate must not', () => {
    expect(isCurrent({ usage: 'used' })).toBe(true);
    expect(isCurrent({ usage: 'interested' })).toBe(false);
  });
});
