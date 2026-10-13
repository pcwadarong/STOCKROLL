import { toCamel, toSnake } from '../lib/case';
import { likePattern, searchWords } from '../lib/search';

import { supabase } from './supabase';

export type Row = { id: string };
export type Draft<T extends Row> = Omit<T, 'id'> & { id?: string };

/** One column a list is ordered by. Columns are named as in the app (camelCase). */
export type ListOrder = { column: string; descending?: boolean };

/** What a list screen asks for: which records, in what order, and which stretch of them. */
export type ListQuery = {
  /** Exact value per field, compared as text (a boolean is `'true'`). Unlisted fields are free. */
  filters?: Readonly<Record<string, string>>;
  /** What the user typed. Every word must be found in the record's text. */
  search?: string;
  order: readonly ListOrder[];
  /** First and last position to return, counted from 0, both included. */
  from: number;
  to: number;
};

export type Collection<T extends Row> = {
  /**
   * Lists every record the signed-in user owns, oldest first. Empty when signed out. For screens
   * that need the whole set at once (matching gear to a photo, choosing recipes for a strip); a
   * list screen uses `page`.
   */
  list: () => Promise<T[]>;
  /**
   * Reads one stretch of a narrowed, ordered list, with the number of records that match in all.
   * Empty when signed out. A stretch that starts past the last match comes back empty with a
   * total of 0 — read from the start again to learn the real total.
   */
  page: (query: ListQuery) => Promise<{ rows: T[]; total: number }>;
  /** Counts the records that hold the given values, without reading them. 0 when signed out. */
  count: (filters?: Readonly<Record<string, string>>) => Promise<number>;
  /** Reads one record, or null when it does not exist (or the user is signed out). */
  get: (id: string) => Promise<T | null>;
  /** Reads the records whose field holds one of the values, in no promised order. */
  where: (field: string, values: readonly string[]) => Promise<T[]>;
  /** Inserts the draft when it has no id, otherwise updates that record. Requires sign-in. */
  save: (draft: Draft<T>) => Promise<T>;
  /** Deletes one record for good. Requires sign-in. */
  remove: (id: string) => Promise<void>;
};

/** PostgREST's code for a requested range that begins after the last row. */
const PAST_THE_END = 'PGRST103';

/** Postgres's code for text that cannot be read as the column's type, here a uuid. */
const NOT_AN_ID = '22P02';

/** The API returns at most this many rows per request, so reading everything takes several. */
const CHUNK = 1000;

// Computed by the database (supabase/migrations). They come back with every row, and Postgres
// rejects a write that names them, so they are left out of what is saved.
const DERIVED = ['searchText', 'listRank'];

const column = (field: string) => Object.keys(toSnake({ [field]: null }))[0]!;

const hasSession = async () =>
  supabase ? (await supabase.auth.getSession()).data.session !== null : false;

/**
 * Creates a record store for one Supabase table. Row-level security limits records to their owner.
 * Records exist only for signed-in users: there is no device-local copy, so a signed-out visitor
 * sees an empty list and cannot save.
 * @param table Postgres table name
 * @returns read, save and remove operations
 */
export const createCollection = <T extends Row>(table: string): Collection<T> => ({
  list: async () => {
    if (!supabase || !(await hasSession())) return [];
    const rows: T[] = [];
    // `id` settles the order of records created in the same instant, so no row is read twice or
    // skipped between two requests.
    for (let from = 0; ; from += CHUNK) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at')
        .order('id')
        .range(from, from + CHUNK - 1);
      if (error) throw new Error(error.message);
      rows.push(...data.map(row => toCamel(row) as T));
      if (data.length < CHUNK) return rows;
    }
  },

  page: async ({ filters = {}, search = '', order, from, to }) => {
    if (!supabase || !(await hasSession())) return { rows: [], total: 0 };
    let query = supabase.from(table).select('*', { count: 'exact' });
    for (const [field, value] of Object.entries(filters)) query = query.eq(column(field), value);
    for (const word of searchWords(search)) query = query.like('search_text', likePattern(word));
    for (const { column: field, descending } of order)
      query = query.order(column(field), { ascending: !descending });
    // Same tie-break as `list`, so a step never repeats or drops a row.
    const { data, error, count } = await query.order('id').range(from, to);
    // Asking for a stretch that starts past the last match is an error to the API, not an empty
    // answer. It happens when records were deleted elsewhere after the list was read.
    if (error?.code === PAST_THE_END) return { rows: [], total: 0 };
    if (error) throw new Error(error.message);
    return { rows: data.map(row => toCamel(row) as T), total: count ?? data.length };
  },

  count: async (filters = {}) => {
    if (!supabase || !(await hasSession())) return 0;
    let query = supabase.from(table).select('id', { count: 'exact', head: true });
    for (const [field, value] of Object.entries(filters)) query = query.eq(column(field), value);
    const { error, count } = await query;
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  get: async id => {
    if (!supabase || !(await hasSession())) return null;
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    // An id that is not an id at all (a mistyped address) names no record, like any unknown id.
    if (error?.code === NOT_AN_ID) return null;
    if (error) throw new Error(error.message);
    return data ? (toCamel(data) as T) : null;
  },

  where: async (field, values) => {
    if (!supabase || values.length === 0 || !(await hasSession())) return [];
    const { data, error } = await supabase.from(table).select('*').in(column(field), values);
    if (error) throw new Error(error.message);
    return data.map(row => toCamel(row) as T);
  },

  save: async draft => {
    if (!supabase || !(await hasSession())) throw new Error('Sign in to save records');

    const { id, ...values } = draft;
    const payload = toSnake(
      Object.fromEntries(Object.entries(values).filter(([key]) => !DERIVED.includes(key))),
    );
    const query = id
      ? supabase.from(table).update(payload).eq('id', id)
      : supabase.from(table).insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return toCamel(data) as T;
  },

  remove: async id => {
    if (!supabase || !(await hasSession())) throw new Error('Sign in to delete records');
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
});
