import { describe, expect, it } from 'vitest';

import { FAVORITES_ONLY } from '@/shared/lib/pick-filter';

import { arrangeGear, statusNote } from './views';

const GEAR = [
  { name: 'sold', status: 'sold', isFavorite: false },
  { name: 'display', status: 'display', isFavorite: false },
  { name: 'rented', status: 'rented', isFavorite: false },
  { name: 'repair', status: 'repair', isFavorite: false },
  { name: 'active', status: 'active', isFavorite: false },
  { name: 'shelved', status: 'inactive', isFavorite: false },
  { name: 'active-favorite', status: 'active', isFavorite: true },
];

const FILMS = [
  { name: 'plain', kind: 'bw', isFavorite: false },
  { name: 'favorite', kind: 'cine', isFavorite: true },
  { name: 'plain-2', kind: 'bw', isFavorite: false },
];

const names = (items: readonly { name: string }[]) => items.map(item => item.name);

describe('arrangeGear', () => {
  it('when nothing is picked, gear in use must lead, favorites first, and sold gear must come last', () => {
    expect(names(arrangeGear(GEAR, {}))).toEqual([
      'active-favorite',
      'active',
      'repair',
      'shelved',
      'display',
      'rented',
      'sold',
    ]);
  });

  it('when a status is picked, it must list only gear in that status', () => {
    expect(names(arrangeGear(GEAR, { status: 'active' }))).toEqual(['active-favorite', 'active']);
  });

  it('when records carry no status, favorites must lead and the rest keep their order', () => {
    expect(names(arrangeGear(FILMS, {}))).toEqual(['favorite', 'plain', 'plain-2']);
  });

  it('when favorites only is picked together with a type, both must hold', () => {
    expect(names(arrangeGear(FILMS, { kind: 'bw', ...FAVORITES_ONLY }))).toEqual([]);
    expect(names(arrangeGear(FILMS, { kind: 'cine', ...FAVORITES_ONLY }))).toEqual(['favorite']);
  });
});

describe('statusNote', () => {
  it('when gear is in use, there must be nothing to say', () => {
    expect(statusNote({ status: 'active' })).toBeUndefined();
  });

  it('when gear is in repair, the note must be an alert', () => {
    expect(statusNote({ status: 'repair' })).toEqual({ label: 'In repair', tone: 'alert' });
  });

  it('when gear is shelved, on display, rented or sold, the note must be muted', () => {
    expect(statusNote({ status: 'display' })).toEqual({ label: 'Display only', tone: 'muted' });
    expect(statusNote({ status: 'rented' })?.tone).toBe('muted');
  });

  it('when a record has no status, such as a film, there must be no note', () => {
    expect(statusNote({ kind: 'bw' })).toBeUndefined();
  });
});
