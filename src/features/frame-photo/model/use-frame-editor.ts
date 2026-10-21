import { useEffect, useMemo, useRef, useState } from 'react';

import { computeLayout, drawFrame } from '@/entities/frame';
import { cameraCollection, filmCollection, lensCollection } from '@/entities/gear';
import { markLines, useMark } from '@/entities/mark';
import { recipeCollection } from '@/entities/recipe';
import { devicePixelBudget } from '@/shared/lib/canvas-budget';
import { ensureFont } from '@/shared/lib/canvas-fonts';
import {
  type BatchSaveWay,
  downloadBlob,
  type FileRange,
  pickFolder,
  splitToFit,
  writeToFolder,
} from '@/shared/lib/save-file';
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

  /**
   * Photos made for the share sheet and waiting for the tap that opens it: all of them, the runs
   * the sheet takes at once (the next one first), how many were asked for, and the names of those
   * that could not be made.
   */
  const [waiting, setWaiting] = useState<{
    files: File[];
    ranges: FileRange[];
    asked: number;
    failed: string[];
  } | null>(null);

  /**
   * Opens the share sheet with the next run of waiting photos. A sheet that was closed, or that the
   * browser would not open without a fresh tap, leaves the run waiting.
   * @returns `done` when every photo was handed over, `more` when another run waits, `wait` when
   * this one still does
   */
  const shareNext = async (batch: NonNullable<typeof waiting>) => {
    const [range, ...rest] = batch.ranges;
    if (!range) return 'done' as const;
    try {
      await navigator.share({ files: batch.files.slice(range.start, range.end) });
    } catch (cause) {
      const quiet =
        cause instanceof DOMException &&
        (cause.name === 'AbortError' || cause.name === 'NotAllowedError');
      if (!quiet) setError('Could not open the save options. Try again.');
      return 'wait' as const;
    }
    if (rest.length === 0) {
      setWaiting(null);
      const summary = saveSummaryText({
        sent: batch.files.length,
        total: batch.asked,
        failed: batch.failed,
        stopped: false,
        to: { way: 'share' },
      });
      if (batch.failed.length > 0) setError(summary);
      else store.setMessage(summary);
      return 'done' as const;
    }
    const next = { ...batch, ranges: rest };
    setWaiting(next);
    store.setMessage(shareReadyText({ ...rest[0]!, total: batch.files.length }));
    return 'more' as const;
  };

  /** Makes one queued photo's file: decode, draw with its own caption, encode, let the bitmap go. */
  const makeFile = async (photo: QueuedPhoto) => {
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
    return new File([blob], filenameOf(photo), { type: 'image/jpeg' });
  };

  /**
   * Hands made files to the share sheet in the runs it takes at once, straight away when the tap
   * that asked still counts, otherwise waiting for the next tap (`shareReady`).
   * @param onTap true when called within the tap itself, nothing having been made since: the sheet
   * is opened without asking whether the tap still counts (older browsers cannot say)
   * @returns true when photos wait for a tap, false when they were handed over, null when the
   * sheet takes none of them
   */
  const shareFiles = async (files: File[], asked: number, failed: string[], onTap = false) => {
    // A phone's sheet may not take this many at once: it gets them in runs it does take, so a
    // batch meant for Photos never turns into a ZIP in Files.
    const ranges = splitToFit(
      files.length,
      range => navigator.canShare?.({ files: files.slice(range.start, range.end) }) ?? false,
    );
    if (ranges.length === 0) return null;
    const batch = { files, ranges, asked, failed };
    setWaiting(batch);
    store.setMessage(shareReadyText({ ...ranges[0]!, total: files.length }));
    if (onTap || navigator.userActivation?.isActive) return (await shareNext(batch)) !== 'done';
    return true;
  };

  // Photos made ahead, while the user picks in the save dialog, so that tapping Save can open the
  // share sheet at once: the sheet opens only straight after a tap, and making photos takes
  // longer than that. One run at a time, each photo decoded only after the last is let go.
  const prepared = useRef(new Map<string, File>());
  const preparing = useRef(0);
  const prepareChain = useRef(Promise.resolve());
  const holdingPreview = useRef(false);
  const [preparedCount, setPreparedCount] = useState<{ done: number; total: number } | null>(null);

  /**
   * Makes the chosen photos ahead, for the share sheet. A new choice calls off the run in flight
   * after its current photo; photos no longer chosen are let go.
   * @param ids the photos now chosen
   */
  const prepare = (ids: readonly string[]) => {
    const run = ++preparing.current;
    const chosen = queue.items.filter(photo => ids.includes(photo.id));
    for (const id of prepared.current.keys()) if (!ids.includes(id)) prepared.current.delete(id);
    const count = () => ({
      done: chosen.filter(photo => prepared.current.has(photo.id)).length,
      total: chosen.length,
    });
    setPreparedCount(count());
    prepareChain.current = prepareChain.current.then(async () => {
      if (run !== preparing.current) return;
      // The dialog covers the preview: its full-size bitmap makes way for the photos made here.
      if (!holdingPreview.current) {
        holdingPreview.current = true;
        await store.holdPreview();
      }
      for (const photo of chosen) {
        if (run !== preparing.current) return;
        if (prepared.current.has(photo.id)) continue;
        try {
          prepared.current.set(photo.id, await makeFile(photo));
        } catch {
          // Left out: the save run tries it again and names it if it fails there too.
        }
        if (run === preparing.current) setPreparedCount(count());
      }
    });
  };

  /** Calls off making ahead, lets the made photos go and gives the preview back its bitmap. */
  const releasePrepared = () => {
    preparing.current++;
    prepared.current.clear();
    setPreparedCount(null);
    prepareChain.current = prepareChain.current.then(() => {
      if (!holdingPreview.current) return;
      holdingPreview.current = false;
      store.resumePreview();
    });
  };

  /**
   * Exports the chosen queued photos as JPEG, one after another, with the shared output settings
   * and each photo's own caption, and saves them the way this browser does best (`batchSaveWay`).
   * Only one decoded photo is in memory at any moment: decode, draw, encode, close the bitmap.
   * Into a folder each file is written and let go before the next; for a ZIP or the share sheet
   * the encoded files are kept until the end. For the share sheet, photos already made ahead
   * (`prepare`) are used as they are, and when all of them are, the sheet opens on this tap. A
   * photo that fails to export is skipped and named in the summary.
   * @param ids the photos to save
   * @param way how to save them; the folder picker opens straight away, while the click still counts
   * @returns true when photos wait for a tap to open the share sheet (`shareReady`)
   */
  const savePhotos = async (ids: readonly string[], way: BatchSaveWay) => {
    const photos = queue.items.filter(photo => ids.includes(photo.id));
    if (photos.length === 0 || store.saving) return false;
    // First, before anything is awaited: the browser opens the picker only straight after a click.
    const folder = way === 'folder' ? await pickFolder() : null;
    if (way === 'folder' && !folder) return false;
    setWaiting(null);

    if (way === 'share') {
      // All made ahead: nothing to wait for, so this very tap opens the sheet.
      if (photos.every(photo => prepared.current.has(photo.id))) {
        const files = photos.map(photo => prepared.current.get(photo.id)!);
        const waits = await shareFiles(files, photos.length, [], true);
        if (waits !== null) return waits;
      }
      // Not all yet: the run below makes the rest, after the one in flight lets its photo go.
      preparing.current++;
      await prepareChain.current;
    }

    await store.startSaving(photos.length);
    const failed: string[] = [];
    const made: File[] = [];
    let sent = 0;
    let stopped = false;
    for (const [index, photo] of photos.entries()) {
      stopped = !store.advanceSaving(index + 1);
      if (stopped) break;
      try {
        const file = prepared.current.get(photo.id) ?? (await makeFile(photo));
        if (folder) await writeToFolder(folder, file.name, file);
        else made.push(file);
        sent++;
      } catch {
        failed.push(photo.file.name);
      }
    }
    // The run gives the preview its bitmap back, which also ends any hold for making ahead.
    holdingPreview.current = false;
    store.finishSaving();

    const report = (to: SaveDestination) => {
      const summary = saveSummaryText({ sent, total: photos.length, failed, stopped, to });
      if (failed.length > 0) setError(summary);
      else store.setMessage(summary);
    };
    if (folder) {
      report({ way: 'folder', folder: folder.name });
      return false;
    }
    if (stopped) {
      report(way === 'share' ? { way } : { way: 'zip', name: '' });
      return false;
    }
    if (made.length === 0) {
      setError(noneMadeText(failed));
      return false;
    }
    if (way === 'share') {
      const waits = await shareFiles(made, photos.length, failed);
      if (waits !== null) return waits;
    }
    const name = zipName(made.length, new Date());
    void downloadBlob(await makeZip(made.map(file => ({ name: file.name, blob: file }))), name);
    report({ way: 'zip', name });
    return false;
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
    /** The photos the next tap hands to the share sheet, and how many wait in all; or null. */
    shareRange: waiting ? { ...waiting.ranges[0]!, total: waiting.files.length } : null,
    /**
     * Opens the share sheet with the next waiting photos. Called from the tap that asks for it.
     * @returns `done` when every photo was handed over, `more` when another run waits, `wait` when
     * this one still does
     */
    shareReady: () => (waiting ? shareNext(waiting) : Promise.resolve('done' as const)),
    /** Lets go of photos made for the share sheet without sharing them, and of those made ahead. */
    dropReady: () => {
      setWaiting(null);
      releasePrepared();
    },
    prepare,
    /** How many of the chosen photos are made ahead, or null when none are being made. */
    preparedCount,
  };
};
