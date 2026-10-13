import { useEffect, useRef, useState } from 'react';

import type { Collection, Row } from '../api/collection';

/**
 * Reads the records that the rows of a list point at — the versions of the recipes on screen, the
 * recipes in the kits on screen — and keeps them as the list grows, asking only for what it has
 * not read yet.
 * @param collection the record store to read from
 * @param field the field to look the values up in, e.g. `id` or `recipeId`
 * @param values the values the list needs right now
 * @param chunk how many values go into one request. Keep `chunk × records per value` under the
 *   API's 1,000-row limit, or the answer is cut short without an error
 * @returns the records read so far and whether every value has been answered
 */
export const useRelated = <T extends Row>(
  collection: Collection<T>,
  field: string,
  values: readonly string[],
  chunk: number,
) => {
  const [records, setRecords] = useState<T[]>([]);
  const [answered, setAnswered] = useState<ReadonlySet<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const asked = useRef(new Set<string>());
  // As text, so the effect reruns only when the set of values changes.
  const wanted = [...new Set(values)].sort().join('\n');

  useEffect(() => {
    const missing = (wanted ? wanted.split('\n') : []).filter(value => !asked.current.has(value));
    if (missing.length === 0) return;
    missing.forEach(value => asked.current.add(value));

    const chunks = Array.from({ length: Math.ceil(missing.length / chunk) }, (_, index) =>
      missing.slice(index * chunk, (index + 1) * chunk),
    );
    Promise.all(chunks.map(part => collection.where(field, part))).then(
      // Kept even when the list has moved on meanwhile: these values are marked as asked and
      // would not be requested again.
      found => {
        setRecords(previous => [...previous, ...found.flat()]);
        setAnswered(previous => new Set([...previous, ...missing]));
      },
      () => {
        // Let a later render ask again.
        missing.forEach(value => asked.current.delete(value));
        setFailed(true);
      },
    );
  }, [collection, field, wanted, chunk]);

  return {
    records,
    ready: (wanted ? wanted.split('\n') : []).every(value => answered.has(value)),
    failed,
  };
};
