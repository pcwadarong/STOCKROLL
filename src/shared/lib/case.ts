const mapKeys = (row: Record<string, unknown>, convert: (key: string) => string) =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [convert(key), value]));

/**
 * Converts the top-level keys of a database row from snake_case to camelCase.
 * @param row row as stored in Postgres
 * @returns the same values under camelCase keys
 */
export const toCamel = (row: Record<string, unknown>) =>
  mapKeys(row, key => key.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase()));

/**
 * Converts the top-level keys of an object from camelCase to snake_case.
 * @param row object as used in the app
 * @returns the same values under snake_case keys
 */
export const toSnake = (row: Record<string, unknown>) =>
  mapKeys(row, key => key.replace(/[A-Z]/g, char => `_${char.toLowerCase()}`));
