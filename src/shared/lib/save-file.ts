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

/**
 * Downloads a Blob to the device as a file.
 * @param blob data to save
 * @param filename file name to save as
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking right after click makes Safari drop the download
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/**
 * Checks whether this browser supports sharing files (Web Share API).
 * @returns true if image files can be shared
 */
export const canShareFiles = () => {
  if (typeof navigator.canShare !== 'function') return false;
  return navigator.canShare({ files: [new File([], 'probe.jpg', { type: 'image/jpeg' })] });
};
