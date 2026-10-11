import { describe, expect, it } from 'vitest';

import {
  blankSettings,
  hasSettings,
  latestVersion,
  type RecipeVersion,
  sameSettings,
  systemOf,
  toSettings,
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
