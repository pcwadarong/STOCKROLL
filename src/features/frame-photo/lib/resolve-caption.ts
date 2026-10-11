import { type Camera, type Film, gearLabel, type Lens, matchGear } from '@/entities/gear';
import {
  type ExifInfo,
  type FocalMode,
  formatCamera,
  formatExposure,
  formatShutter,
  parseShutter,
} from '@/entities/photo';
import { type Recipe, systemOf, systemOfCamera, SYSTEMS } from '@/entities/recipe';

import type { Picks } from './photo-queue';

/** Option value meaning "use what EXIF says". Registered gear uses its id as the value. */
export const FROM_EXIF = 'exif';

type Library = {
  cameras: readonly Camera[];
  lenses: readonly Lens[];
  films: readonly Film[];
  recipes: readonly Recipe[];
};

const resolveGear = <T extends { id: string; name: string; displayName: string | null }>(
  pick: string | undefined,
  items: readonly T[],
  exifName: string,
) => {
  // Not chosen yet: prefer registered gear matching EXIF (so its alias is used), then raw EXIF.
  const value = pick ?? matchGear(items, exifName)?.id ?? (exifName ? FROM_EXIF : '');
  const gear = items.find(item => item.id === value);
  const text = gear ? gearLabel(gear) : value === FROM_EXIF ? exifName : '';
  return { value, gear, text };
};

/** A hand-typed number, or undefined when the field is empty or not a number. */
const typedNumber = (text: string) => {
  const value = Number(text.trim());
  return text.trim() !== '' && Number.isFinite(value) && value > 0 ? value : undefined;
};

const shown = (value: number | undefined, digits = 0) =>
  value === undefined ? '' : String(Number(value.toFixed(digits)));

/**
 * Narrows the batch-wide focal mode to what one photo can honestly show. 35mm equivalent is only
 * valid for a photo whose camera recorded it; for any other photo the mode is `actual`, so an
 * actual focal length is never presented as an equivalent.
 * @param mode focal mode chosen for the whole batch
 * @param exif shooting info of one photo
 * @returns `35mm` only when it was chosen and this photo records the value
 */
export const focalModeFor = (mode: FocalMode, exif: ExifInfo): FocalMode =>
  mode === '35mm' && exif.focalLength35 !== undefined ? '35mm' : 'actual';

/**
 * Works out what each caption slot shows from the user's picks, the registered library and EXIF.
 *
 * Film and a camera's look are different facts and never share a slot: a film camera shows the
 * film stock, a digital camera shows a recipe or look of its own system, and with no camera
 * there is no look at all. Exposure values typed by hand replace EXIF one slot at a time; a slot
 * cleared by hand is hidden rather than refilled.
 * @param picks explicit choices; missing ones fall back to EXIF
 * @param exif shooting info read from the file
 * @param focalMode actual or 35mm-equivalent focal length
 * @param library registered gear and recipes
 * @returns selected option values, caption strings, exposure field values and the look field kind
 */
export const resolveCaption = (
  picks: Picks,
  exif: ExifInfo,
  focalMode: FocalMode,
  library: Library,
) => {
  const exifCamera = formatCamera(exif.make, exif.model);
  const camera = resolveGear(picks.camera, library.cameras, exifCamera);
  const lens = resolveGear(picks.lens, library.lenses, exif.lens ?? '');

  const exifFocal =
    focalMode === '35mm' ? (exif.focalLength35 ?? exif.focalLength) : exif.focalLength;
  const merged: ExifInfo = {
    iso: picks.iso === undefined ? exif.iso : typedNumber(picks.iso),
    focalLength: picks.focal === undefined ? exifFocal : typedNumber(picks.focal),
    aperture: picks.aperture === undefined ? exif.aperture : typedNumber(picks.aperture),
    exposureTime: picks.shutter === undefined ? exif.exposureTime : parseShutter(picks.shutter),
  };

  const kind = camera.gear?.kind ?? (camera.value === FROM_EXIF ? 'digital' : undefined);
  // A scanner-made file with no camera chosen yet is still certainly film.
  const lookField: 'film' | 'recipe' | 'none' =
    kind === 'film' || (!kind && exif.scanner) ? 'film' : kind === 'digital' ? 'recipe' : 'none';
  const system = systemOfCamera(camera.gear?.name ?? exifCamera);

  const film = library.films.find(item => item.id === picks.film);
  const look = picks.look ?? '';
  const recipe = library.recipes.find(
    item => `recipe:${item.id}` === look && systemOf(item) === system,
  );
  // A plain look is only valid for the system that offers it. A pick left over from a previous
  // camera (a Fujifilm simulation after switching to a Ricoh) is dropped, not printed.
  const plainLook = look.startsWith('sim:') ? look.slice(4) : '';
  const lookText = recipe?.name ?? (SYSTEMS[system].baseLooks.includes(plainLook) ? plainLook : '');

  return {
    exifCamera,
    exifLens: exif.lens ?? '',
    cameraValue: camera.value,
    lensValue: lens.value,
    filmValue: film?.id ?? '',
    lookValue: lookText ? look : '',
    lookField,
    system,
    /** What each exposure input shows: the hand-typed text, else the EXIF value. */
    exposure: {
      iso: picks.iso ?? shown(exif.iso),
      focal: picks.focal ?? shown(exifFocal, 1),
      aperture: picks.aperture ?? shown(exif.aperture, 1),
      shutter:
        picks.shutter ?? (exif.exposureTime ? formatShutter(exif.exposureTime).slice(0, -1) : ''),
    },
    caption: {
      leftPrimary: camera.text ? `Shot on ${camera.text}` : '',
      leftSecondary: lens.text,
      rightPrimary: formatExposure(merged, 'actual'),
      rightSecondary:
        lookField === 'film' ? (film?.name ?? '') : lookField === 'recipe' ? lookText : '',
    },
  };
};
