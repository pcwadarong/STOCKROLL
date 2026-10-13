// Case, letter width, spaces and dashes are ignored, so "xt50" finds "X-T50" and "16-80" finds
// "16–80mm". Other punctuation is kept: dropping the dot would let "2.8" find "28mm".
// The database folds each record's text the same way (`fold_search` in supabase/migrations);
// the two must stay in step, or a search stops finding what is plainly on screen.
//
// Both spell every step out instead of using `toLowerCase()` and `\s`: those follow Unicode
// here and the server's locale there, and disagree on letters such as "İ" or a final "Σ". Only
// A–Z are lowered and only the listed characters are dropped.
const fold = (text: string) =>
  text
    .normalize('NFKC')
    .replace(/[A-Z]/g, letter => letter.toLowerCase())
    .replace(/[ \t\n\r\f\v_\-‐‑‒–—―]+/g, '');

/**
 * Splits what the user typed into the words a record has to contain, folded the way stored text
 * is. A word that folds to nothing (a lone dash) is dropped.
 * @param query the search as typed, words separated by spaces
 * @returns the folded words; empty for a blank search
 */
export const searchWords = (query: string) =>
  query
    .normalize('NFKC')
    .split(/[ \t\n\r\f\v]+/)
    .map(fold)
    .filter(Boolean);

/**
 * Writes a folded word as a SQL `like` pattern that finds it anywhere in a text. The characters
 * `like` reads as wildcards are escaped, so "100%" looks for a percent sign.
 *
 * An asterisk is the exception. The REST API turns every `*` in a pattern into "any text" and
 * offers no way to write a literal one, so a search for "*" would match every record. It is sent
 * as "any one character" instead, so "*star*" still finds itself and little else. A search that
 * is only an asterisk matches any record with text, which is as close as the API allows.
 * @param word a word from `searchWords`
 * @returns the pattern, e.g. `%xt50%`
 */
export const likePattern = (word: string) =>
  `%${word.replace(/[\\%_]/g, '\\$&').replace(/\*/g, '_')}%`;
