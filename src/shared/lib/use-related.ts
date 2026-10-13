import { useEffect, useRef, useState } from 'react';

import type { Collection, Row } from '../api/collection';

/** How often a failed read is tried again by itself, and the pause before the first retry. */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

/**
 * Reads the records that the rows of a list point at — the versions of the recipes on screen, the
 * recipes in the strips on screen — and keeps them as the list grows, asking only for what it has
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
  // Counts the retries. A change here reruns the read for values that failed: taking them out
  // of `asked` alone reruns nothing, because nothing the effect depends on has changed.
  const [attempt, setAttempt] = useState(0);
  const asked = useRef(new Set<string>());
  const retries = useRef(0);
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
        retries.current = 0;
        setRecords(previous => [...previous, ...found.flat()]);
        setAnswered(previous => new Set([...previous, ...missing]));
        setFailed(false);
      },
      () => {
        missing.forEach(value => asked.current.delete(value));
        setFailed(true);
        // A passing failure should not leave the rows unanswered until the screen is reopened.
        // Tried again a few times, further apart each time, then left as failed.
        if (retries.current >= MAX_RETRIES) return;
        retries.current += 1;
        window.setTimeout(() => setAttempt(count => count + 1), RETRY_DELAY_MS * retries.current);
      },
    );
  }, [collection, field, wanted, chunk, attempt]);

  return {
    records,
    ready: (wanted ? wanted.split('\n') : []).every(value => answered.has(value)),
    failed,
  };
};
