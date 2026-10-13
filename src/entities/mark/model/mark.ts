import { type FontId, FONTS } from '@/shared/lib/canvas-fonts';

export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

/** What a line says: nothing, what the user typed, or the shooting date in one of four forms. */
export type MarkSource = 'none' | 'custom' | 'date-slash' | 'date-dot' | 'date-long' | 'date-short';
export type MarkLine = { source: MarkSource; text: string };
/** `template` leaves the place to the frame template; the others lay the text over the picture. */
export type MarkArea = 'template' | 'photo' | 'image';
export type MarkPosition =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right'
  | 'above-left'
  | 'above'
  | 'above-right'
  | 'below-left'
  | 'below'
  | 'below-right';
export type MarkSize = 's' | 'm' | 'l';

/**
 * The user's own text: up to two lines and an image, set on any exported picture — a framed
 * photo in whichever template, or a recipe card. One setting for all of them.
 */
export type Mark = {
  lines: [MarkLine, MarkLine];
  area: MarkArea;
  /** Where the text goes when it is laid over the picture. The `above` and `below` ones sit just outside the photo, in line with its edges. */
  position: MarkPosition;
  font: FontId;
  size: MarkSize;
  /** Text color as `#rrggbb`, or empty to pick dark or light from what is behind the text. */
  color: string;
};

// The sample date is only a label for the format. Nothing is ever drawn from it.
export const MARK_SOURCES = [
  { value: 'custom', label: 'Your own text' },
  { value: 'date-slash', label: 'Date taken · 2026/07/30' },
  { value: 'date-dot', label: 'Date taken · 2026.07.30' },
  { value: 'date-long', label: 'Date taken · Jul 30, 2026' },
  { value: 'date-short', label: "Date taken · '26 7 30" },
] as const satisfies readonly { value: MarkSource; label: string }[];

export const MARK_AREAS = [
  { value: 'template', label: 'Template' },
  { value: 'photo', label: 'Photo' },
  { value: 'image', label: 'Whole image' },
] as const satisfies readonly { value: MarkArea; label: string }[];

export const MARK_POSITIONS = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top', label: 'Top' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'above-left', label: 'Above the photo, left' },
  { value: 'above', label: 'Above the photo' },
  { value: 'above-right', label: 'Above the photo, right' },
  { value: 'below-left', label: 'Below the photo, left' },
  { value: 'below', label: 'Below the photo' },
  { value: 'below-right', label: 'Below the photo, right' },
] as const satisfies readonly { value: MarkPosition; label: string }[];

export const MARK_SIZES = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
] as const satisfies readonly { value: MarkSize; label: string }[];

/** Text colors offered beside the color picker. The empty value picks from the background. */
export const MARK_SWATCHES = [
  { value: '', label: 'Auto' },
  { value: '#ffffff', label: 'White' },
  { value: '#111111', label: 'Black' },
] as const;

export const DEFAULT_MARK: Mark = {
  lines: [
    { source: 'custom', text: '' },
    { source: 'none', text: '' },
  ],
  area: 'template',
  position: 'bottom-right',
  font: 'sans',
  size: 'm',
  color: '',
};

const HEX = /^#[0-9a-f]{6}$/i;

const isOneOf = <T extends string | number>(
  options: readonly { value: T }[],
  value: unknown,
): value is T => options.some(option => option.value === value);

const parseLine = (stored: unknown, base: MarkLine): MarkLine => {
  const raw = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  return {
    source: raw.source === 'none' || isOneOf(MARK_SOURCES, raw.source) ? raw.source : base.source,
    text: typeof raw.text === 'string' ? raw.text : base.text,
  };
};

/**
 * Rebuilds a mark from stored JSON, field by field. Anything missing or not recognized falls back
 * to the default, so a value saved by an older version (or edited by hand) never breaks a screen
 * that reads it.
 * @param stored the parsed value read from storage
 * @returns a complete, valid mark
 */
export const parseMark = (stored: unknown): Mark => {
  const raw = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const base = DEFAULT_MARK;
  const lines = Array.isArray(raw.lines) ? (raw.lines as unknown[]) : [];
  return {
    lines: [parseLine(lines[0], base.lines[0]), parseLine(lines[1], base.lines[1])],
    area: isOneOf(MARK_AREAS, raw.area) ? raw.area : base.area,
    position: isOneOf(MARK_POSITIONS, raw.position) ? raw.position : base.position,
    font: isOneOf(FONTS, raw.font) ? raw.font : base.font,
    size: isOneOf(MARK_SIZES, raw.size) ? raw.size : base.size,
    color: typeof raw.color === 'string' && HEX.test(raw.color) ? raw.color.toLowerCase() : '',
  };
};

