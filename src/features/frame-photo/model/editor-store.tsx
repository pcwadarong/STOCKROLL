import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DEFAULT_PRESET,
  DEFAULT_STYLE,
  type FrameStyle,
  type OutputPreset,
  parseStyle,
} from '@/entities/frame';
import { type ExifInfo, type FocalMode, readExif } from '@/entities/photo';

import { openErrorText, queueFullText, type SaveProgress } from '../lib/batch-text';
import { looksLikeBrowserCapture } from '../lib/capture-hint';
import {
  appendPhotos,
  applyGearPicksToAll,
  currentPhoto,
  emptyQueue,
  MAX_PHOTOS,
  type PhotoQueue,
  type Picks,
  type QueueItem,
  removePhoto,
  roomLeft,
  selectPhoto,
  setPhotoPick,
} from '../lib/photo-queue';
import { decodePhoto, type ExportDetail } from '../lib/render-jpeg';
import { focalModeFor } from '../lib/resolve-caption';

/**
 * One opened photo. Only the file, its EXIF and a small thumbnail are kept for every photo; the
 * full-size bitmap exists for the current photo alone (see `bitmap` in the store).
 */
export type QueuedPhoto = QueueItem & {
  file: File;
  exif: ExifInfo;
  thumbnail: ImageBitmap;
  /** Looks like it was taken from the picker's camera option, which strips the shooting info. */
  browserCapture: boolean;
};

const STYLE_KEY = 'stockroll:frame-style';

const readStoredStyle = (): FrameStyle => {
  try {
    const stored = localStorage.getItem(STYLE_KEY);
    return stored ? parseStyle(JSON.parse(stored)) : DEFAULT_STYLE;
  } catch {
    return DEFAULT_STYLE;
  }
};

// Wide enough for the strip on a 3× phone screen, and about 70KB decoded instead of about 96MB.
const THUMBNAIL_WIDTH = 160;

type EditorStore = {
  queue: PhotoQueue<QueuedPhoto>;
  /** The photo the preview shows and the info fields edit. */
  current: QueuedPhoto | null;
  /** Full-size bitmap of the current photo. Null while it decodes and while "Save all" runs. */
  bitmap: ImageBitmap | null;
  /** The current photo's full-size decode finished with an error, so `bitmap` will stay null. */
  decodeFailed: boolean;
  preset: OutputPreset;
  /** The look of the frame, shared by every photo and remembered on this device. */
  style: FrameStyle;
  focalMode: FocalMode;
  detail: ExportDetail;
  error: string;
  /** Result of the last finished action, announced politely. */
  message: string;
  /** How many opened files are still being read. */
  reading: number;
  saving: SaveProgress | null;
  open: (files: readonly File[]) => Promise<void>;
  /** Decodes the current photo again after a failed attempt. */
  retryDecode: () => void;
  select: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Changes a caption pick of the current photo only. */
  setPick: (key: keyof Picks, value: string | undefined) => void;
  /** Copies the current photo's camera, lens, film and look picks to every photo. */
  applyGearToAll: () => void;
  setPreset: (preset: OutputPreset) => void;
  /** Changes some fields of the style, keeping the rest. */
  updateStyle: (patch: Partial<FrameStyle>) => void;
  setFocalMode: (mode: FocalMode) => void;
  setDetail: (detail: ExportDetail) => void;
  setError: (message: string) => void;
  setMessage: (message: string) => void;
  /**
   * Starts a "Save all" run and gives up the preview's bitmap so the run can use that memory.
   * Resolves once no preview decode is still in flight.
   */
  startSaving: (total: number) => Promise<void>;
  /** Reports the photo about to be saved. Returns false when the user asked to stop. */
  advanceSaving: (current: number) => boolean;
  /** Ends the run and decodes the current photo for the preview again. */
  finishSaving: () => void;
  stopSaving: () => void;
};

const EditorContext = createContext<EditorStore | null>(null);

/**
 * Holds the opened photos and the editor's choices above the router, so going to a registration
 * page and coming back does not lose them. Photos stay in device memory only.
 * @param props children that may use `useEditorStore`
 */
