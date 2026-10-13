import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Collection, Draft, ListOrder, Row } from '../api/collection';
import { onAuthChange } from '../api/supabase';

type Filters = Readonly<Record<string, string>>;

type PageOptions = {
  /** Exact value per field; see `ListQuery`. */
  filters?: Filters;
  /** What the user typed into the search box. */
  search?: string;
  order: readonly ListOrder[];
  /** Rows read at first, and by each `more`. */
  step: number;
  /** Extra counts for the summary above the list, by name: the records holding these values. */
  tallies?: Readonly<Record<string, Filters>>;
};

/**
 * Reads a list a step at a time, narrowed and ordered by the database. Changing the filters or
 * the search starts again from the first step; the rows on screen stay until the new ones arrive.
 * @param collection the record store to read from
 * @param options what to narrow by, the order, the step and the summary counts
 * @returns the rows read so far, how many match in all, counts (`total` is every record, plus
 *   one per tally), statuses, and actions: `more` reads the next step, `save`/`remove` write and
 *   then read the list again
 */
export const useCollectionPage = <T extends Row>(
  collection: Collection<T>,
  { filters, search = '', order, step, tallies }: PageOptions,
) => {
  // Callers build these objects on every render; as text they only change when their content does.
  const queryKey = JSON.stringify({ filters: filters ?? {}, search, order });
  const tallyKey = JSON.stringify(tallies ?? {});
  const query = useMemo(
    () => JSON.parse(queryKey) as { filters: Filters; search: string; order: ListOrder[] },
    [queryKey],
  );

  const [page, setPage] = useState<{ rows: T[]; total: number }>({ rows: [], total: 0 });
  const [counts, setCounts] = useState<Record<string, number>>();
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  // Only the answer to the newest request is used: an older one may arrive later than it.
  const newest = useRef(0);

  const read = useCallback(
    (size: number) => {
      const mine = ++newest.current;
      return collection.page({ ...query, from: 0, to: size - 1 }).then(
        next => {
          if (mine !== newest.current) return;
          setPage(next);
          setLoaded(true);
          setFailed(false);
          setMoreFailed(false);
        },
        () => {
          if (mine === newest.current) setFailed(true);
        },
      );
    },
    [collection, query],
  );

  const tally = useCallback(() => {
    const wanted = { total: {}, ...(JSON.parse(tallyKey) as Record<string, Filters>) };
    return Promise.all(
      Object.entries(wanted).map(
        async ([name, held]) => [name, await collection.count(held)] as const,
      ),
    ).then(
      entries => setCounts(Object.fromEntries(entries)),
      () => setFailed(true),
    );
  }, [collection, tallyKey]);

  useEffect(() => {
    void read(step);
    return onAuthChange(() => void read(step));
  }, [read, step]);

  useEffect(() => {
    void tally();
    return onAuthChange(() => void tally());
  }, [tally]);

  const reached = page.rows.length;

  const refresh = useCallback(
    () => Promise.all([read(Math.max(step, reached)), tally()]),
    [read, tally, step, reached],
  );

  const more = useCallback(async () => {
    const mine = ++newest.current;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const next = await collection.page({ ...query, from: reached, to: reached + step - 1 });
      if (mine !== newest.current) return;
      // Nothing where more was expected: the list changed elsewhere. Read it again from the top.
      if (next.rows.length === 0) return void (await read(Math.max(step, reached)));
      setPage(previous => ({
        // A record added elsewhere meanwhile shifts the positions, and a row already on screen
        // can come back in the next stretch.
        rows: [
          ...previous.rows,
          ...next.rows.filter(row => !previous.rows.some(shown => shown.id === row.id)),
        ],
        total: next.total,
      }));
    } catch {
      if (mine === newest.current) setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [collection, query, reached, step, read]);

  const save = useCallback(
    async (draft: Draft<T>) => {
      const saved = await collection.save(draft);
      await refresh();
      return saved;
    },
    [collection, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await collection.remove(id);
      // Drop it locally first. If the read that follows fails, the list must still not show a
      // record that no longer exists.
      setPage(previous => ({
        rows: previous.rows.filter(row => row.id !== id),
        total: Math.max(0, previous.total - 1),
      }));
      await refresh();
    },
    [collection, refresh],
  );

  const status: 'loading' | 'ready' | 'error' = failed
    ? 'error'
    : loaded && counts
      ? 'ready'
      : 'loading';

  return {
    rows: page.rows,
    /** Records that match the filters and the search, on screen or not. */
    total: page.total,
    counts: counts ?? {},
    status,
    step,
    more,
    loadingMore,
    moreFailed,
    save,
    remove,
    refresh,
  };
};
