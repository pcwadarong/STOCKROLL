import { useEffect, useMemo, useRef, useState } from 'react';

import { computeLayout, drawFrame } from '@/entities/frame';
import { cameraCollection, filmCollection, lensCollection } from '@/entities/gear';
import { markLines, useMark } from '@/entities/mark';
import { recipeCollection } from '@/entities/recipe';
import { devicePixelBudget } from '@/shared/lib/canvas-budget';
import { ensureFont } from '@/shared/lib/canvas-fonts';
import { type BatchSaveWay, downloadBlob, pickFolder, writeToFolder } from '@/shared/lib/save-file';
import { useCollection } from '@/shared/lib/use-collection';
import { makeZip } from '@/shared/lib/zip';

import {
  noneMadeText,
  type SaveDestination,
  saveSummaryText,
  shareReadyText,
  zipName,
} from '../lib/batch-text';
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

  // Photos made for the share sheet, waiting for the tap that may open it.
  const [readyToShare, setReadyToShare] = useState<File[] | null>(null);

  /**
   * Exports the chosen queued photos as JPEG, one after another, with the shared output settings
   * and each photo's own caption, and saves them the way this browser does best (`batchSaveWay`).
   * Only one decoded photo is in memory at any moment: decode, draw, encode, close the bitmap.
   * Into a folder each file is written and let go before the next; for a ZIP or the share sheet
   * the encoded files are kept until the end. A photo that fails to export is skipped and named in
   * the summary.
   * @param ids the photos to save
   * @param way how to save them; the folder picker opens straight away, while the click still counts
   * @returns true when the photos wait for a tap to open the share sheet (`shareReady`)
   */
  const savePhotos = async (ids: readonly string[], way: BatchSaveWay) => {
    const photos = queue.items.filter(photo => ids.includes(photo.id));
    if (photos.length === 0 || store.saving) return;
    // First, before anything is awaited: the browser opens the picker only straight after a click.
    const folder = way === 'folder' ? await pickFolder() : null;
    if (way === 'folder' && !folder) return;
    setReadyToShare(null);
    await store.startSaving(photos.length);
    const failed: string[] = [];
    const made: { name: string; blob: Blob }[] = [];
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
        if (folder) await writeToFolder(folder, filenameOf(photo), blob);
        else made.push({ name: filenameOf(photo), blob });
        sent++;
      } catch {
        failed.push(photo.file.name);
      }
    }
    store.finishSaving();

    const report = (to: SaveDestination) => {
      const summary = saveSummaryText({ sent, total: photos.length, failed, stopped, to });
      if (failed.length > 0) setError(summary);
      else store.setMessage(summary);
    };
    if (folder) return report({ way: 'folder', folder: folder.name });
    if (stopped) return report(way === 'share' ? { way } : { way: 'zip', name: '' });
    if (made.length === 0) return setError(noneMadeText(failed));
    const files = made.map(({ name, blob }) => new File([blob], name, { type: 'image/jpeg' }));
    // A share sheet that cannot take this many files gets a ZIP instead of an error.
    if (way === 'share' && navigator.canShare?.({ files })) {
      setReadyToShare(files);
      if (failed.length > 0)
        setError(saveSummaryText({ sent, total: photos.length, failed, stopped, to: { way } }));
      else store.setMessage(shareReadyText(files.length));
      return true;
    }
    const name = zipName(made.length, new Date());
    void downloadBlob(await makeZip(made), name);
    report({ way: 'zip', name });
  };

  /**
   * Opens the share sheet with the photos made for it. Called from the tap that asks for it.
   * @returns true once the photos were handed over
   */
  const shareReady = async () => {
    if (!readyToShare) return false;
    try {
      await navigator.share({ files: readyToShare });
      store.setMessage(
        saveSummaryText({
          sent: readyToShare.length,
          total: readyToShare.length,
          failed: [],
          stopped: false,
          to: { way: 'share' },
        }),
      );
      setReadyToShare(null);
      return true;
    } catch (cause) {
      // Closing the sheet is not a failure: the photos stay ready for another try.
      if (!(cause instanceof DOMException && cause.name === 'AbortError'))
        setError('Could not open the share sheet. Try again.');
      return false;
    }
  };

  return {
    canvasRef,
    store,
    library,
    resolved,
    /**
     * Pixel sizes of the current photo's file: For posting, Original as saved here, and Original
     * as it would be without this device's limit. Original asks the device how large it can draw
     * only once it is chosen: asking means making a canvas that large.
     */
    fileSizes:
      bitmap && spec
        ? (() => {
            const wanted = computeLayout(bitmap, preset, 'full', spec, () => Infinity).canvas;
            return {
              posting: computeLayout(bitmap, preset, 'optimized', spec).canvas,
              wanted,
              original:
                detail === 'full'
                  ? computeLayout(bitmap, preset, 'full', spec, devicePixelBudget).canvas
                  : wanted,
            };
          })()
        : null,
    exportJpeg,
    savePhotos,
    /** How many photos wait for the share sheet, or 0. */
    readyToShare: readyToShare?.length ?? 0,
    shareReady,
    /** Lets go of photos made for the share sheet without sharing them. */
    dropReady: () => setReadyToShare(null),
  };
};
