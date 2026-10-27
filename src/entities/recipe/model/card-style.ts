import { BRAND } from '@/shared/config/palette';

import type { CardAlign, CardTextPlace } from './recipe-card';

/**
 * Where the user's own text goes on a recipe card: nowhere, a corner of the example photo, or
 * under everything at the bottom of the card. A card offers these few places only, so the choice
 * is the card's and not the one the frame editor keeps.
 */
export type CardOwnPlace =
  | 'off'
  | 'photo-top-left'
  | 'photo-top-right'
  | 'photo-bottom-left'
  | 'photo-bottom-right'
  | 'below-left'
  | 'below'
  | 'below-right';

/** `sheet` gives the text a place of its own beside the photos; `cover` sets it over them. */
export type CardDesign = 'sheet' | 'cover';
export type CardPadding = 's' | 'm' | 'l';
/** `optimized` saves the card at its working size; `full` at the detail its photos have. */
export type CardDetail = 'optimized' | 'full';
export type CardGap = 'none' | 's' | 'm' | 'l';

/** How a recipe card looks. One style for every recipe, remembered on this device. */
export type CardStyle = {
  design: CardDesign;
  /** Id of the output size, or `auto` for a card as tall as its content. */
  ratio: string;
  /** Card color as `#rrggbb`. */
  background: string;
  /** Color of the recipe name as `#rrggbb`, or empty to pick one that reads on the background. */
  titleColor: string;
  /** Color of the settings as `#rrggbb`, or empty to pick one that reads on the background. */
  textColor: string;
  ownPlace: CardOwnPlace;
  /** How the name and the settings are aligned, in either design. */
  align: CardAlign;
  /** Margin around the content; on a `cover` card, how far the text keeps from the edges. */
  padding: CardPadding;
  /** Space between photos when there are several. */
  gap: CardGap;
  /** `sheet`: the text comes before the photos — above, to the left, or in the first cell. */
  textFirst: boolean;
  /** `cover`: where the text group sits over the photos. */
  textPlace: CardTextPlace;
  /** `cover`: size of the text, in percent of the largest that still fits on the card. */
  textSize: number;
  /** `cover`: how much the photos are darkened under the text, in percent. */
  dim: number;
  /** How large the saved file is. The preview is always drawn at the working size. */
  detail: CardDetail;
};

/** Most photos a card can show. */
export const MAX_CARD_PHOTOS = 4;

export const CARD_DESIGNS = [
  { value: 'sheet', label: 'Beside' },
  { value: 'cover', label: 'Over' },
] as const satisfies readonly { value: CardDesign; label: string }[];

export const CARD_DETAILS = [
  { value: 'optimized', label: 'For posting' },
  { value: 'full', label: 'Original' },
] as const satisfies readonly { value: CardDetail; label: string }[];

export const CARD_ALIGNS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const satisfies readonly { value: CardAlign; label: string }[];

export const CARD_PADDINGS = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
] as const satisfies readonly { value: CardPadding; label: string }[];

export const CARD_GAPS = [
  { value: 'none', label: 'None' },
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
] as const satisfies readonly { value: CardGap; label: string }[];

export const CARD_TEXT_PLACES = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'center', label: 'Center' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
] as const satisfies readonly { value: CardTextPlace; label: string }[];

/** Margin and gap for each step, on a card whose short edge is 1080. */
export const CARD_PADDING_UNITS: Record<CardPadding, number> = { s: 40, m: 64, l: 96 };
export const CARD_GAP_UNITS: Record<CardGap, number> = { none: 0, s: 12, m: 24, l: 48 };

/** Limits of the two sliders, in percent. */
export const CARD_TEXT_SIZE = { min: 30, max: 100, step: 5 };
export const CARD_DIM = { min: 0, max: 80, step: 5 };

/** The ratio that lets the card be as tall as its content. */
export const CARD_AUTO_RATIO = 'auto';

/** Corners of the photo the user's text can sit in. */
export const CARD_PHOTO_PLACES = [
  { value: 'photo-top-left', label: 'Top left' },
  { value: 'photo-top-right', label: 'Top right' },
  { value: 'photo-bottom-left', label: 'Bottom left' },
  { value: 'photo-bottom-right', label: 'Bottom right' },
] as const satisfies readonly { value: CardOwnPlace; label: string }[];

/** Places under the card's content the user's text can sit in. */
export const CARD_BELOW_PLACES = [
  { value: 'below-left', label: 'Left' },
  { value: 'below', label: 'Center' },
  { value: 'below-right', label: 'Right' },
] as const satisfies readonly { value: CardOwnPlace; label: string }[];

