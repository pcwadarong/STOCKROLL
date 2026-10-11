import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DEFAULT_PAPER, DEFAULT_PRESET, type OutputPreset, type Paper } from '@/entities/frame';
import { type ExifInfo, type FocalMode, readExif } from '@/entities/photo';

export type PhotoSource = { name: string; bitmap: ImageBitmap; exif: ExifInfo };

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

/** How large the exported file is. `full` keeps the photo's own resolution. */
export type ExportDetail = 'optimized' | 'full';

type EditorStore = {
  source: PhotoSource | null;
  picks: Picks;
  preset: OutputPreset;
  paper: Paper;
  focalMode: FocalMode;
  detail: ExportDetail;
  error: string;
  open: (file: File | undefined) => Promise<void>;
  setPick: (key: keyof Picks, value: string | undefined) => void;
  setPreset: (preset: OutputPreset) => void;
  setPaper: (paper: Paper) => void;
  setFocalMode: (mode: FocalMode) => void;
  setDetail: (detail: ExportDetail) => void;
  setError: (message: string) => void;
};

const EditorContext = createContext<EditorStore | null>(null);

/**
 * Holds the opened photo and the editor's choices above the router, so going to a registration
 * page and coming back does not lose the photo. The photo stays in device memory only.
 * @param props children that may use `useEditorStore`
 */
export const EditorStoreProvider = ({ children }: { children: ReactNode }) => {
  const [source, setSource] = useState<PhotoSource | null>(null);
  const [picks, setPicks] = useState<Picks>({});
  const [preset, setPreset] = useState<OutputPreset>(DEFAULT_PRESET);
  const [paper, setPaper] = useState<Paper>(DEFAULT_PAPER);
  const [focalMode, setFocalMode] = useState<FocalMode>('actual');
  const [detail, setDetail] = useState<ExportDetail>('optimized');
  const [error, setError] = useState('');
  const latestOpen = useRef(0);

  useEffect(() => () => source?.bitmap.close(), [source]);

  const store = useMemo<EditorStore>(
    () => ({
      source,
      picks,
      preset,
      paper,
      focalMode,
      detail,
      error,
      open: async file => {
        if (!file) return;
        // Opening a second photo before the first finishes decoding must not let the slower,
        // older one win. Only the latest request may update the editor.
        const request = ++latestOpen.current;
        setError('');
        try {
          const [bitmap, exif] = await Promise.all([
            createImageBitmap(file, { imageOrientation: 'from-image' }),
            readExif(file),
          ]);
          if (request !== latestOpen.current) return bitmap.close();
          setSource({ name: file.name, bitmap, exif });
          // Choices made for the previous photo do not carry over.
          setPicks({});
          // 35mm equivalent is only offered when the photo records it. Keeping the mode from a
          // previous photo would label an actual focal length as an equivalent.
          if (exif.focalLength35 === undefined) setFocalMode('actual');
        } catch {
          if (request !== latestOpen.current) return;
          setError("This file can't be opened. Use a photo exported as JPEG, PNG or WebP.");
        }
      },
      setPick: (key, value) => setPicks(prev => ({ ...prev, [key]: value })),
      setPreset,
      setPaper,
      setFocalMode,
      setDetail,
      setError,
    }),
    [source, picks, preset, paper, focalMode, detail, error],
  );

  return <EditorContext.Provider value={store}>{children}</EditorContext.Provider>;
};

/**
 * Reads the editor store.
 * @returns the opened photo, the current choices and the actions that change them
 */
export const useEditorStore = () => {
  const store = useContext(EditorContext);
  if (!store) throw new Error('useEditorStore must be used inside EditorStoreProvider');
  return store;
};
