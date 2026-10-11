import { useEffect, useMemo, useRef } from 'react';

import { computeLayout, drawFrame } from '@/entities/frame';
import { cameraCollection, filmCollection, lensCollection } from '@/entities/gear';
import { recipeCollection } from '@/entities/recipe';
import { downloadBlob } from '@/shared/lib/save-file';
import { useCollection } from '@/shared/lib/use-collection';

import { saveSummaryText } from '../lib/batch-text';
import { outputFilename, outputFilenames } from '../lib/output-filename';
import { decodePhoto, renderJpeg } from '../lib/render-jpeg';
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
  const { queue, current, bitmap, preset, paper, focalMode, detail, setError } = store;

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

  const layout = useMemo(() => (bitmap ? computeLayout(bitmap, preset) : null), [bitmap, preset]);

  const { caption } = resolved;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    // While the next photo decodes there is no bitmap, and the canvas keeps the last frame.
    if (!canvas || !ctx || !bitmap || !layout) return;
    canvas.width = layout.canvas.width;
    canvas.height = layout.canvas.height;
    drawFrame(ctx, bitmap, layout, caption, paper);
  }, [bitmap, layout, paper, caption]);

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

  /** The caption of any queued photo: its own picks and EXIF under the batch's focal mode. */
  const captionOf = (photo: QueuedPhoto) =>
    resolveCaption(photo.picks, photo.exif, focalModeFor(focalMode, photo.exif), library).caption;

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
      const blob = await renderJpeg(bitmap, { preset, detail, caption, paper });
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
   * Exports every queued photo as JPEG, one after another, with the shared output settings and
   * each photo's own caption. Only one photo is in memory at any moment: decode, draw, encode,
   * close the bitmap, download, let the file go, then the next. A photo that fails to export is
   * skipped and named in the summary. Whether the browser kept each download cannot be known.
   */
  const saveAll = async () => {
    const photos = queue.items;
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
        const settings = { preset, detail, caption: captionOf(photo), paper };
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
    outputSize: bitmap ? computeLayout(bitmap, preset, detail).canvas : null,
    exportJpeg,
    saveAll,
  };
};