/** Card colors offered beside the color picker. */
export const CARD_BACKGROUND_SWATCHES = [
  { value: BRAND.ivory, label: 'Ivory' },
  { value: '#ffffff', label: 'White' },
  { value: '#0b0b0c', label: 'Black' },
] as const;

/** Text colors offered beside the color picker. The empty value picks from the background. */
export const CARD_INK_SWATCHES = [
  { value: '', label: 'Auto' },
  { value: '#ffffff', label: 'White' },
  { value: '#111111', label: 'Black' },
] as const;

export const DEFAULT_CARD_STYLE: CardStyle = {
  design: 'sheet',
  ratio: CARD_AUTO_RATIO,
  background: BRAND.ivory,
  titleColor: '',
  textColor: '',
  ownPlace: 'below-right',
  align: 'left',
  padding: 'm',
  gap: 'm',
  textFirst: false,
  textPlace: 'bottom-left',
  textSize: 60,
  dim: 40,
  detail: 'optimized',
};

const HEX = /^#[0-9a-f]{6}$/i;
const hexOr = (value: unknown, fallback: string) =>
  typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : fallback;
const oneOf = <T extends string>(
  options: readonly { value: T }[],
  value: unknown,
  fallback: T,
): T => options.find(option => option.value === value)?.value ?? fallback;
const within = (value: unknown, { min, max }: { min: number; max: number }, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

/**
 * Rebuilds a card style from stored JSON, field by field. Anything missing or not recognized
 * falls back to the default, so a value saved by an older version never breaks the card screen.
 * The ratio is kept as any text: whoever knows the output sizes treats an unknown one as `auto`.
 * @param stored the parsed value read from storage
 * @returns a complete, valid card style
 */
export const parseCardStyle = (stored: unknown): CardStyle => {
  const raw = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const base = DEFAULT_CARD_STYLE;
  const places: readonly string[] = [
    'off',
    ...CARD_PHOTO_PLACES.map(place => place.value),
    ...CARD_BELOW_PLACES.map(place => place.value),
  ];
  return {
    design: oneOf(CARD_DESIGNS, raw.design, base.design),
    ratio: typeof raw.ratio === 'string' && raw.ratio ? raw.ratio : base.ratio,
    background: hexOr(raw.background, base.background),
    titleColor: hexOr(raw.titleColor, ''),
    textColor: hexOr(raw.textColor, ''),
    ownPlace: places.includes(raw.ownPlace as string)
      ? (raw.ownPlace as CardOwnPlace)
      : base.ownPlace,
    align: oneOf(CARD_ALIGNS, raw.align, base.align),
    padding: oneOf(CARD_PADDINGS, raw.padding, base.padding),
    gap: oneOf(CARD_GAPS, raw.gap, base.gap),
    textFirst: typeof raw.textFirst === 'boolean' ? raw.textFirst : base.textFirst,
    textPlace: oneOf(CARD_TEXT_PLACES, raw.textPlace, base.textPlace),
    textSize: within(raw.textSize, CARD_TEXT_SIZE, base.textSize),
    dim: within(raw.dim, CARD_DIM, base.dim),
    detail: oneOf(CARD_DETAILS, raw.detail, base.detail),
  };
};

/**
 * Turns the card's place for the user's text into where it is drawn. On a `sheet` card a corner
 * is a corner of the photos and the places below lie under the content; with no photo, a corner
 * becomes the bottom right, so text the user set up is not dropped without a word. On a `cover`
 * card the photos are the whole card, so every place is at an edge of the card itself.
 * @param place the place picked
 * @param design the card's design
 * @param hasPhoto whether the card shows any photo
 * @returns the area and position to draw at — `photo` is inside the photos, `below` under the
 * card's content, `edge` at the edge of the card — or null when the text is switched off
 */
export const cardOwnSpot = (place: CardOwnPlace, design: CardDesign, hasPhoto: boolean) => {
  if (place === 'off') return null;
  type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  type Below = 'below-left' | 'below' | 'below-right';
  const corner = CARD_PHOTO_PLACES.some(item => item.value === place)
    ? (place.replace('photo-', '') as Corner)
    : null;
  if (design === 'cover')
    return {
      area: 'edge' as const,
      position:
        corner ?? (place.replace('below', 'bottom') as 'bottom-left' | 'bottom' | 'bottom-right'),
    };
  if (corner && hasPhoto) return { area: 'photo' as const, position: corner };
  return { area: 'below' as const, position: corner ? ('below-right' as Below) : (place as Below) };
};
