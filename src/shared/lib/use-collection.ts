import { useCallback, useEffect, useState } from 'react';

import type { Collection, Draft, Row } from '../api/collection';
import { onAuthChange } from '../api/supabase';

/**
 * Loads a collection and keeps it in sync after saves and sign-in changes.
 * @param collection the record store to read from
 * @returns the records, a loading/error status, and save/remove actions that reload the list
 */
export const useCollection = <T extends Row>(collection: Collection<T>) => {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const reload = useCallback(async () => {
    try {
      setItems(await collection.list());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [collection]);

  useEffect(() => {
    let active = true;
    const load = () =>
      collection.list().then(
        rows => {
          if (!active) return;
          setItems(rows);
          setStatus('ready');
        },
        () => active && setStatus('error'),
      );
    void load();
    const stop = onAuthChange(() => void load());
    return () => {
      active = false;
      stop();
    };
  }, [collection]);

  const save = useCallback(
    async (draft: Draft<T>) => {
      const saved = await collection.save(draft);
      await reload();
      return saved;
    },
    [collection, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await collection.remove(id);
      // Drop it locally first. If the reload that follows fails, the list must still not show a
      // record that no longer exists.
      setItems(prev => prev.filter(item => item.id !== id));
      await reload();
    },
    [collection, reload],
  );

  return { items, status, save, remove, reload };
};
