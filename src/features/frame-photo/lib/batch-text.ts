/** Where a "Save all" run is: the photo being written and how many there are. */
export type SaveProgress = { current: number; total: number };

const NAMES_SHOWN = 3;

const photos = (count: number) => (count === 1 ? '1 photo' : `${count} photos`);

/** Lists a few file names and counts the rest, so a long batch does not flood the message. */
const listNames = (names: readonly string[]) => {
  const rest = names.length - NAMES_SHOWN;
  const shown = names.slice(0, NAMES_SHOWN).join(', ');
  return rest > 0 ? `${shown} and ${rest} more` : shown;
};

/**
 * Words the progress of "Save all" for the live region.
 * @param progress 1-based index of the photo being saved, and the batch size
 * @returns e.g. `Saving 3 of 12…`
 */
export const savingProgressText = ({ current, total }: SaveProgress) =>
  `Saving ${current} of ${total}…`;

/**
 * Explains the one failure "Save all" cannot detect: browsers hold back every automatic download
 * after the first until the user allows it, and tell the page nothing.
 */
export const MULTIPLE_DOWNLOADS_HINT =
  'Each photo downloads as its own file. If only one arrives, your browser is asking for permission to download multiple files: allow it, then save all again.';

/**
 * Words the outcome of "Save all". A download started from a page gives no success signal, so
 * the sentence says how many photos were handed to the browser and never that they were saved.
 * @param result how many photos were handed to the browser, how many were in the batch, the
 * names of those that could not be exported, and whether the user stopped the run
 * @returns a sentence that claims no more than what the editor knows
 */
export const saveSummaryText = ({
  sent,
  total,
  failed,
  stopped,
}: {
  sent: number;
  total: number;
  failed: readonly string[];
  stopped: boolean;
}) => {
  const count = sent === total ? photos(total) : `${sent} of ${photos(total)}`;
  const outcome = `${stopped ? 'Stopped. ' : ''}Sent ${count} to your browser's downloads.`;
  return failed.length > 0 ? `${outcome} Could not export: ${listNames(failed)}.` : outcome;
};

/**
 * Words the error for a queued photo whose full-size decode failed, e.g. under memory pressure.
 * @param name file name of the photo
 * @returns the message, naming both ways out
 */
export const decodeErrorText = (name: string) =>
  `${name} could not be loaded at full size. Try again, or remove it and carry on with the others.`;

/** What the preview area is doing for the current photo. */
export type PreviewState = 'empty' | 'loading' | 'ready' | 'failed' | 'saving';

/**
 * Works out the preview's state. A failed decode is its own state and not "loading": the wait
 * is over, and the editor must say so instead of staying busy forever.
 * @param facts whether a photo is current, whether its bitmap is decoded, whether its decode
 * failed, and whether "Save all" is running (which borrows the bitmap)
 * @returns the state the preview shows
 */
export const previewStateOf = ({
  hasPhoto,
  hasBitmap,
  decodeFailed,
  saving,
}: {
  hasPhoto: boolean;
  hasBitmap: boolean;
  decodeFailed: boolean;
  saving: boolean;
}): PreviewState => {
  if (!hasPhoto) return 'empty';
  if (saving) return 'saving';
  if (hasBitmap) return 'ready';
  return decodeFailed ? 'failed' : 'loading';
};

/**
 * Words the error for files that could not be opened as photos.
 * @param failed names of the files that failed to decode
 * @returns the message, or an empty string when every file opened
 */
export const openErrorText = (failed: readonly string[]) => {
  if (failed.length === 0) return '';
  if (failed.length === 1)
    return `${failed[0]} can't be opened. Use a photo exported as JPEG, PNG or WebP.`;
  return `${failed.length} files can't be opened: ${listNames(failed)}. Use photos exported as JPEG, PNG or WebP.`;
};

/**
 * Words the notice for files left unopened because the editor was full.
 * @param skipped how many of the chosen files were not opened
 * @param limit the most photos the editor holds
 * @returns the message, or an empty string when every file fit
 */
export const queueFullText = (skipped: number, limit: number) =>
  skipped > 0
    ? `The editor holds up to ${limit} photos, so ${photos(skipped)} ${skipped === 1 ? 'was' : 'were'} not opened. Save and remove some, then open the rest.`
    : '';

/**
 * Picks the one line the editor's live region shows. Work in progress outranks the result of
 * earlier work, and saving outranks the rest because it is the longest wait.
 * @param state the save progress, how many files are still being read, whether the current
 * photo is still decoding, and the last result message
 * @returns the line to announce, or an empty string when there is nothing to say
 */
export const editorStatusText = ({
  saving,
  reading,
  loading,
  message,
}: {
  saving: SaveProgress | null;
  reading: number;
  loading: boolean;
  message: string;
}) => {
  if (saving) return savingProgressText(saving);
  if (reading > 0) return `Reading ${photos(reading)}…`;
  if (loading) return 'Loading photo…';
  return message;
};
