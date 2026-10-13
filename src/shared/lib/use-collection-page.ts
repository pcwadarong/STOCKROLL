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

  // `key` names the query the rows answer. While it differs from the current one, the rows on
  // screen still belong to the previous filters or search.
  const [page, setPage] = useState<{ key?: string; rows: T[]; total: number }>({
    rows: [],
    total: 0,
  });
  const [counts, setCounts] = useState<Record<string, number>>();
  // Kept apart: the list and its counts are separate requests, and one succeeding must not hide
  // that the other failed.
  const [pageFailed, setPageFailed] = useState(false);
  const [tallyFailed, setTallyFailed] = useState(false);
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
          setPage({ ...next, key: queryKey });
          setPageFailed(false);
          setMoreFailed(false);
        },
        () => {
          if (mine === newest.current) setPageFailed(true);
        },
      );
    },
    [collection, query, queryKey],
  );

  const tally = useCallback(() => {
    const wanted = { total: {}, ...(JSON.parse(tallyKey) as Record<string, Filters>) };
    return Promise.all(
      Object.entries(wanted).map(
        async ([name, held]) => [name, await collection.count(held)] as const,
      ),
    ).then(
      entries => {
        setCounts(Object.fromEntries(entries));
        setTallyFailed(false);
      },
      () => setTallyFailed(true),
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

  const shown = page.rows;
  const reached = shown.length;
  const known = page.total;
  // True from the moment the filters or the search change until their first rows arrive.
  const settling = page.key !== queryKey;

  const refresh = useCallback(
    () => Promise.all([read(Math.max(step, reached)), tally()]),
    [read, tally, step, reached],
  );

  const more = useCallback(async () => {
    // The rows on screen answer the previous query. Reading on from their count would cancel the
    // new query's first step and append its later rows to the old list.
    if (settling) return;
    const mine = ++newest.current;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const next = await collection.page({ ...query, from: reached, to: reached + step - 1 });
      if (mine !== newest.current) return;
      // The list changed elsewhere since it was read. A row that is already on screen: one was
      // added and pushed the rest along — appending would repeat it, and skipping it would leave
      // the list a row short for good. A different total: one was added or deleted, and a
      // deletion among the rows on screen pulls an unseen row back before this step, where it
      // would never be read. Nothing where more was expected: enough were deleted to end the
      // list early. In each case the positions no longer line up, so the list — and the counts
      // above it — are read again from the top.
      const repeated = next.rows.some(row => shown.some(seen => seen.id === row.id));
      if (next.rows.length === 0 || repeated || next.total !== known) {
        const size = next.rows.length === 0 ? Math.max(step, reached) : reached + step;
        return void (await Promise.all([read(size), tally()]));
      }
      setPage(previous => ({ ...previous, rows: [...previous.rows, ...next.rows] }));
    } catch {
      if (mine === newest.current) setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [collection, query, reached, known, settling, step, read, tally, shown]);

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
        ...previous,
        rows: previous.rows.filter(row => row.id !== id),
        total: Math.max(0, previous.total - 1),
      }));
      await refresh();
    },
    [collection, refresh],
  );

  const status: 'loading' | 'ready' | 'error' =
    pageFailed || tallyFailed ? 'error' : page.key !== undefined && counts ? 'ready' : 'loading';

  return {
    rows: page.rows,
    /** Records that match the filters and the search, on screen or not. */
    total: page.total,
    counts: counts ?? {},
    status,
    step,
    more,
    /** True while the rows on screen still answer the previous filters or search. */
    settling,
    loadingMore,
    moreFailed,
    save,
    remove,
    refresh,
  };
};
