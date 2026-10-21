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

/** Where a finished batch went, as the summary says it. */
export type SaveDestination =
  { way: 'folder'; folder: string } | { way: 'zip'; name: string } | { way: 'share' };

/**
 * Names the ZIP a batch is saved in: the app, the day and how many photos, so a download folder
 * shows what it is.
 * @param count how many photos are in it
 * @param when the day it is made
 * @returns e.g. `stockroll-2026-10-20-12-photos.zip`
 */
export const zipName = (count: number, when: Date) => {
  const two = (value: number) => String(value).padStart(2, '0');
  const day = `${when.getFullYear()}-${two(when.getMonth() + 1)}-${two(when.getDate())}`;
  return `stockroll-${day}-${count}-${count === 1 ? 'photo' : 'photos'}.zip`;
};

/**
 * Says where a batch will go, for the line in the save dialog.
 * @param way how this browser saves a batch
 * @returns one line
 */
export const saveWayText = (way: SaveDestination['way']) =>
  ({
    folder: 'Each photo is saved as its own file in a folder you pick.',
    share: 'When they are ready, pick where they go: your photos, your files or an app.',
    zip: 'Saved as one ZIP file. Safari opens it as a folder.',
  })[way];

/**
 * Words the outcome of "Save all", claiming no more than the editor knows. A file written to a
 * picked folder is known to be saved; a download only to have been handed to the browser
 * (AGENTS §3-26); a share only to have reached the share sheet.
 * @param result how many photos were made, how many were in the batch, the names of those that
 * could not be exported, whether the user stopped the run, and where the batch went
 * @returns a sentence
 */
export const saveSummaryText = ({
  sent,
  total,
  failed,
  stopped,
  to,
}: {
  sent: number;
  total: number;
  failed: readonly string[];
  stopped: boolean;
  to: SaveDestination;
}) => {
  const count = sent === total ? photos(total) : `${sent} of ${photos(total)}`;
  const failures = failed.length > 0 ? ` Could not export: ${listNames(failed)}.` : '';
  // A stopped ZIP or share is not made at all; photos written to a folder stay.
  if (stopped && to.way !== 'folder')
    return `Stopped. Nothing was ${to.way === 'zip' ? 'saved' : 'shared'}.`;
  const outcome = {
    folder: () => `Saved ${count} to “${(to as { folder: string }).folder}”.`,
    zip: () => `Sent ${(to as { name: string }).name} to your browser's downloads.`,
    share: () => `Handed ${count} to the share sheet.`,
  }[to.way]();
  return `${stopped ? 'Stopped. ' : ''}${outcome}${failures}`;
};

/**
 * Words a ZIP or share run in which no photo could be made, so there is nothing to hand over.
 * @param failed names of the photos that could not be exported
 * @returns the message
 */
export const noneMadeText = (failed: readonly string[]) =>
  `Nothing was saved. Could not export: ${listNames(failed)}.`;

/** Names a run of photos within a batch: `Photos 1–8 of 13`, or `Photo 13 of 13` alone. */
const which = (start: number, end: number, total: number) =>
  end - start === 1 ? `Photo ${end} of ${total}` : `Photos ${start + 1}–${end} of ${total}`;

/**
 * Words a batch made for the share sheet and waiting for a tap. The phone opens its save options
 * (Photos, Files, apps) only straight after a tap, and making the photos takes longer than that.
 * @param range the photos the next tap hands over, and how many there are in all
 * @returns the line above the button
 */
export const shareReadyText = ({
  start,
  end,
  total,
}: {
  start: number;
  end: number;
  total: number;
}) => {
  const lead =
    start === 0 && end === total
      ? `${photos(total)} ${total === 1 ? 'is' : 'are'} ready.`
      : `${which(start, end, total)} ${end - start === 1 ? 'is' : 'are'} next: your phone takes this many at a time.`;
  return `${lead} Your phone opens its save options only right after a tap.`;
};

/**
 * Names the button that opens the share sheet for the next photos. "Share" reads as sending to
 * someone; this is where the photos get saved.
 * @param range the photos the tap hands over, and how many there are in all
 * @returns the button label
 */
export const shareButtonText = ({
  start,
  end,
  total,
}: {
  start: number;
  end: number;
  total: number;
}) =>
  start === 0 && end === total
    ? `Choose where to save ${photos(total)}`
    : `Choose where to save ${which(start, end, total).toLowerCase()}`;

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
