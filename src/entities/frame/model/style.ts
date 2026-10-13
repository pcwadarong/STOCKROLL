import type { FontId } from '@/shared/lib/canvas-fonts';

import type { Rect, Size } from './layout';

/** How the shooting info is arranged, and where. Each template is one finished look. */
export type FrameTemplate = 'label' | 'center' | 'bar' | 'overlay' | 'stamp' | 'film' | 'text';

export type TextSize = 's' | 'm' | 'l';
export type TextAlign = 'left' | 'center' | 'right';
export type FramePosition = 'top' | 'center' | 'bottom';
export type FrameCrop = 'none' | '16:9' | 'cinema' | 'pano';
export type PaddingStep = 0 | 1 | 2 | 3;

/**
 * Everything about the look of an exported frame that is not the photo, its shooting info or the
 * user's own text (which is not a frame setting: the same text also goes on recipe cards).
 */
export type FrameStyle = {
  template: FrameTemplate;
  /** Margin color as `#rrggbb`. Text color is derived from it. */
  background: string;
  padding: PaddingStep;
  /** Where the photo sits when the canvas is taller than the photo and its caption. */
  position: FramePosition;
  /** The one way a photo is ever cropped: a wide cut the user asks for. */
  crop: FrameCrop;
  /** Where the Text template puts the user's lines and image. */
  align: TextAlign;
};

/** How text is lettered: the face, the size step and the color (empty lets the margin decide). */
export type Lettering = { font: FontId; size: TextSize; color: string };

/**
 * The looks on offer. `own` says where the user's own text goes in that look, and is empty for a
 * look that has no place for it.
 */
export const TEMPLATES = [
  {
    value: 'label',
    label: 'Label',
    hint: 'Camera on the left, exposure on the right.',
    own: 'One line on the right, under the exposure.',
  },
  {
    value: 'center',
    label: 'Centered',
    hint: 'Two lines under the photo.',
    own: 'Up to two lines under the shooting info.',
  },
  { value: 'bar', label: 'Bar', hint: 'Exposure values spread across one line.', own: '' },
  {
    value: 'overlay',
    label: 'Overlay',
    hint: 'Text on the photo, no caption margin.',
    own: 'One line under the shooting info.',
  },
  {
    value: 'stamp',
    label: 'Date stamp',
    hint: 'Amber read-out in the corners of the photo.',
    own: 'One line under the exposure read-out.',
  },
  {
    value: 'film',
    label: 'Film strip',
    hint: 'Sprocket holes and edge print.',
    own: 'One line at the right of the upper strip.',
  },
  {
    value: 'text',
    label: 'Text',
    hint: 'No shooting info: your own text and image, or just the photo.',
    own: 'Up to two lines under the photo, with your image.',
  },
] as const satisfies readonly { value: FrameTemplate; label: string; hint: string; own: string }[];

export const CROPS = [
  { value: 'none', label: 'Off' },
  { value: '16:9', label: '16:9' },
  { value: 'cinema', label: '2.39:1' },
  { value: 'pano', label: 'Pano 65:24' },
] as const satisfies readonly { value: FrameCrop; label: string }[];

export const PADDINGS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'S' },
  { value: 2, label: 'M' },
  { value: 3, label: 'L' },
] as const satisfies readonly { value: PaddingStep; label: string }[];

/** Margin colors offered beside the color picker. */
export const BACKGROUND_SWATCHES = [
  { value: '#ffffff', label: 'White' },
  { value: '#0b0b0c', label: 'Black' },
  { value: '#f4efe3', label: 'Cream' },
] as const;

/** Margin around the photo for each padding step, on a 1080-wide canvas. */
export const PADDING_UNITS: Record<PaddingStep, number> = { 0: 0, 1: 24, 2: 48, 3: 96 };

const TEXT_SCALE: Record<TextSize, number> = { s: 0.85, m: 1, l: 1.25 };

// The date stamp is a small read-out in the corner of the picture, not a caption.
const TEMPLATE_SCALE: Partial<Record<FrameTemplate, number>> = { stamp: 0.74 };

/**
 * How large the lettering is drawn: the size step, adjusted for templates whose text is meant to
 * be smaller than a caption.
 * @param template the look picked
 * @param size the size step of the lettering
 * @returns a multiplier on the base text size
 */
export const textScale = (template: FrameTemplate, size: TextSize) =>
  TEXT_SCALE[size] * (TEMPLATE_SCALE[template] ?? 1);

