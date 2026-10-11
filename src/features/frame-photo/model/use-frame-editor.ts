import { useEffect, useMemo, useRef } from 'react';

import { computeLayout, drawFrame } from '@/entities/frame';
import { cameraCollection, filmCollection, lensCollection } from '@/entities/gear';
import { recipeCollection } from '@/entities/recipe';
import { canvasToJpeg, downloadBlob } from '@/shared/lib/save-file';
import { useCollection } from '@/shared/lib/use-collection';

import { outputFilename } from '../lib/output-filename';
import { resolveCaption } from '../lib/resolve-caption';

import { useEditorStore } from './editor-store';

// Optimized trades a little quality for a file that uploads fast; full keeps as much as JPEG allows.
const JPEG_QUALITY = { optimized: 0.9, full: 0.97 } as const;

/**
 * Editing logic for one mounted editor: resolves the caption from the store, the registered
 * library and EXIF, draws it onto the canvas, and exports JPEG.
 * @returns canvas ref, the store, the registered library, resolved caption state and export action
 */
export const useFrameEditor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const store = useEditorStore();
  const { source, picks, preset, paper, focalMode, detail, setError } = store;

  const cameras = useCollection(cameraCollection).items;
  const lenses = useCollection(lensCollection).items;
  const films = useCollection(filmCollection).items;
  const recipes = useCollection(recipeCollection).items;

  const resolved = useMemo(
    () => resolveCaption(picks, source?.exif ?? {}, focalMode, { cameras, lenses, films, recipes }),
    [picks, source, focalMode, cameras, lenses, films, recipes],
  );

  const layout = useMemo(
    () => (source ? computeLayout(source.bitmap, preset) : null),
    [source, preset],
  );

  const { caption } = resolved;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !source || !layout) return;
    canvas.width = layout.canvas.width;
    canvas.height = layout.canvas.height;
    drawFrame(ctx, source.bitmap, layout, caption, paper);
  }, [source, layout, paper, caption]);

  /**
   * Exports the current canvas as JPEG.
   * @param mode `download` saves a file, `share` opens the device share sheet
   */
  const exportJpeg = async (mode: 'download' | 'share') => {
    if (!source) return;
    setError('');
    try {
      // The preview stays at working size so typing stays fast; the file is drawn separately at
      // the chosen detail.
      const output = computeLayout(source.bitmap, preset, detail);
      const canvas = document.createElement('canvas');
      canvas.width = output.canvas.width;
      canvas.height = output.canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not available');
      drawFrame(ctx, source.bitmap, output, caption, paper);
      const blob = await canvasToJpeg(canvas, JPEG_QUALITY[detail]);
      const filename = outputFilename(source.name, preset.id);
      if (mode === 'download') return downloadBlob(blob, filename);
      await navigator.share({ files: [new File([blob], filename, { type: 'image/jpeg' })] });
    } catch (cause) {
      // Dismissing the share sheet is not a failure
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError('Export failed. Please try again.');
    }
  };

  return {
    canvasRef,
    store,
    library: { cameras, lenses, films, recipes },
    resolved,
    /** Pixel size of the file that export will write at the current detail. */
    outputSize: source ? computeLayout(source.bitmap, preset, detail).canvas : null,
    exportJpeg,
  };
};
