import { toCamel, toSnake } from '../lib/case';

import { supabase } from './supabase';

export type Row = { id: string };
export type Draft<T extends Row> = Omit<T, 'id'> & { id?: string };

export type Collection<T extends Row> = {
  /** Lists every record the signed-in user owns, oldest first. Empty when signed out. */
  list: () => Promise<T[]>;
  /** Inserts the draft when it has no id, otherwise updates that record. Requires sign-in. */
  save: (draft: Draft<T>) => Promise<T>;
  /** Deletes one record for good. Requires sign-in. */
  remove: (id: string) => Promise<void>;
};

const hasSession = async () =>
  supabase ? (await supabase.auth.getSession()).data.session !== null : false;

/**
 * Creates a record store for one Supabase table. Row-level security limits records to their owner.
 * Records exist only for signed-in users: there is no device-local copy, so a signed-out visitor
 * sees an empty list and cannot save.
 * @param table Postgres table name
 * @returns list, save and remove operations
 */
export const createCollection = <T extends Row>(table: string): Collection<T> => ({
  list: async () => {
    if (!supabase || !(await hasSession())) return [];
    const { data, error } = await supabase.from(table).select('*').order('created_at');
    if (error) throw new Error(error.message);
    return data.map(row => toCamel(row) as T);
  },

  save: async draft => {
    if (!supabase || !(await hasSession())) throw new Error('Sign in to save records');

    const { id, ...values } = draft;
    const payload = toSnake(values);
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
