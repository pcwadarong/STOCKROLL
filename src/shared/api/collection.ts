import { toCamel, toSnake } from '../lib/case';

import { supabase } from './supabase';

export type Row = { id: string };
export type Draft<T extends Row> = Omit<T, 'id'> & { id?: string };

export type Collection<T extends Row> = {
  /** Lists every record the current user owns, oldest first. */
  list: () => Promise<T[]>;
  /** Inserts the draft when it has no id, otherwise updates that record. */
  save: (draft: Draft<T>) => Promise<T>;
};

const storageKey = (table: string) => `stockroll:${table}`;

const readLocal = <T>(table: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(storageKey(table)) ?? '[]') as T[];
  } catch {
    return [];
  }
};

const hasSession = async () =>
  supabase ? (await supabase.auth.getSession()).data.session !== null : false;

/**
 * Creates a record store for one table.
 * Signed in, records live in Supabase (row-level security limits them to the owner).
 * Signed out, they live in this browser's localStorage so the app stays usable without an account.
 * The two stores are separate: local records are not uploaded on sign-in.
 * @param table Postgres table name, also used as the localStorage namespace
 * @returns list and save operations
 */
export const createCollection = <T extends Row>(table: string): Collection<T> => ({
  list: async () => {
    if (!supabase || !(await hasSession())) return readLocal<T>(table);
    const { data, error } = await supabase.from(table).select('*').order('created_at');
    if (error) throw new Error(error.message);
    return data.map(row => toCamel(row) as T);
  },

  save: async draft => {
    if (!supabase || !(await hasSession())) {
      const rows = readLocal<T>(table);
      const saved = { ...draft, id: draft.id ?? crypto.randomUUID() } as T;
      const next = draft.id
        ? rows.map(row => (row.id === saved.id ? saved : row))
        : [...rows, saved];
      localStorage.setItem(storageKey(table), JSON.stringify(next));
      return saved;
    }

    const { id, ...values } = draft;
    const payload = toSnake(values);
    const query = id
      ? supabase.from(table).update(payload).eq('id', id)
      : supabase.from(table).insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return toCamel(data) as T;
  },
});
