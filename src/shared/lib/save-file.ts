/**
 * Encodes a canvas as a JPEG Blob.
 * @param canvas canvas to encode
 * @param quality JPEG quality between 0 and 1
 * @returns JPEG Blob. Rejects if encoding fails
 */
export const canvasToJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('JPEG encoding failed'))),
      'image/jpeg',
      quality,
    );
  });

// Revoking right after click makes Safari drop the download, so the URL outlives it by this much.
const DOWNLOAD_HOLD_MS = 10_000;

/**
 * Hands a Blob to the browser as a file download. The browser gives no signal that the file was
 * written, or even that the download was allowed, so this never reports success: the promise only
 * says that the object URL was revoked and the Blob is no longer kept alive by it.
 * @param blob data to save
 * @param filename file name to save as
 * @param holdMs how long the object URL stays valid after the click. Callers that download many
 * files in a row pass a shorter hold and await the promise, so the files do not pile up in memory
 * @returns a promise that resolves once the object URL has been revoked
 */
export const downloadBlob = (blob: Blob, filename: string, holdMs = DOWNLOAD_HOLD_MS) =>
  new Promise<void>(resolve => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve();
    }, holdMs);
  });

/**
 * Checks whether this browser supports sharing files (Web Share API).
 * @returns true if image files can be shared
 */
export const canShareFiles = () => {
  if (typeof navigator.canShare !== 'function') return false;
  return navigator.canShare({ files: [new File([], 'probe.jpg', { type: 'image/jpeg' })] });
};
