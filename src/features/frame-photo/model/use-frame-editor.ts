import { useEffect, useMemo, useRef, useState } from 'react';

import { computeLayout, drawFrame } from '@/entities/frame';
import { cameraCollection, filmCollection, lensCollection } from '@/entities/gear';
import { markLines, useMark } from '@/entities/mark';
import { recipeCollection } from '@/entities/recipe';
import { ensureFont } from '@/shared/lib/canvas-fonts';
import { downloadBlob } from '@/shared/lib/save-file';
import { useCollection } from '@/shared/lib/use-collection';

import { saveSummaryText } from '../lib/batch-text';
import { outputFilename, outputFilenames } from '../lib/output-filename';
import {
  captionOf,
  decodePhoto,
  drawOwnText,
  fontsOf,
  lookOf,
  renderJpeg,
  specOf,
} from '../lib/render-jpeg';
import { focalModeFor, resolveCaption } from '../lib/resolve-caption';

import { type QueuedPhoto, useEditorStore } from './editor-store';

// "Save all" waits this long after each download before it starts the next photo, then lets the
// file go. The default hold would keep ten seconds' worth of encoded JPEGs alive at once.
const BATCH_DOWNLOAD_HOLD_MS = 1_000;

const NO_PICKS = {};
const NO_EXIF = {};

/**
 * Editing logic for one mounted editor: resolves the current photo's caption from the store, the
 * registered library and EXIF, draws it onto the preview canvas, and exports JPEG for the current
 * photo or for the whole queue.
 * @returns canvas ref, the store, the registered library, resolved caption state and export actions
 */
export const useFrameEditor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const store = useEditorStore();
  const { queue, current, bitmap, preset, style, focalMode, detail, setError } = store;
  const { mark, image } = useMark();
  const own = useMemo(() => ({ mark, image }), [mark, image]);

  const cameras = useCollection(cameraCollection).items;
  const lenses = useCollection(lensCollection).items;
  const films = useCollection(filmCollection).items;
  const recipes = useCollection(recipeCollection).items;
  const library = useMemo(
    () => ({ cameras, lenses, films, recipes }),
    [cameras, lenses, films, recipes],
  );

  const resolved = useMemo(
    () => resolveCaption(current?.picks ?? NO_PICKS, current?.exif ?? NO_EXIF, focalMode, library),
    [current, focalMode, library],
  );

  const { info } = resolved;
  // A date line is this photo's own date, so the lines are worked out per photo.
  const takenAt = current?.exif.takenAt;
  const lines = useMemo(() => markLines(mark, takenAt), [mark, takenAt]);
  const block = useMemo(() => captionOf(style, info, own, lines), [style, info, own, lines]);
  const spec = useMemo(
    () => (bitmap ? specOf(bitmap, style, block, own, lines) : null),
    [bitmap, style, block, own, lines],
  );
  const layout = useMemo(
    () => (bitmap && spec ? computeLayout(bitmap, preset, 'optimized', spec) : null),
    [bitmap, preset, spec],
  );

  // A canvas does not wait for web fonts, so the preview is drawn again once the fonts are in.
  const fonts = fontsOf(style, own).join(' ');
  const [loadedFonts, setLoadedFonts] = useState('');
  useEffect(() => {
    let current = true;
    void Promise.all(fontsOf(style, own).map(ensureFont)).then(
      () => current && setLoadedFonts(fonts),
    );
    return () => {
      current = false;
    };
    // The joined names stand for the style and text settings: only a change of font matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fonts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    // While the next photo decodes there is no bitmap, and the canvas keeps the last frame.
    if (!canvas || !ctx || !bitmap || !layout) return;
    canvas.width = layout.canvas.width;
    canvas.height = layout.canvas.height;
    drawFrame(ctx, bitmap, layout, block, lookOf(style, own));
    drawOwnText(ctx, layout, style, own, lines);
  }, [bitmap, layout, block, style, own, lines, loadedFonts]);

  const filenames = useMemo(
    () =>
      outputFilenames(
        queue.items.map(item => item.file.name),
        preset.id,
      ),
    [queue.items, preset.id],
  );

  /** The file name "Save all" writes for a photo, also used for a single save so the two agree. */
  const filenameOf = (photo: QueuedPhoto) =>
    filenames[queue.items.indexOf(photo)] ?? outputFilename(photo.file.name, preset.id);

  /** The shooting info of any queued photo: its own picks and EXIF under the batch's focal mode. */
  const infoOf = (photo: QueuedPhoto) =>
    resolveCaption(photo.picks, photo.exif, focalModeFor(focalMode, photo.exif), library).info;

  /**
   * Exports the current photo as JPEG.
   * @param mode `download` saves a file, `share` opens the device share sheet
   */
  const exportJpeg = async (mode: 'download' | 'share') => {
    if (!current || !bitmap) return;
    setError('');
    try {
      // The preview stays at working size so typing stays fast; the file is drawn separately at
      // the chosen detail.
      const blob = await renderJpeg(bitmap, { preset, detail, block, style, own, lines });
      const filename = filenameOf(current);
      if (mode === 'download') {
        // Not awaited: the promise is about releasing the file, which nothing here waits for.
        void downloadBlob(blob, filename);
        return;
      }
      await navigator.share({ files: [new File([blob], filename, { type: 'image/jpeg' })] });
    } catch (cause) {
      // Dismissing the share sheet is not a failure
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError('Export failed. Please try again.');
    }
  };

  /**
   * Exports the chosen queued photos as JPEG, one after another, with the shared output settings and
   * each photo's own caption. Only one photo is in memory at any moment: decode, draw, encode,
   * close the bitmap, download, let the file go, then the next. A photo that fails to export is
   * skipped and named in the summary. Whether the browser kept each download cannot be known.
   */
  const savePhotos = async (ids: readonly string[]) => {
    const photos = queue.items.filter(photo => ids.includes(photo.id));
    if (photos.length === 0 || store.saving) return;
    await store.startSaving(photos.length);
    const failed: string[] = [];
    let sent = 0;
    let stopped = false;
    for (const [index, photo] of photos.entries()) {
      stopped = !store.advanceSaving(index + 1);
      if (stopped) break;
      try {
        const decoded = await decodePhoto(photo.file);
        // Caption and date line are the photo's own, not the previewed photo's.
        const ownLines = markLines(mark, photo.exif.takenAt);
        const settings = {
          preset,
          detail,
          block: captionOf(style, infoOf(photo), own, ownLines),
          style,
          own,
          lines: ownLines,
        };
        const blob = await renderJpeg(decoded, settings).finally(() => decoded.close());
        await downloadBlob(blob, filenameOf(photo), BATCH_DOWNLOAD_HOLD_MS);
        sent++;
      } catch {
        failed.push(photo.file.name);
      }
    }
    store.finishSaving();
    const summary = saveSummaryText({ sent, total: photos.length, failed, stopped });
    if (failed.length > 0) setError(summary);
    else store.setMessage(summary);
  };

  return {
    canvasRef,
    store,
    library,
    resolved,
    /** Pixel size of the file that export will write for the current photo at the current detail. */
    outputSize: bitmap && spec ? computeLayout(bitmap, preset, detail, spec).canvas : null,
    exportJpeg,
    savePhotos,
  };
};
