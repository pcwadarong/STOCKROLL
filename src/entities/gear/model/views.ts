import { type ListFilter, listFilter, matchesPicks } from '@/shared/lib/pick-filter';

import { BODY_TYPE, CAMERA_KIND, FILM_KIND, FORMAT, STATUS } from './fields';

/** Dropdowns above the camera list. */
export const CAMERA_FILTERS: readonly ListFilter[] = [
  listFilter('kind', 'Type', CAMERA_KIND),
  listFilter('bodyType', 'Body', BODY_TYPE),
  listFilter('status', 'Status', STATUS),
];

/** Dropdowns above the lens list. */
export const LENS_FILTERS: readonly ListFilter[] = [listFilter('status', 'Status', STATUS)];

/** Dropdowns above the film list. */
export const FILM_FILTERS: readonly ListFilter[] = [
  listFilter('kind', 'Type', FILM_KIND),
  listFilter('format', 'Format', FORMAT),
];

/**
 * Any record that may carry `status` (cameras, lenses) and `isFavorite`. Typed loosely because
 * lists hand over rows as they come from a form or the database.
 */
type Standing = Readonly<Record<string, unknown>>;

const STATUS_RANK: Record<string, number> = {
  active: 0,
  repair: 1,
  inactive: 2,
  display: 3,
  rented: 4,
  sold: 5,
};

/**
 * Ranks an item by how present it is in current shooting. Lower sorts first: gear in use, then
 * in repair, shelved, on display, rented, sold. Favorites lead within each step. Records with no
 * status (films) are ranked by the star alone.
 * @param item camera, lens or film
 * @returns a sort rank
 */
export const standing = (item: Standing) =>
  (STATUS_RANK[String(item.status ?? 'active')] ?? 6) * 2 + (item.isFavorite === true ? 0 : 1);

/**
 * Words the status of gear that is not simply in use, for the line under its name.
 * `alert` is for something that needs doing (a repair); the rest is plain background.
 * @param item camera or lens
 * @returns the label and its tone, or undefined for gear in use and for records with no status
 */
export const statusNote = (item: Standing) => {
  if (typeof item.status !== 'string' || item.status === 'active') return undefined;
  const label = STATUS.find(option => option.value === item.status)?.label;
  if (!label) return undefined;
  return { label, tone: item.status === 'repair' ? ('alert' as const) : ('muted' as const) };
};

/**
 * Narrows a list by the picked values and orders the result by standing, keeping the original
 * order within a rank.
 * @param items list to show
 * @param picks picked value per filter key
 * @returns matching items, most current first
 */
export const arrangeGear = <T extends Standing>(
  items: readonly T[],
  picks: Readonly<Record<string, string>>,
) =>
  items
    .filter(item => matchesPicks(item, picks))
    .map((item, index) => ({ item, index }))
    .sort((a, b) => standing(a.item) - standing(b.item) || a.index - b.index)
    .map(({ item }) => item);
