import { useSyncExternalStore } from 'react';

import { DEFAULT_MARK, type Mark, markFromLegacyStyle, parseMark } from './mark';

const STORAGE_KEY = 'stockroll:mark';
// Where the frame style is kept. It held the user's text before that became a setting of its own.
const LEGACY_STYLE_KEY = 'stockroll:frame-style';
// Drawn up to about 90px high on a 1080-wide picture; this covers full-size exports.
const IMAGE_DECODE_HEIGHT = 480;

type State = {
  mark: Mark;
  /** The user's image. Kept in memory only: it is gone when the app is closed. */
  image: ImageBitmap | null;
};

const readStored = (): Mark => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return parseMark(JSON.parse(stored));
    const legacy = localStorage.getItem(LEGACY_STYLE_KEY);
    return legacy ? markFromLegacyStyle(JSON.parse(legacy)) : DEFAULT_MARK;
  } catch {
    return DEFAULT_MARK;
  }
};

// One mark for the whole app, held outside React so the editor and the recipe pages share it
// without a provider, and the attached image survives going from one to the other.
let state: State = { mark: readStored(), image: null };
const listeners = new Set<() => void>();

const commit = (next: State) => {
  state = next;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const update = (patch: Partial<Mark>) => {
  const mark = { ...state.mark, ...patch };
  commit({ ...state, mark });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mark));
  } catch {
    // Storage can be full or blocked (private mode); the mark then lasts for this session only.
  }
};

const setImageFile = async (file: File | null) => {
  // The previous bitmap is left to the garbage collector rather than closed: an export that
  // started before the change may still be drawing it.
  if (!file) return commit({ ...state, image: null });
  const image = await createImageBitmap(file, {
    resizeHeight: IMAGE_DECODE_HEIGHT,
    resizeQuality: 'high',
  });
  commit({ ...state, image });
};

/**
 * The user's own text and image, shared by every screen that exports a picture. The settings are
 * remembered on this device; the image is kept in memory only.
 * @returns the settings, the attached image, `update` to change some settings, and `setImageFile`
 * to attach an image file or remove it with `null` (rejects when the file cannot be decoded)
 */
export const useMark = () => {
  const { mark, image } = useSyncExternalStore(subscribe, () => state);
  return { mark, image, update, setImageFile };
};

/**
 * Reads the mark outside React, for code that draws when asked rather than on render.
 * @returns the settings and the attached image as they are now
 */
export const currentMark = () => state;
