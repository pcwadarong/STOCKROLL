import type { ExifInfo } from '@/entities/photo';

// A photo taken from the picker's camera option is handed over seconds after it is written.
const FRESH_MS = 2 * 60_000;

/**
 * Shown under a photo that looks like it came from the browser's own camera option. iOS strips
 * the shooting info from those before the page receives the file, and the option cannot be
 * removed from the picker, so the way around it is to say where the info survives.
 */
export const BROWSER_CAPTURE_HINT =
  'This photo carries no shooting info. Photos taken from the browser’s camera option lose it: take them with the Camera app, then open them from your photo library.';

/**
 * Tells whether a just-opened file looks like a photo taken from the file picker's camera option:
 * it carries none of the shooting info a frame shows, and it was written moments before it was
 * opened. Film scans and old exports also lack the info but are not fresh, so they stay quiet.
 * @param exif shooting info read from the file
 * @param lastModified the file's modification time (ms since epoch)
 * @param openedAt when the file was opened in the editor (ms since epoch)
 * @returns true when the hint about the browser camera should be shown
 */
export const looksLikeBrowserCapture = (exif: ExifInfo, lastModified: number, openedAt: number) =>
  Object.values(exif).every(value => value === undefined) &&
  openedAt >= lastModified &&
  openedAt - lastModified < FRESH_MS;
