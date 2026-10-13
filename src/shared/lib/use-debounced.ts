import { useEffect, useState } from 'react';

/**
 * Follows a value once it has stopped changing, so typing sends one request and not one per key.
 * @param value the value as it changes
 * @param delayMs how long it has to rest before it is passed on
 * @returns the last value that rested that long
 */
export const useDebounced = <T>(value: T, delayMs: number) => {
  const [rested, setRested] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setRested(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return rested;
};
