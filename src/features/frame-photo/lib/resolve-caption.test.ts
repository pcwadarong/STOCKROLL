import { describe, expect, it } from 'vitest';

import type { Camera, Film, Lens } from '@/entities/gear';
import type { Recipe } from '@/entities/recipe';

import { FROM_EXIF, resolveCaption } from './resolve-caption';

const gear = { ownership: 'owned', status: 'active', mount: null, note: null } as const;
const XT50: Camera = {
  ...gear,
  id: 'c1',
  name: 'Fujifilm X-T50',
  displayName: 'X-T50',
  kind: 'digital',
  filmFormat: null,
};
const CAPIOS: Camera = {
  ...gear,
  id: 'c2',
  name: 'Minolta Capios 125S',
  displayName: null,
  kind: 'film',
  filmFormat: '135',
};
const CANON: Camera = {
  ...gear,
  id: 'c3',
  name: 'Canon EOS 650D',
  displayName: null,
  kind: 'digital',
  filmFormat: null,
};
const ZOOM: Lens = { ...gear, id: 'l1', name: 'Fujinon XF 16-80mm F4 R OIS WR', displayName: null };
const ULTRAMAX: Film = {
  id: 'f1',
  name: 'Kodak UltraMax 400',
  format: '135',
  iso: 400,
  kind: 'color_negative',
  usage: 'used',
  isFavorite: true,
  note: null,
};
const RECIPE: Recipe = {
  id: 'r1',
  name: 'RICH COLOR',
  system: 'fujifilm',
  baseSimulation: 'Velvia / Vivid',
  state: 'active',
  note: null,
  isFavorite: false,
};

const library = {
  cameras: [XT50, CAPIOS, CANON],
  lenses: [ZOOM],
  films: [ULTRAMAX],
  recipes: [RECIPE],
};
const empty = { cameras: [], lenses: [], films: [], recipes: [] };
const FUJI_EXIF = {
  make: 'FUJIFILM',
  model: 'X-T50',
  lens: 'XF16-80mmF4 R OIS WR',
  iso: 1250,
  focalLength: 72,
  aperture: 5.6,
  exposureTime: 1 / 250,
};

describe('resolveCaption', () => {
  it('when nothing is picked and EXIF matches registered gear, it must select that gear and print its alias', () => {
    const result = resolveCaption({}, FUJI_EXIF, 'actual', library);

    expect(result.cameraValue).toBe('c1');
    expect(result.lensValue).toBe('l1');
    expect(result.caption.leftPrimary).toBe('Shot on X-T50');
    expect(result.caption.rightPrimary).toBe('ISO1250 72mm F5.6 1/250s');
  });

  it('when nothing is registered, it must fall back to the EXIF names', () => {
    const result = resolveCaption({}, FUJI_EXIF, 'actual', empty);

    expect(result.cameraValue).toBe(FROM_EXIF);
    expect(result.caption.leftPrimary).toBe('Shot on FUJIFILM X-T50');
    expect(result.caption.leftSecondary).toBe('XF16-80mmF4 R OIS WR');
  });

  it('when the user clears the camera, it must print no camera and offer no look even though EXIF has one', () => {
    const result = resolveCaption({ camera: '' }, FUJI_EXIF, 'actual', library);

    expect(result.caption.leftPrimary).toBe('');
    expect(result.lookField).toBe('none');
  });

  it('when the camera is a Fujifilm digital body, the look slot must be the recipe and ignore any film pick', () => {
    const result = resolveCaption({ look: 'recipe:r1', film: 'f1' }, FUJI_EXIF, 'actual', library);

    expect(result.lookField).toBe('recipe');
    expect(result.system).toBe('fujifilm');
    expect(result.caption.rightSecondary).toBe('RICH COLOR');
  });

  it('when a plain simulation is picked, it must print the simulation name', () => {
    const result = resolveCaption({ look: 'sim:ETERNA / Cinema' }, FUJI_EXIF, 'actual', library);

    expect(result.caption.rightSecondary).toBe('ETERNA / Cinema');
  });

  it('when a Fujifilm simulation is still picked after switching to another camera system, it must not be printed', () => {
    const result = resolveCaption(
      { camera: 'c3', look: 'sim:Velvia / Vivid' },
      {},
      'actual',
      library,
    );

    expect(result.caption.rightSecondary).toBe('');
    expect(result.lookValue).toBe('');
  });

  it('when the camera is a film camera, the look slot must be the film stock and ignore any recipe pick', () => {
    const result = resolveCaption(
      { camera: 'c2', film: 'f1', look: 'recipe:r1' },
      {},
      'actual',
      library,
    );

    expect(result.lookField).toBe('film');
    expect(result.caption.rightSecondary).toBe('Kodak UltraMax 400');
  });

  it('when the file came from a scanner and no camera is picked, the look slot must still be film', () => {
    const result = resolveCaption({}, { scanner: 'NORITSU KOKI EZ Controller' }, 'actual', library);

    expect(result.lookField).toBe('film');
    expect(result.caption.leftPrimary).toBe('');
  });

  it('when the camera belongs to another system, a recipe written for Fujifilm must not be printed', () => {
    const result = resolveCaption({ camera: 'c3', look: 'recipe:r1' }, {}, 'actual', library);

    expect(result.lookField).toBe('recipe');
    expect(result.system).toBe('canon');
    expect(result.caption.rightSecondary).toBe('');
  });

  it('when one exposure value is typed by hand, it must replace only that slot and keep the rest from EXIF', () => {
    const result = resolveCaption({ aperture: '8' }, FUJI_EXIF, 'actual', library);

    expect(result.caption.rightPrimary).toBe('ISO1250 72mm F8 1/250s');
    expect(result.exposure).toEqual({ iso: '1250', focal: '72', aperture: '8', shutter: '1/250' });
  });

  it('when an exposure value is cleared or is not a number, that slot must be hidden instead of refilled from EXIF', () => {
    const result = resolveCaption({ iso: '', shutter: 'fast' }, FUJI_EXIF, 'actual', library);

    expect(result.caption.rightPrimary).toBe('72mm F5.6');
  });

  it('when a shutter speed is typed as a fraction or as seconds, it must be printed in shutter notation', () => {
    expect(resolveCaption({ shutter: '1/60' }, {}, 'actual', library).caption.rightPrimary).toBe(
      '1/60s',
    );
    expect(resolveCaption({ shutter: '2' }, {}, 'actual', library).caption.rightPrimary).toBe('2s');
  });
});
