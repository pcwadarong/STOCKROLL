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

/**
 * How a batch of files is saved here. `folder`: written one by one into a folder the user picks
 * (desktop Chrome and Edge). `share`: handed together to the share sheet, where the user picks
 * Photos, Files or an app (phones and tablets). `zip`: one ZIP to the downloads (desktop Safari,
 * Firefox), so a batch does not land as loose files among everything else.
 */
export type BatchSaveWay = 'folder' | 'share' | 'zip';

/**
 * Picks how a batch is saved from what the browser can do. A Mac's Safari can share files too, so
 * sharing is taken only on a touch screen, where the share sheet is how photos reach the gallery.
 * @param can whether a folder can be picked, files can be shared, and the main pointer is a finger
 * @returns the way to save
 */
export const batchSaveWay = (can: {
  pickFolder: boolean;
  shareFiles: boolean;
  touch: boolean;
}): BatchSaveWay => {
  if (can.pickFolder) return 'folder';
  if (can.shareFiles && can.touch) return 'share';
  return 'zip';
};

/**
 * Works out this browser's way to save a batch.
 * @returns the way to save
 */
export const batchSaveWayHere = () =>
  batchSaveWay({
    pickFolder: typeof window !== 'undefined' && 'showDirectoryPicker' in window,
    shareFiles: canShareFiles(),
    touch: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
  });

/**
 * Names a copy so it does not replace a file of the same name: `photo.jpg` becomes
 * `photo (2).jpg`.
 * @param name the file name
 * @param number which copy, from 2
 * @returns the numbered name
 */
export const numberedName = (name: string, number: number) => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? `${name.slice(0, dot)} (${number})${name.slice(dot)}` : `${name} (${number})`;
};

type DirectoryHandle = {
  name: string;
  getFileHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

/**
 * Asks the user for a folder to save into. Must be called from the click itself: the browser
 * refuses the picker once the click has been awaited past.
 * @returns the folder, or null when the user closed the picker
 */
export const pickFolder = async (): Promise<DirectoryHandle | null> => {
  const picker = (
    window as unknown as {
      showDirectoryPicker: (options: object) => Promise<DirectoryHandle>;
    }
  ).showDirectoryPicker;
  try {
    // `id` brings the picker back to the folder used last time.
    return await picker({ id: 'stockroll-save', mode: 'readwrite', startIn: 'pictures' });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') return null;
    throw cause;
  }
};

/**
 * Writes a file into a picked folder, numbering the name rather than replacing a file already
 * there. Unlike a download, the write is known to have finished when this resolves.
 * @param folder the picked folder
 * @param name the file name
 * @param blob the file's contents
 * @returns the name the file was written under
 */
export const writeToFolder = async (folder: DirectoryHandle, name: string, blob: Blob) => {
  let written = name;
  for (let number = 2; ; number++) {
    try {
      await folder.getFileHandle(written);
      written = numberedName(name, number);
    } catch {
      break;
    }
  }
  const handle = await folder.getFileHandle(written, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return written;
};
