import { useEffect, useMemo, useRef, useState } from 'react';

import {
  computeLayout,
  drawFrame,
  effectiveStyle,
  ensureFont,
  frameCaption,
  frameSpec,
} from '@/entities/frame';
import { cameraCollection, filmCollection, lensCollection } from '@/entities/gear';
import { recipeCollection } from '@/entities/recipe';
import { downloadBlob } from '@/shared/lib/save-file';
import { useCollection } from '@/shared/lib/use-collection';

import { saveSummaryText } from '../lib/batch-text';
import { outputFilename, outputFilenames } from '../lib/output-filename';
import { decodePhoto, lookOf, renderJpeg } from '../lib/render-jpeg';
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
  const { queue, current, bitmap, preset, style, logo, focalMode, detail, setError } = store;

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
  const hasLogo = logo !== null;
  const block = useMemo(() => frameCaption(style, info, hasLogo), [style, info, hasLogo]);
  const spec = useMemo(
    () => (bitmap ? frameSpec(bitmap, style, block) : null),
    [bitmap, style, block],
  );
  const layout = useMemo(
    () => (bitmap && spec ? computeLayout(bitmap, preset, 'optimized', spec) : null),
    [bitmap, preset, spec],
  );

  // A canvas does not wait for web fonts, so the preview is drawn again once the font is in.
  const { font } = effectiveStyle(style);
  const [loadedFont, setLoadedFont] = useState(font);
  useEffect(() => {
    let current = true;
    void ensureFont(font).then(() => current && setLoadedFont(font));
    return () => {
      current = false;
    };
  }, [font]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    // While the next photo decodes there is no bitmap, and the canvas keeps the last frame.
    if (!canvas || !ctx || !bitmap || !layout) return;
    canvas.width = layout.canvas.width;
    canvas.height = layout.canvas.height;
    drawFrame(ctx, bitmap, layout, block, lookOf(style, logo));
  }, [bitmap, layout, block, style, logo, loadedFont]);

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
  const blockOf = (photo: QueuedPhoto) =>
    frameCaption(
      style,
      resolveCaption(photo.picks, photo.exif, focalModeFor(focalMode, photo.exif), library).info,
      hasLogo,
    );

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
      const blob = await renderJpeg(bitmap, { preset, detail, block, style, logo });
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
        const settings = { preset, detail, block: blockOf(photo), style, logo };
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
    saveAll,
  };
};
