/**
 * Counts the single-character edits between two strings: insertions, deletions, substitutions
 * and swaps of two neighbouring characters (the usual slips of typing).
 * @param a first string
 * @param b second string
 * @returns the number of edits that turn one into the other
 */
export const editDistance = (a: string, b: string) => {
  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i]![j] = Math.min(
        rows[i - 1]![j]! + 1,
        rows[i]![j - 1]! + 1,
        rows[i - 1]![j - 1]! + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        rows[i]![j] = Math.min(rows[i]![j]!, rows[i - 2]![j - 2]! + 1);
    }
  return rows[a.length]![b.length]!;
};

/**
 * How many edits a word of a given length may be away from what was typed and still count as a
 * misspelling of it. Short words get none: one edit turns "off" into too many other words.
 * @param length length of the known word
 * @returns the largest edit distance accepted
 */
export const typoTolerance = (length: number) =>
  length <= 3 ? 0 : length === 4 ? 1 : length <= 8 ? 2 : 3;

/** Shortest input worth guessing from. */
const MIN_INPUT = 4;

/**
 * Finds what a misspelled word most likely stands for among known words. A guess is made only
 * when it is safe to: the first letter matches (typos rarely hit it), the word is within the
 * tolerance for its length, and no other meaning is equally close — a tie returns nothing rather
 * than picking one.
 * @param input the word as typed, already normalized like the known words
 * @param entries known words with what each stands for; several words may share a meaning
 * @returns the one closest meaning, or undefined when there is none or more than one
 */
export const closestEntry = <T>(input: string, entries: Iterable<readonly [string, T]>) => {
  if (input.length < MIN_INPUT) return undefined;
  let best = Infinity;
  let meanings = new Set<T>();
  for (const [word, meaning] of entries) {
    const tolerance = typoTolerance(word.length);
    if (word[0] !== input[0] || Math.abs(word.length - input.length) > tolerance) continue;
    const distance = editDistance(input, word);
    if (distance > tolerance || distance > best) continue;
    if (distance < best) meanings = new Set();
    best = distance;
    meanings.add(meaning);
  }
  return meanings.size === 1 ? [...meanings][0] : undefined;
};
