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
 * Words the outcome of "Save all".
 * @param result how many photos were written, how many were in the batch, the names of those
 * that failed, and whether the user stopped the run
 * @returns a sentence that never claims more than what was saved
 */
export const saveSummaryText = ({
  saved,
  total,
  failed,
  stopped,
}: {
  saved: number;
  total: number;
  failed: readonly string[];
  stopped: boolean;
}) => {
  const outcome =
    saved === total
      ? `Saved ${total === 1 ? '1 photo' : `all ${total} photos`}.`
      : `${stopped ? 'Stopped. ' : ''}Saved ${saved} of ${photos(total)}.`;
  return failed.length > 0 ? `${outcome} Could not save: ${listNames(failed)}.` : outcome;
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
