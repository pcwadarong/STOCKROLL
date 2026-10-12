import type { Rect, Size } from './layout';

/** How the shooting info is arranged, and where. Each template is one finished look. */
export type FrameTemplate =
  'label' | 'center' | 'bar' | 'overlay' | 'stamp' | 'film' | 'text' | 'none';

export type FontId = 'sans' | 'grotesk' | 'serif' | 'typewriter' | 'display' | 'digital';
export type TextSize = 's' | 'm' | 'l';
export type TextAlign = 'left' | 'center' | 'right';
export type FramePosition = 'top' | 'center' | 'bottom';
export type FrameCrop = 'none' | '16:9' | 'cinema' | 'pano';
export type PaddingStep = 0 | 1 | 2 | 3;

/** Everything about the look of an exported frame that is not the photo or its shooting info. */
export type FrameStyle = {
  template: FrameTemplate;
  /** Margin color as `#rrggbb`. Text color is derived from it. */
  background: string;
  padding: PaddingStep;
  /** Where the photo sits when the canvas is taller than the photo and its caption. */
  position: FramePosition;
  /** The one way a photo is ever cropped: a wide cut the user asks for. */
  crop: FrameCrop;
  font: FontId;
  textSize: TextSize;
  /** Lettering color as `#rrggbb`, or empty to let the template and the margin color decide. */
  textColor: string;
  /** Where the Text template puts its line and image. */
  align: TextAlign;
  /** A free line of the user's own. Drawn by the Text template only. */
  text: string;
};

export const TEMPLATES = [
  { value: 'label', label: 'Label', hint: 'Camera on the left, exposure on the right.' },
  { value: 'center', label: 'Centered', hint: 'Two lines under the photo.' },
  { value: 'bar', label: 'Bar', hint: 'Exposure values spread across one line.' },
  { value: 'overlay', label: 'Overlay', hint: 'Text on the photo, no caption margin.' },
  { value: 'stamp', label: 'Date stamp', hint: 'Amber read-out in the corners of the photo.' },
  { value: 'film', label: 'Film strip', hint: 'Sprocket holes and edge print.' },
  { value: 'text', label: 'Text', hint: 'Your own line and a small image, set the way you like.' },
  { value: 'none', label: 'Photo only', hint: 'Just the photo.' },
] as const satisfies readonly { value: FrameTemplate; label: string; hint: string }[];

export const FONTS = [
  { value: 'sans', label: 'System sans' },
  { value: 'grotesk', label: 'Barlow' },
  { value: 'serif', label: 'Serif' },
  { value: 'typewriter', label: 'Courier Prime' },
  { value: 'display', label: 'Anton' },
  { value: 'digital', label: 'Segment display' },
] as const satisfies readonly { value: FontId; label: string }[];

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

/** Lettering colors offered beside the color picker. The empty value lets the template decide. */
export const TEXT_SWATCHES = [
  { value: '', label: 'Auto' },
  { value: '#ffffff', label: 'White' },
  { value: '#111111', label: 'Black' },
] as const;

/** Margin around the photo for each padding step, on a 1080-wide canvas. */
export const PADDING_UNITS: Record<PaddingStep, number> = { 0: 0, 1: 24, 2: 48, 3: 96 };

const TEXT_SCALE: Record<TextSize, number> = { s: 0.85, m: 1, l: 1.25 };

// The date stamp is a small read-out in the corner of the picture, not a caption.
const TEMPLATE_SCALE: Partial<Record<FrameTemplate, number>> = { stamp: 0.74 };

/**
 * How large the lettering is drawn: the size the user picked, adjusted for templates whose text
 * is meant to be smaller than a caption.
 * @param style the look picked in the editor
 * @returns a multiplier on the base text size
 */
export const textScale = (style: Pick<FrameStyle, 'template' | 'textSize'>) =>
  TEXT_SCALE[style.textSize] * (TEMPLATE_SCALE[style.template] ?? 1);

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
  font: 'sans',
  textSize: 'm',
  textColor: '',
  align: 'center',
  text: '',
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
    template: isOneOf(TEMPLATES, raw.template) ? raw.template : base.template,
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
    font: isOneOf(FONTS, raw.font) ? raw.font : base.font,
    textSize:
      raw.textSize === 's' || raw.textSize === 'l' || raw.textSize === 'm'
        ? raw.textSize
        : base.textSize,
    textColor:
      typeof raw.textColor === 'string' && HEX.test(raw.textColor)
        ? raw.textColor.toLowerCase()
        : base.textColor,
    align:
      raw.align === 'left' || raw.align === 'right' || raw.align === 'center'
        ? raw.align
        : base.align,
    text: typeof raw.text === 'string' ? raw.text : base.text,
  };
};

// Templates other than Text are finished looks with their own lettering.
const TEMPLATE_FONT: Partial<Record<FrameTemplate, FontId>> = { stamp: 'digital' };

/**
 * The style as it is actually drawn. Lettering choices (font, size, color, alignment, own text)
 * belong to the Text template; every other template keeps its own fixed lettering, so a choice
 * made for Text never leaks into a look that was not designed around it.
 * @param style the style as stored
 * @returns the style to draw with
 */
export const effectiveStyle = (style: FrameStyle): FrameStyle =>
  style.template === 'text'
    ? style
    : {
        ...style,
        font: TEMPLATE_FONT[style.template] ?? DEFAULT_STYLE.font,
        textSize: DEFAULT_STYLE.textSize,
        textColor: DEFAULT_STYLE.textColor,
        align: DEFAULT_STYLE.align,
        text: '',
      };

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
