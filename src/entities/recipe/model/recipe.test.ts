import { describe, expect, it } from 'vitest';

import {
  blankSettings,
  foldVersions,
  hasSettings,
  latestVersion,
  MAX_VERSIONS,
  recipeNote,
  type RecipeVersion,
  sameSettings,
  systemOf,
  toSettings,
  versionSlots,
  versionsOf,
} from './recipe';
import { systemOfCamera } from './systems';

const version = (recipeId: string, number: number): RecipeVersion => ({
  id: `${recipeId}-${number}`,
  recipeId,
  version: number,
  settings: {},
  sourceUrl: null,
});

describe('latestVersion', () => {
  it('when a recipe has several versions, it must return the highest version number', () => {
    const versions = [version('a', 1), version('a', 3), version('a', 2), version('b', 9)];
    expect(latestVersion(versions, 'a')?.version).toBe(3);
  });

  it('when a recipe has no version yet, it must return undefined', () => {
    expect(latestVersion([version('b', 1)], 'a')).toBeUndefined();
  });
});

describe('versionsOf', () => {
  it('when versions arrive in any order, it must list only that recipe newest first', () => {
    const versions = [version('a', 1), version('b', 5), version('a', 3), version('a', 2)];
    expect(versionsOf(versions, 'a').map(item => item.version)).toEqual([3, 2, 1]);
  });
});

describe('foldVersions', () => {
  const history = [9, 8, 7, 6, 5, 4, 3, 2, 1].map(number => version('a', number));

  it('when the history is short, it must list every version and fold nothing', () => {
    expect(foldVersions(history.slice(0, 5), 'a-9', false)).toMatchObject({ hidden: 0 });
  });

  it('when the history is long, it must list the newest five and count the rest', () => {
    const { shown, hidden } = foldVersions(history, 'a-9', false);
    expect(shown.map(item => item.version)).toEqual([9, 8, 7, 6, 5]);
    expect(hidden).toBe(4);
  });

  it('when the version on screen is an old one, it must stay listed while folded', () => {
    const { shown, hidden } = foldVersions(history, 'a-2', false);
    expect(shown.map(item => item.version)).toEqual([9, 8, 7, 6, 5, 2]);
    expect(hidden).toBe(3);
  });

  it('when expanded, it must list the whole history', () => {
    expect(foldVersions(history, 'a-2', true)).toMatchObject({ hidden: 0 });
    expect(foldVersions(history, 'a-2', true).shown).toHaveLength(9);
  });
});

describe('versionSlots', () => {
  it('when a recipe has few versions, it must not flag the remaining count', () => {
    expect(versionSlots(3)).toEqual({ used: 3, left: MAX_VERSIONS - 3, full: false, low: false });
  });

  it('when five or fewer slots remain, it must flag that the cap is near', () => {
    expect(versionSlots(MAX_VERSIONS - 5).low).toBe(true);
    expect(versionSlots(MAX_VERSIONS - 1)).toMatchObject({ left: 1, full: false, low: true });
  });

  it('when the cap is reached, it must report full instead of low', () => {
    expect(versionSlots(MAX_VERSIONS)).toMatchObject({ left: 0, full: true, low: false });
  });
});

describe('recipeNote', () => {
  it('when a recipe is in the camera, there must be nothing to say', () => {
    expect(recipeNote({ state: 'active' })).toBeUndefined();
  });

  it('when a recipe is a candidate or archived, the note must name the state, muted', () => {
    expect(recipeNote({ state: 'candidate' })).toEqual({ label: 'Candidate', tone: 'muted' });
    expect(recipeNote({ state: 'archived' })).toEqual({ label: 'Archived', tone: 'muted' });
  });
});

describe('sameSettings', () => {
  it('when one side omits a setting and the other holds a blank, they must count as equal', () => {
    expect(sameSettings({ color: '+2' }, { color: '+2', clarity: ' ' })).toBe(true);
  });

  it('when a single value differs, they must count as different', () => {
    expect(sameSettings({ color: '+2' }, { color: '+3' })).toBe(false);
  });

  it('when a setting exists on only one side with a value, they must count as different', () => {
    expect(sameSettings({ hue: '+1' }, {})).toBe(false);
  });
});

describe('toSettings', () => {
  it('when form values contain blanks and unknown keys, it must keep only filled-in settings', () => {
    expect(toSettings('fujifilm', { color: ' +2 ', clarity: '', name: 'ignored' })).toEqual({
      color: '+2',
    });
  });

  it('when values hold fields of another system, it must drop them', () => {
    expect(toSettings('ricoh', { colorChrome: 'Strong', hue: '+1' })).toEqual({ hue: '+1' });
  });
});

describe('blankSettings', () => {
  it('when a recipe switches system, the blanks must cover keys shared by several systems and keys unique to one', () => {
    const blanks = blankSettings();

    expect(blanks.simulation).toBe('');
    expect(blanks.colorChrome).toBe('');
    expect(blanks.highLowKey).toBe('');
    expect(toSettings('ricoh', { simulation: 'Classic Chrome', ...blanks })).toEqual({});
  });
});

describe('hasSettings', () => {
  it('when nothing or only blanks were entered, it must report no settings', () => {
    expect(hasSettings({})).toBe(false);
    expect(hasSettings({ color: '  ' })).toBe(false);
  });

  it('when one setting has a value, it must report settings', () => {
    expect(hasSettings({ color: '+2' })).toBe(true);
  });
});

describe('systemOf', () => {
  it('when a recipe was saved before systems existed, it must be treated as Fujifilm', () => {
    expect(systemOf({})).toBe('fujifilm');
    expect(systemOf({ system: 'ricoh' })).toBe('ricoh');
  });
});

describe('systemOfCamera', () => {
  it.each([
    ['FUJIFILM X-T50', 'fujifilm'],
    ['RICOH GR IIIx', 'ricoh'],
    ['Apple iPhone 16 Pro', 'iphone'],
    ['Canon EOS 650D', 'canon'],
    ['NIKON Z f', 'nikon'],
    ['SONY ILCE-7M4', 'sony'],
    ['Panasonic DC-S5M2', 'panasonic'],
    ['OM Digital Solutions OM-1', 'olympus'],
    ['samsung SM-S928N', 'galaxy'],
    ['Samsung Galaxy S24 Ultra', 'galaxy'],
    ['Samsung VLUU ST80', 'other'],
    ['LEICA Q3', 'other'],
  ])('when the camera is %s, its recipe system must be %s', (name, system) => {
    expect(systemOfCamera(name)).toBe(system);
  });
});
