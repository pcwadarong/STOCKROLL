import type { OutputPreset } from './presets';
import type { FramePosition } from './style';

export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

/**
 * What the layout needs to know about the look. All lengths are on a 1080-wide canvas, so the
 * same spec gives the same proportions at any output size.
 */
export type FrameSpec = {
  /** Margin around the photo. */
  margin: number;
  position: FramePosition;
  /** Part of the photo to draw, in photo pixels. The whole photo when nothing is cropped. */
  source: Rect;
  /** Height reserved for the caption. Zero when there is none. */
  captionHeight: number;
  /** `below` adds the caption under the photo; `over` and `strip` take no room of their own. */
  captionPlacement: 'below' | 'over' | 'strip';
  /** Height of the film strip band above and below the photo. Zero for no strip. */
  strip: number;
  /**
   * Room the user's text needs just above or below the photo, its gap included, kept free on top
   * of the margin. None when omitted.
   */
  markRoom?: { above: number; below: number };
};

export type FrameLayout = {
  canvas: Size;
  /** Where the photo is drawn on the canvas. */
  photo: Rect;
  /** Which part of the source photo is drawn there. */
  source: Rect;
  /** Where the caption rows go. Zero-sized when there is no caption. */
  caption: Rect;
  /** The film strip bands, when the look has them. */
  strips: { top: Rect; bottom: Rect } | null;
  /** Length of 1px on a 1080-wide canvas. Makes text and margins scale with the output size. */
  unit: number;
};

// Dimensions on a 1080-wide canvas
const BASE_WIDTH = 1080;
const CAPTION_GAP = 26;
// A caption never touches the canvas edge, even with no margin around the photo.
const MIN_INSET = 24;
// Text laid over the photo keeps this far from its edges.
const OVER_INSET = 28;

/** The default look: a medium margin, centered, with the classic two-row caption below. */
export const defaultSpec = (photo: Size): FrameSpec => ({
  margin: 48,
  position: 'center',
  source: { x: 0, y: 0, width: photo.width, height: photo.height },
  captionHeight: 74,
  captionPlacement: 'below',
  strip: 0,
});

type Measured = {
  margin: number;
  bottomPad: number;
  strip: number;
  gap: number;
  captionBelow: number;
  roomAbove: number;
  roomBelow: number;
};

const measure = (spec: FrameSpec, unit: number): Measured => {
  const below = spec.captionPlacement === 'below' && spec.captionHeight > 0;
  const margin = spec.margin * unit;
  return {
    margin,
    bottomPad: below ? Math.max(margin, MIN_INSET * unit) : margin,
    strip: spec.strip * unit,
    gap: below ? CAPTION_GAP * unit : 0,
    captionBelow: below ? spec.captionHeight * unit : 0,
    roomAbove: (spec.markRoom?.above ?? 0) * unit,
    roomBelow: (spec.markRoom?.below ?? 0) * unit,
  };
};

/** Places the photo, its strips and its caption once the photo's drawn size and origin are known. */
const assemble = (
  canvas: Size,
  spec: FrameSpec,
  unit: number,
  m: Measured,
  origin: { x: number; y: number },
  drawn: Size,
): FrameLayout => {
  const photo = { x: origin.x, y: origin.y + m.strip, width: drawn.width, height: drawn.height };
  const strips =
    m.strip > 0
      ? {
          top: { x: photo.x, y: origin.y, width: photo.width, height: m.strip },
          bottom: { x: photo.x, y: photo.y + photo.height, width: photo.width, height: m.strip },
        }
      : null;

  const captionHeight = spec.captionHeight * unit;
  let caption: Rect = { x: photo.x, y: photo.y + photo.height, width: photo.width, height: 0 };
  if (spec.captionHeight > 0) {
    if (spec.captionPlacement === 'below') {
      // With no margin the photo runs edge to edge, but its caption still needs side room.
      const inset = Math.max(0, MIN_INSET * unit - m.margin);
      caption = {
        x: photo.x + inset,
        y: photo.y + photo.height + m.strip + m.gap,
        width: photo.width - inset * 2,
        height: captionHeight,
      };
    } else if (spec.captionPlacement === 'over') {
      const inset = OVER_INSET * unit;
      caption = {
        x: photo.x + inset,
        y: photo.y + photo.height - inset - captionHeight,
        width: photo.width - inset * 2,
        height: captionHeight,
      };
    } else if (strips) {
      const inset = OVER_INSET * unit;
      caption = { ...strips.bottom, x: strips.bottom.x + inset, width: photo.width - inset * 2 };
    }
  }

  return { canvas, photo, source: spec.source, caption, strips, unit };
};

