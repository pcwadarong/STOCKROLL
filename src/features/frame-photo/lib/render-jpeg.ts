import {
  type Caption,
  computeLayout,
  drawFrame,
  type OutputPreset,
  type Paper,
} from '@/entities/frame';
import { canvasToJpeg } from '@/shared/lib/save-file';

/** How large the exported file is. `full` keeps the photo's own resolution. */
export type ExportDetail = 'optimized' | 'full';

// Optimized trades a little quality for a file that uploads fast; full keeps as much as JPEG allows.
const JPEG_QUALITY = { optimized: 0.9, full: 0.97 } as const;

/**
 * Decodes a photo at full size, with the rotation its EXIF asks for already applied.
 * The caller owns the bitmap and must `close()` it: one 24MP photo is about 96MB decoded.
 * @param file image file
 * @returns the decoded bitmap. Rejects when the browser cannot decode the file
 */
export const decodePhoto = (file: Blob) =>
  createImageBitmap(file, { imageOrientation: 'from-image' });

/**
 * Draws one framed photo on its own canvas, separate from the preview, and encodes it as JPEG.
 * The canvas is emptied before returning: Safari counts canvas memory against a page-wide limit
 * and frees it late, which a batch of full-size exports would run into.
 * @param bitmap decoded photo
 * @param settings output preset, file detail, caption strings and margin color
 * @returns the JPEG file contents
 */
export const renderJpeg = async (
  bitmap: ImageBitmap,
  settings: { preset: OutputPreset; detail: ExportDetail; caption: Caption; paper: Paper },
) => {
  const { preset, detail, caption, paper } = settings;
  const layout = computeLayout(bitmap, preset, detail);
  const canvas = document.createElement('canvas');
  canvas.width = layout.canvas.width;
  canvas.height = layout.canvas.height;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    drawFrame(ctx, bitmap, layout, caption, paper);
    return await canvasToJpeg(canvas, JPEG_QUALITY[detail]);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
};