const CROP_RATIO: Record<FrameCrop, number | null> = {
  none: null,
  '16:9': 16 / 9,
  cinema: 2.39,
  pano: 65 / 24,
};

export const DEFAULT_STYLE: FrameStyle = {
  template: 'label',
  background: '#ffffff',
  padding: 2,
  position: 'center',
  crop: 'none',
  align: 'center',
};

/** Templates whose text sits on the photo or on a dark strip, so the margin color does not set it. */
export const AMBER = '#ffa630';

const HEX = /^#[0-9a-f]{6}$/i;

const isOneOf = <T extends string | number>(
  options: readonly { value: T }[],
  value: unknown,
): value is T => options.some(option => option.value === value);

/**
 * Rebuilds a style from stored JSON, field by field. Anything missing or not recognized falls
 * back to the default, so a style saved by an older version (or edited by hand) never breaks the
 * editor.
 * @param stored the parsed value read from storage
 * @returns a complete, valid style
 */
export const parseStyle = (stored: unknown): FrameStyle => {
  const raw = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const base = DEFAULT_STYLE;
  return {
    // "Photo only" was a template of its own once; it is now Text with nothing typed.
    template: isOneOf(TEMPLATES, raw.template)
      ? raw.template
      : raw.template === 'none'
        ? 'text'
        : base.template,
    background:
      typeof raw.background === 'string' && HEX.test(raw.background)
        ? raw.background.toLowerCase()
        : base.background,
    padding: isOneOf(PADDINGS, raw.padding) ? raw.padding : base.padding,
    position:
      raw.position === 'top' || raw.position === 'bottom' || raw.position === 'center'
        ? raw.position
        : base.position,
    crop: isOneOf(CROPS, raw.crop) ? raw.crop : base.crop,
    align:
      raw.align === 'left' || raw.align === 'right' || raw.align === 'center'
        ? raw.align
        : base.align,
  };
};

/**
 * Tells whether a template prints shooting info. Text does not, so the editor has no reason to
 * ask for camera, lens or exposure while it is picked.
 * @param template the look picked
 * @returns true when camera, lens, exposure or look can appear on the frame
 */
export const usesShootingInfo = (template: FrameTemplate) => template !== 'text';

/** The lettering of every template but Text: finished looks keep their own. */
const FIXED_LETTERING: Lettering = { font: 'sans', size: 'm', color: '' };
const TEMPLATE_FONT: Partial<Record<FrameTemplate, FontId>> = { stamp: 'digital' };

/**
 * The lettering a caption is actually drawn in. The user's choices belong to the Text template;
 * every other template keeps its own fixed lettering, so a choice made for the user's own text
 * never leaks into a look that was not designed around it.
 * @param template the look picked
 * @param chosen the lettering the user picked for their own text
 * @returns the lettering to draw the caption with
 */
export const letteringFor = (template: FrameTemplate, chosen: Lettering): Lettering =>
  template === 'text'
    ? chosen
    : { ...FIXED_LETTERING, font: TEMPLATE_FONT[template] ?? FIXED_LETTERING.font };

/**
 * Picks text colors that read on a margin color: dark ink on light paper, light ink on dark.
 * @param background margin color as `#rrggbb`
 * @returns the main and the quieter text color
 */
export const inkFor = (background: string) => {
  const value = HEX.test(background) ? background : DEFAULT_STYLE.background;
  const [r, g, b] = [1, 3, 5].map(at => {
    const channel = parseInt(value.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4
    ? { ink: '#111111', subInk: 'rgba(17, 17, 17, 0.6)' }
    : { ink: '#f2f0ea', subInk: 'rgba(242, 240, 234, 0.62)' };
};

/**
 * The part of the photo that is drawn. Without a crop that is all of it; with one, the widest
 * centered band of that ratio. A photo already wider than the ratio is left whole.
 * @param photo pixel size of the source photo
 * @param crop the chosen cut
 * @returns the source rectangle in photo pixels
 */
export const cropRect = (photo: Size, crop: FrameCrop): Rect => {
  const ratio = CROP_RATIO[crop];
  const whole = { x: 0, y: 0, width: photo.width, height: photo.height };
  if (!ratio || photo.width / photo.height >= ratio) return whole;
  const height = Math.round(photo.width / ratio);
  return { x: 0, y: Math.round((photo.height - height) / 2), width: photo.width, height };
};