export const EditorStoreProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState(emptyQueue<QueuedPhoto>);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [decodeFailed, setDecodeFailed] = useState(false);
  const [preset, setPreset] = useState<OutputPreset>(DEFAULT_PRESET);
  const [style, setStyle] = useState<FrameStyle>(readStoredStyle);
  const [focalMode, setFocalMode] = useState<FocalMode>('actual');
  const [detail, setDetail] = useState<ExportDetail>('optimized');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState(0);
  const [saving, setSaving] = useState<SaveProgress | null>(null);

  // Actions run after awaits, where the queue seen by a render is already old. Every change goes
  // through `commit`, which keeps this ref as the queue's latest value.
  const latestQueue = useRef(queue);
  const latestDecode = useRef(0);
  const decoding = useRef(Promise.resolve());
  const opening = useRef(Promise.resolve());
  const photoCount = useRef(0);
  const previewReleased = useRef(false);
  const stopRequested = useRef(false);

  useEffect(() => () => bitmap?.close(), [bitmap]);

  const actions = useMemo(() => {
    /** Decodes the current photo at full size, after dropping the bitmap of the previous one. */
    const loadCurrent = () => {
      // Clicking a second photo before the first finishes decoding must not let the slower,
      // older one win. Only the latest request may reach the preview.
      const request = ++latestDecode.current;
      // Dropped before the next decode starts, not after: two full-size bitmaps at once is what
      // a phone cannot afford.
      setBitmap(null);
      setDecodeFailed(false);
      const photo = currentPhoto(latestQueue.current);
      if (!photo || previewReleased.current) return;
      // A decode cannot be cancelled, so the next one waits for it instead of running beside it.
      // Requests that went stale while waiting are skipped without decoding at all.
      decoding.current = decoding.current.then(async () => {
        if (request !== latestDecode.current) return;
        try {
          const decoded = await decodePhoto(photo.file);
          if (request !== latestDecode.current) return decoded.close();
          setBitmap(decoded);
        } catch {
          // The thumbnail decoded, so the file is a photo; full size can still fail when memory
          // is short. Without this the preview would wait forever for a bitmap that never comes.
          if (request === latestDecode.current) setDecodeFailed(true);
        }
      });
    };

    const commit = (next: PhotoQueue<QueuedPhoto>) => {
      const previous = latestQueue.current;
      if (next === previous) return;
      latestQueue.current = next;
      setQueue(next);

      const kept = new Set(next.items.map(item => item.id));
      for (const item of previous.items) if (!kept.has(item.id)) item.thumbnail.close();

      if (next.currentId === previous.currentId) return;
      // A result line about the previous photo or run would read as being about this one.
      setMessage('');
      const photo = currentPhoto(next);
      // 35mm equivalent is only offered when the photo records it. Keeping the mode from a
      // previous photo would label an actual focal length as an equivalent.
      if (photo) setFocalMode(mode => focalModeFor(mode, photo.exif));
      loadCurrent();
    };

    const read = async (chosen: readonly File[]) => {
      const openedAt = Date.now();
      // Files past the limit are left unopened and said so, rather than dropped silently.
      const files = chosen.slice(0, roomLeft(latestQueue.current));
      const skipped = chosen.length - files.length;
      setReading(count => count - skipped);
      const added: QueuedPhoto[] = [];
      const failed: string[] = [];
      // One file at a time: reading EXIF loads the whole file, and a batch of 25MB exports read
      // in parallel is the memory spike this queue exists to avoid.
      for (const file of files) {
        try {
          // The thumbnail comes first so a file that is not a photo fails before it is read whole.
          const thumbnail = await createImageBitmap(file, {
            resizeWidth: THUMBNAIL_WIDTH,
            resizeQuality: 'medium',
            imageOrientation: 'from-image',
          });
          const exif = await readExif(file);
          added.push({
            id: `photo-${++photoCount.current}`,
            file,
            exif,
            thumbnail,
            picks: {},
            browserCapture: looksLikeBrowserCapture(exif, file.lastModified, openedAt),
          });
        } catch {
          failed.push(file.name);
        }
        setReading(count => count - 1);
      }
      commit(appendPhotos(latestQueue.current, added));
      const problems = [openErrorText(failed), queueFullText(skipped, MAX_PHOTOS)].filter(Boolean);
      if (problems.length > 0) setError(problems.join(' '));
    };

    return {
      open: (files: readonly File[]) => {
        if (files.length === 0) return Promise.resolve();
        setError('');
        setMessage('');
        setReading(count => count + files.length);
        // Batches are read in the order they were opened, so the strip keeps that order and the
        // batch opened last is the one that ends up in the preview.
        opening.current = opening.current.then(() => read(files));
        return opening.current;
      },
      retryDecode: loadCurrent,
      select: (id: string) => commit(selectPhoto(latestQueue.current, id)),
      remove: (id: string) => commit(removePhoto(latestQueue.current, id)),
      clear: () => {
        setError('');
        setMessage('');
        commit(emptyQueue());
      },
      setPick: (key: keyof Picks, value: string | undefined) => {
        const { currentId } = latestQueue.current;
        if (currentId) commit(setPhotoPick(latestQueue.current, currentId, key, value));
      },
      applyGearToAll: () => {
        const { currentId } = latestQueue.current;
        if (currentId) commit(applyGearPicksToAll(latestQueue.current, currentId));
      },
      startSaving: (total: number) => {
        stopRequested.current = false;
        previewReleased.current = true;
        setError('');
        setMessage('');
        setSaving({ current: 1, total });
        loadCurrent();
        return decoding.current;
      },
      advanceSaving: (current: number) => {
        if (stopRequested.current) return false;
        setSaving(progress => progress && { ...progress, current });
        return true;
      },
      finishSaving: () => {
        previewReleased.current = false;
        setSaving(null);
        loadCurrent();
      },
      stopSaving: () => {
        stopRequested.current = true;
      },
    };
  }, []);

  const updateStyle = useCallback(
    (patch: Partial<FrameStyle>) => setStyle(previous => ({ ...previous, ...patch })),
    [],
  );

  // The look is the user's signature, so it outlives the session. It holds no photo data.
  useEffect(() => {
    try {
      localStorage.setItem(STYLE_KEY, JSON.stringify(style));
    } catch {
      // Storage can be full or blocked (private mode); the style then lasts for this session only.
    }
  }, [style]);

  const store = useMemo<EditorStore>(
    () => ({
      queue,
      current: currentPhoto(queue),
      bitmap,
      decodeFailed,
      preset,
      style,
      focalMode,
      detail,
      error,
      message,
      reading,
      saving,
      ...actions,
      setPreset,
      updateStyle,
      setFocalMode,
      setDetail,
      setError,
      setMessage,
    }),
    [
      queue,
      bitmap,
      decodeFailed,
      preset,
      style,
      focalMode,
      detail,
      error,
      message,
      reading,
      saving,
      actions,
      updateStyle,
    ],
  );

  return <EditorContext.Provider value={store}>{children}</EditorContext.Provider>;
};

/**
 * Reads the editor store.
 * @returns the opened photos, the shared output settings and the actions that change them
 */
export const useEditorStore = () => {
  const store = useContext(EditorContext);
  if (!store) throw new Error('useEditorStore must be used inside EditorStoreProvider');
  return store;
};
