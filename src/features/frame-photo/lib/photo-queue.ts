import { FROM_EXIF } from './resolve-caption';

/**
 * What the user picked for each caption slot. `undefined` means "not chosen yet", which lets the
 * editor fall back to a match from EXIF. An empty string is an explicit "show nothing".
 */
export type Picks = {
  camera?: string;
  lens?: string;
  film?: string;
  look?: string;
  /** Exposure values typed by hand. Each one replaces the EXIF value for that slot only. */
  iso?: string;
  focal?: string;
  aperture?: string;
  shutter?: string;
};

/** The least a queued photo needs for the queue rules: an identity and its own caption picks. */
export type QueueItem = { id: string; picks: Picks };

/** The opened photos in the order they were added, and which one the preview shows. */
export type PhotoQueue<T extends QueueItem> = { items: readonly T[]; currentId: string | null };

/** Picks that describe the gear and look, which a whole roll usually shares. */
export const GEAR_PICK_KEYS = ['camera', 'lens', 'film', 'look'] as const;

/**
 * The most photos the editor holds at once. Each one keeps its file and a thumbnail in memory,
 * and a save run walks all of them.
 */
export const MAX_PHOTOS = 50;

/**
 * How many more photos fit in the queue.
 * @param queue the opened photos
 * @returns the room left, never below zero
 */
export const roomLeft = <T extends QueueItem>(queue: PhotoQueue<T>) =>
  Math.max(0, MAX_PHOTOS - queue.items.length);

/**
 * Makes an empty queue.
 * @returns a queue with no photos and no current photo
 */
export const emptyQueue = <T extends QueueItem>(): PhotoQueue<T> => ({
  items: [],
  currentId: null,
});

/**
 * Finds the photo the preview shows.
 * @param queue the opened photos
 * @returns the current photo, or null when the queue is empty
 */
export const currentPhoto = <T extends QueueItem>(queue: PhotoQueue<T>): T | null =>
  queue.items.find(item => item.id === queue.currentId) ?? null;

/**
 * Adds newly opened photos to the end of the queue. By default the first of them is shown, so
 * opening files always visibly does something; photos that trickle in after the first of their
 * batch are added without taking the preview.
 * @param queue the opened photos
 * @param added photos to append, in the order they were chosen
 * @param show whether the first added photo becomes the current one. A queue with no current
 * photo shows it either way
 * @returns the longer queue, or the same queue when nothing was added
 */
export const appendPhotos = <T extends QueueItem>(
  queue: PhotoQueue<T>,
  added: readonly T[],
  show = true,
): PhotoQueue<T> => {
  const [first] = added;
  if (!first) return queue;
  const keep = !show && currentPhoto(queue) !== null;
  return { items: [...queue.items, ...added], currentId: keep ? queue.currentId : first.id };
};

/**
 * Makes another queued photo the current one.
 * @param queue the opened photos
 * @param id photo to show
 * @returns the queue with that photo current, or the same queue when the id is not in it
 */
export const selectPhoto = <T extends QueueItem>(
  queue: PhotoQueue<T>,
  id: string,
): PhotoQueue<T> =>
  queue.items.some(item => item.id === id) ? { ...queue, currentId: id } : queue;

/**
 * Removes one photo. When it was the current one, the photo that takes its place in the strip
 * becomes current (the last photo falls back to the one before it).
 * @param queue the opened photos
 * @param id photo to remove
 * @returns the shorter queue, or the same queue when the id is not in it
 */
export const removePhoto = <T extends QueueItem>(
  queue: PhotoQueue<T>,
  id: string,
): PhotoQueue<T> => {
  const index = queue.items.findIndex(item => item.id === id);
  if (index === -1) return queue;
  const items = queue.items.filter(item => item.id !== id);
  if (queue.currentId !== id) return { ...queue, items };
  const next = items[Math.min(index, items.length - 1)];
  return { items, currentId: next?.id ?? null };
};

/**
 * Changes one caption pick of one photo. Other photos keep theirs.
 * @param queue the opened photos
 * @param id photo to change
 * @param key caption slot
 * @param value the pick; `undefined` returns the slot to "auto from EXIF"
 * @returns the queue with that photo updated
 */
export const setPhotoPick = <T extends QueueItem>(
  queue: PhotoQueue<T>,
  id: string,
  key: keyof Picks,
  value: string | undefined,
): PhotoQueue<T> => ({
  ...queue,
  items: queue.items.map(item =>
    item.id === id ? { ...item, picks: { ...item.picks, [key]: value } } : item,
  ),
});

/**
 * Copies one photo's camera, lens, film and look picks to every other photo.
 *
 * Only what was chosen is copied. A slot still on "auto" stays auto everywhere, so each photo
 * keeps reading its own EXIF, and "from EXIF" is copied as auto for the same reason: it names a
 * source, not a camera, and another file may not have that value. Exposure values are measurements
 * of one shot and are never copied.
 * @param queue the opened photos
 * @param sourceId photo whose picks are copied
 * @returns the queue with every photo sharing those four picks
 */
export const applyGearPicksToAll = <T extends QueueItem>(
  queue: PhotoQueue<T>,
  sourceId: string,
): PhotoQueue<T> => {
  const source = queue.items.find(item => item.id === sourceId);
  if (!source) return queue;
  const shared: Picks = {};
  for (const key of GEAR_PICK_KEYS) {
    const pick = source.picks[key];
    shared[key] = pick === FROM_EXIF ? undefined : pick;
  }
  return {
    ...queue,
    items: queue.items.map(item =>
      item.id === sourceId ? item : { ...item, picks: { ...item.picks, ...shared } },
    ),
  };
};
