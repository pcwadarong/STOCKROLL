/**
 * A way of narrowing a gear list. `match` decides membership; the list order and which rows are
 * dimmed come from `standing`, so "what I shoot with now" always reads first.
 */
export type GearView = { value: string; label: string; match: (item: Standing) => boolean };

/**
 * Any record carrying `ownership`/`status` (cameras, lenses) or `usage`/`isFavorite` (films).
 * Typed loosely because lists hand over rows as they come from a form or the database; anything
 * that is not the expected value simply does not match.
 */
type Standing = Readonly<Record<string, unknown>>;

const mine = (item: Standing) => item.ownership === 'owned';

/** Views for cameras and lenses. Ownership and status are separate facts, so each gets its own. */
export const GEAR_VIEWS: readonly GearView[] = [
  { value: 'all', label: 'All', match: () => true },
  { value: 'active', label: 'In use', match: item => mine(item) && item.status === 'active' },
  { value: 'repair', label: 'In repair', match: item => item.status === 'repair' },
  { value: 'display', label: 'Display only', match: item => item.status === 'display' },
  {
    value: 'inactive',
    label: 'Not in use',
    match: item => mine(item) && item.status === 'inactive',
  },
  { value: 'not-owned', label: 'Rented or gone', match: item => !mine(item) },
];

export const FILM_VIEWS: readonly GearView[] = [
  { value: 'all', label: 'All', match: () => true },
  { value: 'favorite', label: 'Favorites', match: item => item.isFavorite === true },
  { value: 'used', label: 'Used', match: item => item.usage === 'used' },
  { value: 'planned', label: 'Planned', match: item => item.usage === 'planned' },
  { value: 'interested', label: 'Interested', match: item => item.usage === 'interested' },
];

const STATUS_RANK: Record<string, number> = { active: 0, repair: 1, inactive: 2, display: 3 };
const USAGE_RANK: Record<string, number> = { used: 0, planned: 1, interested: 2 };

/**
 * Ranks an item by how present it is in current shooting. Lower sorts first.
 * Owned gear in use leads; gear in repair, shelved or kept for display follows; gear that was
 * rented, borrowed or sold comes last. Films go used, planned, interested, favorites first.
 * @param item camera, lens or film
 * @returns a sort rank
 */
export const standing = (item: Standing) => {
  if (typeof item.usage === 'string')
    return (item.isFavorite === true ? 0 : 1) + (USAGE_RANK[item.usage] ?? 3) * 2;
  return (mine(item) ? 0 : 10) + (STATUS_RANK[String(item.status ?? '')] ?? 4);
};

/**
 * Tells whether an item is part of current shooting. Lists dim the rest so the eye lands on what
 * is in the bag, without hiding the record of everything else.
 * @param item camera, lens or film
 * @returns true for owned gear in use, and for film that has been shot
 */
export const isCurrent = (item: Standing) =>
  typeof item.usage === 'string' ? item.usage === 'used' : mine(item) && item.status === 'active';

/**
 * Applies a view and orders the result by standing, keeping the original order within a rank.
 * @param items list to show
 * @param view the selected view
 * @returns matching items, most current first
 */
export const arrangeGear = <T extends Standing>(items: readonly T[], view: GearView) =>
  items
    .filter(view.match)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => standing(a.item) - standing(b.item) || a.index - b.index)
    .map(({ item }) => item);