const layoutOriginal = (spec: FrameSpec, longEdge: number): FrameLayout => {
  const { source } = spec;
  // Never upscale
  const scale = Math.min(1, longEdge / Math.max(source.width, source.height));
  const drawn = {
    width: Math.round(source.width * scale),
    height: Math.round(source.height * scale),
  };

  // Match the margin ratio of a fixed preset whose photo fills the full width
  const unit = drawn.width / (BASE_WIDTH - spec.margin * 2);
  const raw = measure(spec, unit);
  const m: Measured = {
    margin: Math.round(raw.margin),
    bottomPad: Math.round(raw.bottomPad),
    strip: Math.round(raw.strip),
    gap: Math.round(raw.gap),
    captionBelow: Math.round(raw.captionBelow),
    roomAbove: Math.round(raw.roomAbove),
    roomBelow: Math.round(raw.roomBelow),
  };

  // The canvas grows by the user's text room: this output has no shape of its own to keep.
  const canvas = {
    width: drawn.width + m.margin * 2,
    height:
      m.roomAbove +
      m.margin +
      m.strip * 2 +
      drawn.height +
      m.gap +
      m.captionBelow +
      m.bottomPad +
      m.roomBelow,
  };
  // This canvas hugs its content, so every edge lands on a whole pixel.
  const origin = { x: m.margin, y: m.roomAbove + m.margin };
  const layout = assemble(canvas, spec, unit, m, origin, drawn);
  return {
    ...layout,
    caption:
      spec.captionPlacement === 'below'
        ? {
            x: Math.round(layout.caption.x),
            y: layout.photo.y + layout.photo.height + m.strip + m.gap,
            width: Math.round(layout.caption.width),
            height: m.captionBelow,
          }
        : scaleRect(layout.caption, 1),
  };
};

const layoutFixed = (
  spec: FrameSpec,
  canvasWidth: number,
  canvasHeight: number,
  maxScale = Infinity,
): FrameLayout => {
  const { source } = spec;
  const canvas = { width: Math.round(canvasWidth), height: Math.round(canvasHeight) };
  const unit = canvas.width / BASE_WIDTH;
  const m = measure(spec, unit);

  const extra = m.strip * 2 + m.gap + m.captionBelow;
  const areaWidth = canvas.width - m.margin * 2;
  // The user's text room comes out of the photo's share, so the output keeps its shape.
  const areaHeight = canvas.height - m.margin - m.bottomPad - extra - m.roomAbove - m.roomBelow;
  const scale = Math.min(areaWidth / source.width, areaHeight / source.height, maxScale);
  const drawn = {
    width: Math.round(source.width * scale),
    height: Math.round(source.height * scale),
  };

  // Photo, strips and caption move as one block, so the caption never strands far from the photo.
  const blockHeight = drawn.height + extra;
  const free = canvas.height - m.margin - m.bottomPad - blockHeight;
  const placed =
    spec.position === 'top'
      ? m.margin
      : spec.position === 'bottom'
        ? m.margin + free
        : m.margin + free / 2;
  // The block moves only as far as the text room needs, so a photo with space to spare around it
  // stays where the position puts it.
  const y = Math.min(
    Math.max(placed, m.margin + m.roomAbove),
    canvas.height - m.bottomPad - m.roomBelow - blockHeight,
  );

  const origin = { x: Math.round((canvas.width - drawn.width) / 2), y: Math.round(y) };
  return assemble(canvas, spec, unit, m, origin, drawn);
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
    // The source is in photo pixels, not canvas pixels: it does not shrink with the canvas.
    source: layout.source,
    caption: scaleRect(layout.caption, factor),
    strips: layout.strips && {
      top: scaleRect(layout.strips.top, factor),
      bottom: scaleRect(layout.strips.bottom, factor),
    },
    unit: layout.unit * factor,
  };
};

/**
 * Fits the photo into the canvas without cropping (contain) and attaches the caption to it.
 * Photo and caption are placed as one block, so a landscape photo in a portrait canvas doesn't
 * leave the caption stranded at the bottom, far from the photo. The only cropping is the source
 * rectangle the spec carries, which is the whole photo unless the user asked for a wide cut.
 * @param photo pixel size of the source photo
 * @param preset output preset
 * @param detail `optimized` uses the preset's working size; `full` keeps the photo's own resolution
 * @param spec margin, placement, crop and caption room. Defaults to the classic look
 * @returns canvas size and the rectangles for the photo, its strips and its caption
 */
export const computeLayout = (
  photo: Size,
  preset: OutputPreset,
  detail: 'optimized' | 'full' = 'optimized',
  spec: FrameSpec = defaultSpec(photo),
): FrameLayout => {
  if (preset.kind === 'original') {
    const layout = layoutOriginal(spec, detail === 'full' ? Infinity : preset.longEdge);
    return fitPixelBudget(layout);
  }

  const base = layoutFixed(spec, preset.width, preset.height);
  if (detail === 'optimized') return base;

  // Full detail: enlarge the whole canvas until the photo is drawn at its own resolution.
  // The canvas never goes below the preset size, and a photo smaller than that is placed at its
  // own size rather than enlarged — "full" means no resampling up.
  const factor = Math.max(1, spec.source.width / base.photo.width);
  return fitPixelBudget(layoutFixed(spec, preset.width * factor, preset.height * factor, 1));
};
