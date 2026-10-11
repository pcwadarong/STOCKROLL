/** Option value that leaves a fact unfiltered. */
export const ANY = 'all';

export type FilterOption = { value: string; label: string };

/** One fact a list can be narrowed by, shown as a dropdown. */
export type ListFilter = {
  /** Record field the picked value is compared against. */
  key: string;
  label: string;
  options: readonly FilterOption[];
};

/**
 * Builds a filter whose first option is "All".
 * @param key record field to compare
 * @param label name shown above the dropdown
 * @param options the values the field can take
 * @returns a filter starting with the unfiltered option
 */
export const listFilter = (
  key: string,
  label: string,
  options: readonly FilterOption[],
): ListFilter => ({ key, label, options: [{ value: ANY, label: 'All' }, ...options] });

/**
 * Tells whether a record satisfies every picked value. Values are compared as text, so a boolean
 * field is picked with `'true'`. A missing key or `ANY` leaves that fact unfiltered.
 * @param item record to test
 * @param picks picked value per field key
 * @returns true when the record matches all picks
 */
export const matchesPicks = (
  item: Readonly<Record<string, unknown>>,
  picks: Readonly<Record<string, string>>,
) => Object.entries(picks).every(([key, value]) => value === ANY || String(item[key]) === value);

/** Pick that keeps only starred records. */
export const FAVORITES_ONLY = { isFavorite: 'true' } as const;
