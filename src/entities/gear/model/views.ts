import type { ListOrder } from '@/shared/api/collection';
import { type ListFilter, listFilter } from '@/shared/lib/pick-filter';

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
 * Order of the camera and lens lists: by how present an item is in current shooting — in use,
 * then in repair, shelved, on display, rented, sold (`list_rank`, computed by the database) —
 * with favorites leading within each step and the oldest entry first otherwise.
 */
export const GEAR_ORDER: readonly ListOrder[] = [
  { column: 'listRank' },
  { column: 'isFavorite', descending: true },
  { column: 'createdAt' },
];

/** Order of the film list. Films have no status, so the star alone leads. */
export const FILM_ORDER: readonly ListOrder[] = [
  { column: 'isFavorite', descending: true },
  { column: 'createdAt' },
];

/** A record that may carry `status`. Typed loosely because lists hand over rows as they come. */
type Standing = Readonly<Record<string, unknown>>;

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
