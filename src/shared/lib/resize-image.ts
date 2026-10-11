import { canvasToJpeg } from './save-file';

export type Size = { width: number; height: number };

/**
 * Scales a size down so its long edge fits a limit, keeping the aspect ratio.
 * A size that already fits is returned as it is — images are never upscaled.
 * @param size original width and height in pixels
 * @param maxLongEdge largest allowed width or height in pixels
 * @returns the target size in whole pixels, at least 1 × 1
 */
export const fitWithin = ({ width, height }: Size, maxLongEdge: number): Size => {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) return { width, height };
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/**
 * Shrinks an image and re-encodes it as JPEG, for the rare case an image is meant to leave the
 * device.
 *
 * Privacy guarantee: the pixels are drawn onto a canvas and encoded from there, so the result
 * carries none of the original file's metadata — no EXIF, no GPS position, no camera serial
 * number, no embedded thumbnail. Never upload the original file in place of this result.
 *
 * Browser only (canvas and `createImageBitmap`).
 * @param file image to prepare; its EXIF orientation is applied to the pixels
 * @param options `maxLongEdge` in pixels (default 1200) and JPEG `quality` from 0 to 1 (default 0.85)
 * @returns a JPEG Blob whose long edge is at most the limit. Rejects when the image cannot be
 * decoded or encoded
 */
export const resizeImage = async (
  file: Blob,
  { maxLongEdge = 1200, quality = 0.85 }: { maxLongEdge?: number; quality?: number } = {},
) => {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  try {
    const { width, height } = fitWithin(bitmap, maxLongEdge);
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');
    // JPEG has no transparency; without a backdrop, transparent PNG areas would come out black.
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    return await canvasToJpeg(canvas, quality);
  } finally {
    bitmap.close();
    // Safari holds on to canvas memory until the backing store is resized away.
    canvas.width = 0;
    canvas.height = 0;
  }
};
