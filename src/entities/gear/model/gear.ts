import { createCollection } from '@/shared/api/collection';

export type Ownership = 'owned' | 'rented' | 'borrowed' | 'sold';
export type GearStatus = 'active' | 'inactive' | 'repair' | 'display';

export type Camera = {
  id: string;
  /** Model name as printed by the maker, e.g. "Fujifilm X-T50" */
  name: string;
  /** Alias shown on the frame. Falls back to `name`. */
  displayName: string | null;
  kind: 'digital' | 'film';
  mount: string | null;
  filmFormat: '135' | '120' | null;
  ownership: Ownership;
  status: GearStatus;
  note: string | null;
};

export type Lens = {
  id: string;
  name: string;
  displayName: string | null;
  mount: string | null;
  ownership: Ownership;
  status: GearStatus;
  note: string | null;
};

export type Film = {
  id: string;
  name: string;
  format: '135' | '120';
  iso: number | null;
  kind: 'color_negative' | 'bw' | 'slide';
  /** `used` only for film actually shot. Candidates stay `planned` or `interested`. */
  usage: 'used' | 'planned' | 'interested';
  isFavorite: boolean;
  note: string | null;
};

export const cameraCollection = createCollection<Camera>('cameras');
export const lensCollection = createCollection<Lens>('lenses');
export const filmCollection = createCollection<Film>('films');

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Text to print on the frame for a camera or lens.
 * @param gear camera or lens
 * @returns the display alias when set, otherwise the model name
 */
export const gearLabel = (gear: { name: string; displayName: string | null }) =>
  gear.displayName?.trim() || gear.name;

/**
 * Finds the registered camera or lens that an EXIF name refers to.
 * After ignoring case, spaces and punctuation the two names must be equal, or one must end with
 * the other — which is what a leading maker name looks like ("FUJIFILM X-T50" vs "X-T50").
 * Plain containment is not enough: "X-T5" is contained in "X-T50" but is a different camera.
 * @param items registered gear
 * @param exifName name read from EXIF
 * @returns the matching gear, or undefined when nothing matches
 */
export const matchGear = <T extends { name: string }>(items: readonly T[], exifName: string) => {
  const target = normalize(exifName);
  if (!target) return undefined;
  return items.find(item => {
    const name = normalize(item.name);
    return name !== '' && (name.endsWith(target) || target.endsWith(name));
  });
};
