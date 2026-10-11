import exifr from 'exifr';

import type { ExifInfo } from '../model/exif-info';

import { formatCamera, isScannerDevice } from './format-exif';

const TAGS = [
  'Make',
  'Model',
  'LensModel',
  'ISO',
  'FocalLength',
  'FocalLengthIn35mmFormat',
  'FNumber',
  'ExposureTime',
];

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const number = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * Reads only the EXIF needed for a frame from an image file. GPS is not read.
 * @param file image file
 * @returns shooting info. Empty object when there is no EXIF (e.g. film scans) or it can't be read
 */
export const readExif = async (file: Blob): Promise<ExifInfo> => {
  // Given a Blob, exifr only reads the head of the file. Lightroom exports put a large segment
  // before EXIF, so it falls outside that range and parsing silently returns nothing. Read it all.
  const raw = await file
    .arrayBuffer()
    .then(buffer => exifr.parse(buffer, { pick: TAGS }))
    .catch(() => undefined);
  if (!raw) return {};

  const make = text(raw.Make);
  const model = text(raw.Model);
  // Showing a scanner's Make/Model as the camera would bake wrong information into the photo
  if (isScannerDevice(make, model)) return { scanner: formatCamera(make, model) };

  return {
    make,
    model,
    lens: text(raw.LensModel),
    iso: number(raw.ISO),
    focalLength: number(raw.FocalLength),
    focalLength35: number(raw.FocalLengthIn35mmFormat),
    aperture: number(raw.FNumber),
    exposureTime: number(raw.ExposureTime),
  };
};