/**
 * Carries over what the Text template used to keep inside the frame style, before the user's text
 * became a setting of its own. A style that was on "Photo only" had its text hidden, so that text
 * is not brought back.
 * @param style the parsed frame style as an older version stored it
 * @returns the mark those fields describe
 */
export const markFromLegacyStyle = (style: unknown): Mark => {
  const raw = (style && typeof style === 'object' ? style : {}) as Record<string, unknown>;
  const text = raw.template !== 'none' && typeof raw.text === 'string' ? raw.text : '';
  return parseMark({
    lines: [{ source: 'custom', text }],
    font: raw.font,
    size: raw.textSize,
    color: raw.textColor,
  });
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (value: number) => String(value).padStart(2, '0');

// EXIF holds the camera's wall-clock time with no time zone, read as local time: the local
// getters give back the date the camera showed.
const formatDate = (source: MarkSource, date: Date) => {
  const [year, month, day] = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  switch (source) {
    case 'date-slash':
      return `${year}/${two(month)}/${two(day)}`;
    case 'date-dot':
      return `${year}.${two(month)}.${two(day)}`;
    case 'date-long':
      return `${MONTHS[month - 1]} ${day}, ${year}`;
    case 'date-short':
      return `'${two(year % 100)} ${month} ${day}`;
    default:
      return '';
  }
};

/**
 * The lines a mark prints on one picture. A date line is printed only when the picture records
 * the date it was taken: nothing stands in for a missing date, and the line is left out.
 * @param mark the stored settings
 * @param takenAt the date the photo was taken, when the file records one
 * @returns the lines to print, top to bottom, with empty ones removed
 */
export const markLines = (mark: Pick<Mark, 'lines'>, takenAt?: Date) =>
  mark.lines
    .map(line =>
      line.source === 'custom'
        ? line.text.trim()
        : line.source === 'none' || !takenAt
          ? ''
          : formatDate(line.source, takenAt),
    )
    .filter(Boolean);

/**
 * Tells whether the user set up anything to print, so there is something to place and style.
 * A date line counts even on a picture with no date: it is a choice the user made.
 * @param mark the stored settings
 * @param hasImage whether an image is attached
 * @returns true when the mark has typed text, a date line or an image
 */
export const hasMark = (mark: Pick<Mark, 'lines'>, hasImage: boolean) =>
  hasImage ||
  mark.lines.some(line =>
    line.source === 'custom' ? line.text.trim() !== '' : line.source !== 'none',
  );

/**
 * Where the mark is laid over a picture, if it is. A picture whose template has no place for the
 * text (a recipe card) takes a `template` mark over the whole picture instead.
 * @param area the area the user picked
 * @param templated whether the picture is drawn by a template that places the text itself
 * @returns the area to lay the mark over, or null when the template places it
 */
export const overlayArea = (area: MarkArea, templated: boolean): 'photo' | 'image' | null =>
  area === 'template' ? (templated ? null : 'image') : area;

// Dimensions on a 1080-wide picture, like the frame's own.
const TEXT_SIZE = 26;
const IMAGE_HEIGHT = 60;
const GAP = 14;
/** How far the mark keeps from the edges of its area, whatever its size. */
const INSET = 32;
/**
 * The place inside the photo that stands for a place just outside it: above becomes the top
 * edge, below the bottom edge, on the same side.
 * @param position any position
 * @returns a position that exists inside the photo
 */
export const insidePosition = (position: MarkPosition) =>
  position.replace('above', 'top').replace('below', 'bottom') as MarkPosition;

/** How far a mark above or below the photo keeps from it. */
const OUTSIDE_GAP = 18;
// Height of one line, in ems.
const LINE = 1.25;
const SIZE_SCALE: Record<MarkSize, number> = { s: 0.7, m: 1, l: 1.5 };

type Across = 'left' | 'center' | 'right';

/** Where the pieces of a mark go, in canvas pixels. */
export type MarkPlan = {
  /** The whole mark: image and lines as one group. */
  box: Rect;
  image: Rect | null;
  /** Font size of the lines and how they are aligned to their anchor. */
  size: number;
  align: Across;
  /** One entry per line: the x the line is anchored at and its vertical middle. */
  lines: { x: number; middle: number }[];
};

/**
 * Lays the mark out over a picture: the image and the lines as one group, pushed to the chosen
 * place. The image sits on the outside — before the text, or after it when the group is on the
 * right. A mark too large for its room is shrunk whole, never clipped, and a place just outside
 * the photo that has no room falls back to the same side of the image.
 * @param input which area to use and its rectangles (`block` is the photo together with whatever
 * the template attached to it), the length of 1px on a 1080-wide picture, the position and size,
 * the width of each line in ems, and the image's pixel size
 * @returns the positions, or null when there is nothing to draw or no room to draw it in
 */
export const planMark = ({
  area,
  areas,
  unit,
  position,
  size,
  lineEms,
  image,
}: {
  area: 'photo' | 'image';
  areas: { photo?: Rect | null; block?: Rect | null; whole: Rect };
  unit: number;
  position: MarkPosition;
  size: MarkSize;
  lineEms: readonly number[];
  image?: Size | null;
}): MarkPlan | null => {
  const hasImage = !!image && image.width > 0 && image.height > 0;
  if (lineEms.length === 0 && !hasImage) return null;

  const photo = areas.photo ?? areas.whole;
  // Above and below are places outside the photo, so inside it they mean its top and bottom.
  const above = position.startsWith('above');
  const outside = area === 'image' && (above || position.startsWith('below'));
  const frame = area === 'photo' ? photo : areas.whole;
  const block = areas.block ?? photo;
  const inset = INSET * unit;
  const gapOut = OUTSIDE_GAP * unit;
  const room = outside
    ? {
        width: block.width,
        height:
          (above
            ? block.y - areas.whole.y
            : areas.whole.y + areas.whole.height - block.y - block.height) - gapOut,
      }
    : { width: frame.width - inset * 2, height: frame.height - inset * 2 };
  // With nothing between the photo and the edge of the picture — a canvas that hugs the photo,
  // or a card with no photo at all — the mark goes to the same side of the image instead of
  // vanishing from the export.
  if (outside && room.height <= 0)
    return planMark({
      area,
      areas,
      unit,
      position: insidePosition(position),
      size,
      lineEms,
      image,
    });
  if (room.width <= 0 || room.height <= 0) return null;

  const scale = unit * SIZE_SCALE[size];
  const textSize = lineEms.length > 0 ? TEXT_SIZE * scale : 0;
  const natural = {
    image: hasImage
      ? { width: (IMAGE_HEIGHT * scale * image.width) / image.height, height: IMAGE_HEIGHT * scale }
      : { width: 0, height: 0 },
    gap: lineEms.length > 0 && hasImage ? GAP * scale : 0,
    text: { width: Math.max(0, ...lineEms) * textSize, height: lineEms.length * textSize * LINE },
  };
  const width = natural.image.width + natural.gap + natural.text.width;
  const height = Math.max(natural.image.height, natural.text.height);
  const fit = Math.min(1, room.width / width, room.height / height);

  const across: Across = position.endsWith('left')
    ? 'left'
    : position.endsWith('right')
      ? 'right'
      : 'center';
  const top = position.startsWith('top') || above;
  const within = outside ? block : frame;
  const edge = outside ? 0 : inset;
  const box = {
    x:
      across === 'left'
        ? within.x + edge
        : across === 'right'
          ? within.x + within.width - edge - width * fit
          : within.x + (within.width - width * fit) / 2,
    y: outside
      ? above
        ? block.y - gapOut - height * fit
        : block.y + block.height + gapOut
      : top
        ? frame.y + inset
        : frame.y + frame.height - inset - height * fit,
    width: width * fit,
    height: height * fit,
  };

  const imageSize = { width: natural.image.width * fit, height: natural.image.height * fit };
  const text = { width: natural.text.width * fit, height: natural.text.height * fit };
  const imageLast = across === 'right';
  const textLeft = imageLast ? box.x : box.x + imageSize.width + natural.gap * fit;
  const lineHeight = textSize * LINE * fit;
  const textTop = box.y + (box.height - text.height) / 2;

  return {
    box,
    image: hasImage
      ? {
          x: imageLast ? box.x + box.width - imageSize.width : box.x,
          y: box.y + (box.height - imageSize.height) / 2,
          ...imageSize,
        }
      : null,
    size: textSize * fit,
    align: across,
    lines: lineEms.map((_, index) => ({
      x:
        across === 'left'
          ? textLeft
          : across === 'right'
            ? textLeft + text.width
            : textLeft + text.width / 2,
      middle: textTop + lineHeight * (index + 0.5),
    })),
  };
};

/**
 * Picks a text color that reads on what is behind the mark: dark on a light patch, light on a
 * dark one.
 * @param pixels RGBA bytes of the patch behind the mark
 * @returns `#rrggbb`. Light when there are no pixels to judge by
 */
export const inkOver = (pixels: ArrayLike<number>) => {
  const count = Math.floor(pixels.length / 4);
  if (count === 0) return '#ffffff';
  // A few thousand samples are plenty for an average, and keep a full-size export quick.
  const step = Math.max(1, Math.floor(count / 4096));
  let sum = 0;
  let seen = 0;
  for (let index = 0; index < count; index += step) {
    const at = index * 4;
    sum +=
      0.2126 * (pixels[at] ?? 0) + 0.7152 * (pixels[at + 1] ?? 0) + 0.0722 * (pixels[at + 2] ?? 0);
    seen++;
  }
  return sum / seen / 255 > 0.55 ? '#111111' : '#ffffff';
};
