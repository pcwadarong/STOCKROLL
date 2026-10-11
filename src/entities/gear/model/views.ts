import { OWNERSHIP, STATUS, USAGE } from './fields';

/** Chip value that leaves a fact unfiltered. */
export const ANY = '';

/**
 * One fact a gear list can be narrowed by. Each filter is its own row of chips, because the facts
 * are independent: a rented camera can be in use, an owned one can be in repair.
 */
export type GearFilter = {
  /** Record field the chips compare against. */
  key: string;
  label: string;
  options: readonly { value: string; label: string }[];
};

const withAny = (options: readonly { value: string; label: string }[]) => [
  { value: ANY, label: 'All' },
  ...options,
];

/** Filters for cameras and lenses. */
export const GEAR_FILTERS: readonly GearFilter[] = [
  { key: 'status', label: 'Status', options: withAny(STATUS) },
  { key: 'ownership', label: 'Ownership', options: withAny(OWNERSHIP) },
];

/**
 * Filters for films, which have no owner or condition: only whether they were shot.
 * Favorites are narrowed by a star toggle beside the chips, through the `isFavorite` pick.
 */
export const FILM_FILTERS: readonly GearFilter[] = [
  { key: 'usage', label: 'Usage', options: withAny(USAGE) },
];

/** Pick that keeps only favorites, for sections whose items can be starred. */
export const FAVORITES_ONLY = { isFavorite: 'true' } as const;

/**
 * Any record carrying `status` (cameras, lenses) or `usage`/`isFavorite` (films).
 * Typed loosely because lists hand over rows as they come from a form or the database; anything
 * that is not the expected value simply does not match.
 */
type Standing = Readonly<Record<string, unknown>>;

const STATUS_RANK: Record<string, number> = { active: 0, repair: 1, inactive: 2, display: 3 };
const USAGE_RANK: Record<string, number> = { used: 0, planned: 1, interested: 2 };

/**
 * Ranks an item by how present it is in current shooting. Lower sorts first.
 * Gear goes in use, in repair, shelved, display only. Ownership plays no part: a rented camera
 * being shot with is as current as an owned one. Films go used, planned, interested, favorites
 * first within each.
 * @param item camera, lens or film
 * @returns a sort rank
 */
export const standing = (item: Standing) => {
  if (typeof item.usage === 'string')
    return (item.isFavorite === true ? 0 : 1) + (USAGE_RANK[item.usage] ?? 3) * 2;
  return STATUS_RANK[String(item.status ?? '')] ?? 4;
};

/**
 * Tells whether an item is part of current shooting. Lists dim the rest so the eye lands on what
 * is in the bag, without hiding the record of everything else.
 * @param item camera, lens or film
 * @returns true for gear in use, and for film that has been shot
 */
export const isCurrent = (item: Standing) =>
  typeof item.usage === 'string' ? item.usage === 'used' : item.status === 'active';

/**
 * Narrows a list by the picked chips and orders the result by standing, keeping the original
 * order within a rank.
 * @param items list to show
 * @param picks picked value per filter key. A missing key or `ANY` leaves that fact unfiltered
 * @returns matching items, most current first
 */
export const arrangeGear = <T extends Standing>(
  items: readonly T[],
  picks: Readonly<Record<string, string>>,
) =>
  items
    .filter(item =>
      Object.entries(picks).every(([key, value]) => value === ANY || String(item[key]) === value),
    )
    .map((item, index) => ({ item, index }))
    .sort((a, b) => standing(a.item) - standing(b.item) || a.index - b.index)
    .map(({ item }) => item);
