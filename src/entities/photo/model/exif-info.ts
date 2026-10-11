/** Shooting info that can be shown on a frame. Values missing from EXIF stay `undefined` and are never guessed. */
export type ExifInfo = {
  make?: string;
  /** Scanner name when the file was written by a film scanner rather than a camera. make/model are left empty then. */
  scanner?: string;
  model?: string;
  lens?: string;
  iso?: number;
  /** Actual focal length of the lens (mm) */
  focalLength?: number;
  /** 35mm-equivalent focal length recorded by the camera (mm). Never computed from a crop factor. */
  focalLength35?: number;
  aperture?: number;
  /** Exposure time (seconds) */
  exposureTime?: number;
};

export type FocalMode = 'actual' | '35mm';
