import type { OutputPreset } from './presets';

export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

export type FrameLayout = {
  canvas: Size;
  photo: Rect;
  caption: Rect;
  /** Length of 1px on a 1080-wide canvas. Makes text and margins scale with the output size. */
  unit: number;
};

// Dimensions on a 1080-wide canvas
const BASE_WIDTH = 1080;
const MARGIN = 48;
const CAPTION_GAP = 26;
const CAPTION_HEIGHT = 74;

const layoutOriginal = (photo: Size, longEdge: number): FrameLayout => {
  // Never upscale
  const scale = Math.min(1, longEdge / Math.max(photo.width, photo.height));
  const width = Math.round(photo.width * scale);
  const height = Math.round(photo.height * scale);

  // Match the margin ratio of a fixed preset whose photo fills the full width
  const unit = width / (BASE_WIDTH - MARGIN * 2);
  const margin = Math.round(MARGIN * unit);
  const gap = Math.round(CAPTION_GAP * unit);
  const captionHeight = Math.round(CAPTION_HEIGHT * unit);

  return {
    canvas: {
      width: width + margin * 2,
      height: margin + height + gap + captionHeight + margin,
    },
    photo: { x: margin, y: margin, width, height },
    caption: { x: margin, y: margin + height + gap, width, height: captionHeight },
    unit,
  };
};

const layoutFixed = (photo: Size, canvasWidth: number, canvasHeight: number): FrameLayout => {
  const canvas = { width: Math.round(canvasWidth), height: Math.round(canvasHeight) };
  const unit = canvas.width / BASE_WIDTH;
  const margin = MARGIN * unit;
  const gap = CAPTION_GAP * unit;
  const captionHeight = CAPTION_HEIGHT * unit;

  const areaWidth = canvas.width - margin * 2;
  const areaHeight = canvas.height - margin * 2 - gap - captionHeight;
  const scale = Math.min(areaWidth / photo.width, areaHeight / photo.height);
  const width = Math.round(photo.width * scale);
  const height = Math.round(photo.height * scale);

  const x = Math.round((canvas.width - width) / 2);
  const y = Math.round((canvas.height - (height + gap + captionHeight)) / 2);

  return {
    canvas,
    photo: { x, y, width, height },
    caption: { x, y: y + height + gap, width, height: captionHeight },
    unit,
  };
};

// Mobile Safari refuses canvases above roughly 16.7 million pixels and fails silently.
const MAX_CANVAS_PIXELS = 16_000_000;

const scaleRect = (rect: Rect, factor: number): Rect => ({
  x: Math.round(rect.x * factor),
  y: Math.round(rect.y * factor),
  width: Math.round(rect.width * factor),
  height: Math.round(rect.height * factor),
});

/** Shrinks a layout uniformly when its canvas would exceed what browsers can allocate. */
const fitPixelBudget = (layout: FrameLayout): FrameLayout => {
  const pixels = layout.canvas.width * layout.canvas.height;
  if (pixels <= MAX_CANVAS_PIXELS) return layout;
  const factor = Math.sqrt(MAX_CANVAS_PIXELS / pixels);
  return {
    canvas: {
      width: Math.round(layout.canvas.width * factor),
      height: Math.round(layout.canvas.height * factor),
    },
    photo: scaleRect(layout.photo, factor),
    caption: scaleRect(layout.caption, factor),
    unit: layout.unit * factor,
  };
};

/**
 * Fits the photo into the canvas without cropping (contain) and attaches the caption right below it.
 * Photo and caption are centered vertically as one block, so a landscape photo in a portrait canvas
 * doesn't leave the caption stranded at the bottom, far from the photo.
 * @param photo pixel size of the source photo
 * @param preset output preset
 * @param detail `optimized` uses the preset's working size; `full` keeps the photo's own resolution
 * @returns canvas size and the rectangles for the photo and caption
 */
export const computeLayout = (
  photo: Size,
  preset: OutputPreset,
  detail: 'optimized' | 'full' = 'optimized',
): FrameLayout => {
  if (preset.kind === 'original') {
    const layout = layoutOriginal(photo, detail === 'full' ? Infinity : preset.longEdge);
    return fitPixelBudget(layout);
  }

  const base = layoutFixed(photo, preset.width, preset.height);
  if (detail === 'optimized') return base;

  // Full detail: enlarge the whole canvas until the photo is drawn at its own resolution.
  // Never below the preset size, so a small photo still gets a properly sized canvas.
  const factor = Math.max(1, photo.width / base.photo.width);
  return fitPixelBudget(layoutFixed(photo, preset.width * factor, preset.height * factor));
};
