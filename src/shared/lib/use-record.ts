import { useEffect, useState } from 'react';

import type { Collection, Row } from '../api/collection';
import { onAuthChange } from '../api/supabase';

/**
 * Reads one record by id, for a screen that shows or edits it.
 * @param collection the record store to read from
 * @param id the record's id, or undefined when the screen has none (a blank form)
 * @returns the record once read, and whether it is loading, there, missing, or could not be read
 */
export const useRecord = <T extends Row>(collection: Collection<T>, id: string | undefined) => {
  const [state, setState] = useState<{ id?: string; item?: T | null; failed?: boolean }>({});

  useEffect(() => {
    if (!id) return;
    let active = true;
    const read = () =>
      collection.get(id).then(
        item => active && setState({ id, item }),
        () => active && setState({ id, failed: true }),
      );
    void read();
    const stop = onAuthChange(() => void read());
    return () => {
      active = false;
      stop();
    };
  }, [collection, id]);

  // An answer for another id is not this screen's record.
  const current = state.id === id ? state : {};
  const status: 'loading' | 'ready' | 'missing' | 'error' = current.failed
    ? 'error'
    : current.item === undefined
      ? 'loading'
      : current.item === null
        ? 'missing'
        : 'ready';

  return { item: current.item ?? undefined, status };
};
