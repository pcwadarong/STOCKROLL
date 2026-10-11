import type { ExifInfo, FocalMode } from '../model/exif-info';

const isPositive = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const trimNumber = (value: number) => String(Math.round(value * 10) / 10);

// Lab scans carry the scanner's name in Make/Model. That is not the camera that took the photo.
const SCANNER_PATTERN =
  /noritsu|ez controller|frontier|sp-?(500|2000|3000)|epson|plustek|opticfilm|pakon|coolscan|imacon|flextight|pacific image|reflecta/i;

/**
 * Tells whether EXIF Make/Model points to a film scanner rather than a camera.
 * @param make EXIF Make
 * @param model EXIF Model
 * @returns true for a scanner
 */
export const isScannerDevice = (make?: string, model?: string) =>
  SCANNER_PATTERN.test(`${make ?? ''} ${model ?? ''}`);

/**
 * Joins make and model into one line. Skips the make when the model already includes it (e.g. Canon).
 * @param make EXIF Make
 * @param model EXIF Model
 * @returns camera name for display. Empty string when both are missing
 */
export const formatCamera = (make?: string, model?: string) => {
  const m = make?.trim() ?? '';
  const n = model?.trim() ?? '';
  if (!m || !n) return m || n;
  return n.toLowerCase().startsWith(m.toLowerCase()) ? n : `${m} ${n}`;
};

/**
 * Formats an exposure time as a shutter speed.
 * @param seconds exposure time in seconds
 * @returns a string like `1/250s`, `0.5s` or `2s`
 */
export const formatShutter = (seconds: number) =>
  seconds >= 0.4 ? `${trimNumber(seconds)}s` : `1/${Math.round(1 / seconds)}s`;

/**
 * Reads a shutter speed typed by hand.
 * Accepts fractions and seconds with or without a unit: `1/250`, `1/250s`, `0.5`, `2s`, `2"`.
 * @param text what the user typed
 * @returns exposure time in seconds, or undefined when the text is not a shutter speed
 */
export const parseShutter = (text: string) => {
  const match = /^\s*(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?\s*(?:s|sec|")?\s*$/i.exec(text);
  if (!match) return undefined;
  const seconds = Number(match[1]) / (match[2] ? Number(match[2]) : 1);
  return isPositive(seconds) ? seconds : undefined;
};

/**
 * Joins ISO, focal length, aperture and shutter speed into one line.
 * Only present values are used; nothing is guessed — if 35mm equivalent is selected but EXIF
 * has no equivalent value, the actual focal length is kept.
 * @param info shooting info read from the file
 * @param focalMode whether to show the actual or 35mm-equivalent focal length
 * @returns a string like `ISO1250 72mm F5.6 1/250s`. Empty string when nothing is available
 */
export const formatExposure = (info: ExifInfo, focalMode: FocalMode) => {
  const focal = focalMode === '35mm' ? (info.focalLength35 ?? info.focalLength) : info.focalLength;
  return [
    isPositive(info.iso) ? `ISO${Math.round(info.iso)}` : '',
    isPositive(focal) ? `${Math.round(focal)}mm` : '',
    isPositive(info.aperture) ? `F${trimNumber(info.aperture)}` : '',
    isPositive(info.exposureTime) ? formatShutter(info.exposureTime) : '',
  ]
    .filter(Boolean)
    .join(' ');
};
