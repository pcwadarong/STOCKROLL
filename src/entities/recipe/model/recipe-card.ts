import { type PixelBudget, SAFE_CANVAS_PIXELS, safePixelBudget } from '@/shared/lib/canvas-budget';

import type { RecipeLine } from './recipe-lines';

// The card is drawn on a canvas, which cannot use CSS tokens: these are its own dimensions, for a
// card whose short edge is 1080.
const WIDTH = 1080;
const DEFAULT_PADDING = 64;
const DEFAULT_GAP = 24;
/** Tallest a single photo may get on a card that grows with its content. */
const MAX_PHOTO_HEIGHT = 1190;
/** Between the photos and the text when the text is not a cell of the photo grid. */
const TEXT_GAP = 56;
const RULE = 2;
// Gaps inside the text, at full size.
const SUB_GAP = 8;
const RULE_GAP = 28;
const ITEM_GAP = 4;

// On a card of a fixed size the text is set smaller, step by step, until the photos get a fair
// share of the card. It stops at `MIN_SCALE`: below that the settings are too small to read.
const SCALE_STEPS = [20, 19, 18, 17, 16, 15, 14, 13].map(step => step / 20);
const MIN_SCALE = SCALE_STEPS.at(-1)!;
/** The part of a fixed card the photos should cover before the text stops shrinking. */
const PHOTO_SHARE = 0.25;
// Beside the photos the text takes a column as wide as its longest line, within these shares of
// the card's inner width.
const SIDE_COLUMN = { min: 0.3, max: 0.45 };
/** Text size in a cell of the photo grid, on a card that grows with its content. */
const CELL_SCALE = 0.75;
// A card whose photo is its background takes the photo's shape, within these heights.
const COVER_HEIGHT = { min: 608, max: 1920, fallback: 1350 };
/** Largest the text over a photo may be set, however short the recipe is. */
const MAX_COVER_SCALE = 4;

/** The kinds of text on a card. The drawing code turns each into a canvas font. */
export type CardTextStyle = 'title' | 'sub' | 'line';
export type CardAlign = 'left' | 'center' | 'right';
/** Where the text sits on a card whose photos are its background. */
export type CardTextPlace = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';

/** Size and line height per kind of text at full size, in card pixels. */
export const CARD_TEXT: Record<CardTextStyle, { size: number; lineHeight: number }> = {
  title: { size: 76, lineHeight: 86 },
  sub: { size: 26, lineHeight: 34 },
  line: { size: 32, lineHeight: 44 },
};

/**
 * Tells how wide a piece of text is when drawn in a style at its full size. Supplied by whoever
 * owns the canvas.
 */
export type MeasureText = (text: string, style: CardTextStyle) => number;

type Size = { width: number; height: number };
type Box = { x: number; y: number; width: number; height: number };

/**
 * Text set in one or more lines. `x` is where each line is anchored — its left end, middle or
 * right end, by `align` — and `y` is the baseline of the first line.
 */
export type CardText = {
  style: CardTextStyle;
  /** Font size it is drawn at, after any scaling. */
  size: number;
  align: CardAlign;
  lines: string[];
  x: number;
  y: number;
  lineHeight: number;
};

/** One photo on the card: where it is drawn, and which part of the photo is drawn there. */
export type CardPhoto = { box: Box; source: Box };

/** Where everything on a recipe card goes. */
export type CardLayout = {
  width: number;
  height: number;
  /** The photos, in the order given. A single photo is shown whole; several fill their cells. */
  photos: CardPhoto[];
  /** The area the photos take together. Absent when the card has none. */
  photoArea?: Box;
  title: CardText;
  sub: CardText;
  /** Hairline between the heading and the settings. */
  rule: Box;
  /** One entry per setting, written `Label: value`. */
  lines: CardText[];
  /** The padded area the content sits in. Room asked for with `footer` lies under it. */
  block: Box;
};

/**
 * Breaks text into lines that fit a width, at spaces where it can and inside a word where one
 * word alone is too wide. Nothing is dropped: the lines joined give the text back.
 * @param text text to set
 * @param maxWidth widest a line may be
 * @param measure width of a piece of text
 * @returns the lines, at least one
 */
export const wrapText = (text: string, maxWidth: number, measure: (text: string) => number) => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const joined = line ? `${line} ${word}` : word;
    if (measure(joined) <= maxWidth) {
      line = joined;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    // A single word wider than the column is cut letter by letter.
    while (measure(line) > maxWidth && line.length > 1) {
      let cut = line.length - 1;
      while (cut > 1 && measure(line.slice(0, cut)) > maxWidth) cut--;
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  }
  lines.push(line);
  return lines;
};

type CardInput = {
  name: string;
  sub: string;
  lines: readonly RecipeLine[];
  /** Pixel sizes of the photos, in the order they are shown. */
  photos?: readonly Size[];
  /** Size of the card. Left out, the card is 1080 wide and as tall as its content. */
  canvas?: Size;
  /** Height kept free under the content, for something drawn there afterwards. */
  footer?: number;
  /** Margin around the content. */
  padding?: number;
  /** Space between the cells of a photo grid. */
  gap?: number;
  align?: CardAlign;
  /** Puts the text before the photos — above, to the left, or in the first cell. */
  textFirst?: boolean;
  measure: MeasureText;
};

type TextParts = Pick<CardLayout, 'title' | 'sub' | 'rule' | 'lines'>;

// Sets the name, the line under it and the settings in a column of the given width, at a scale.
// Returns how tall and how wide that came out, and a function that puts it at a place on the card.
const setText = ({ name, sub, lines, measure }: CardInput, scale: number, width: number) => {
  const pieces: { style: CardTextStyle; lines: string[]; top: number }[] = [];
  let y = 0;
  let used = 0;
  const add = (text: string, style: CardTextStyle, gapBefore: number) => {
    y += gapBefore * scale;
    const wide = (piece: string) => measure(piece, style) * scale;
    const wrapped = wrapText(text, width, wide);
    used = Math.max(used, ...wrapped.map(wide));
    pieces.push({ style, lines: wrapped, top: y });
    y += wrapped.length * CARD_TEXT[style].lineHeight * scale;
  };

  add(name, 'title', 0);
  // The line under the name is set in capitals, so it is measured that way.
  add(sub.toUpperCase(), 'sub', SUB_GAP);
  const ruleTop = y + RULE_GAP * scale;
  y = ruleTop + RULE + RULE_GAP * scale;
  lines.forEach((line, index) =>
    add(`${line.label}: ${line.value}`, 'line', index === 0 ? 0 : ITEM_GAP),
  );

  // `boxWidth` is the width the lines are aligned within: the column, or the text's own width.
  const at = (left: number, top: number, boxWidth: number, align: CardAlign): TextParts => {
    const x = align === 'left' ? left : align === 'right' ? left + boxWidth : left + boxWidth / 2;
    const [title, subText, ...rest] = pieces.map((piece): CardText => ({
      style: piece.style,
      size: CARD_TEXT[piece.style].size * scale,
      align,
      lines: piece.lines,
      x,
      y: top + piece.top + CARD_TEXT[piece.style].size * scale,
      lineHeight: CARD_TEXT[piece.style].lineHeight * scale,
    }));
    return {
      title: title!,
      sub: subText!,
      rule: { x: left, y: top + ruleTop, width: boxWidth, height: RULE },
      lines: rest,
    };
  };
  return { height: y, used: Math.min(used, width), at };
};

// The largest text, among the readable sizes first and smaller ones after, that fits a box.
const scaleThatFits = (input: CardInput, box: Size) => {
  const fits = (scale: number) => setText(input, scale, box.width).height <= box.height;
  const step = SCALE_STEPS.find(fits);
  if (step) return step;
  for (let scale = MIN_SCALE - 0.05; scale > 0.1; scale -= 0.05) if (fits(scale)) return scale;
  return 0.1;
};

const fitInto = (photo: Size, room: Size): Size => {
  const scale = Math.min(room.width / photo.width, room.height / photo.height);
  return { width: Math.round(photo.width * scale), height: Math.round(photo.height * scale) };
};

// The whole photo, as large as the room allows, in the middle of it.
const contain = (photo: Size, room: Box): CardPhoto => {
  const size = fitInto(photo, room);
  return {
    box: {
      x: Math.round(room.x + (room.width - size.width) / 2),
      y: Math.round(room.y + (room.height - size.height) / 2),
      ...size,
    },
    // Spelled out: a decoded image passed as the size keeps its dimensions on its prototype.
    source: { x: 0, y: 0, width: photo.width, height: photo.height },
  };
};

// The middle of the photo, cut to the shape of the cell it fills.
const cover = (photo: Size, cell: Box): CardPhoto => {
  const scale = Math.max(cell.width / photo.width, cell.height / photo.height);
  const width = cell.width / scale;
  const height = cell.height / scale;
  return {
    box: cell,
    source: { x: (photo.width - width) / 2, y: (photo.height - height) / 2, width, height },
  };
};

// Splits a box in two along its width or its height, leaving a gap between the halves.
const halves = (box: Box, across: boolean, gap: number): [Box, Box] => {
  if (across) {
    const width = Math.round((box.width - gap) / 2);
    return [
      { ...box, width },
      { ...box, x: box.x + box.width - width, width },
    ];
  }
  const height = Math.round((box.height - gap) / 2);
  return [
    { ...box, height },
    { ...box, y: box.y + box.height - height, height },
  ];
};

/**
 * Divides an area into cells for a number of photos: one cell, two along the longer side, one
 * large and two small, or two by two.
 * @param area the area to fill
 * @param count how many cells, 1 to 4
 * @param gap space between cells
 * @returns the cells, in reading order
 */
export const photoCells = (area: Box, count: number, gap: number): Box[] => {
  const wide = area.width >= area.height;
  if (count <= 1) return [area];
  const [first, second] = halves(area, wide, gap);
  if (count === 2) return [first, second];
  if (count === 3) return [first, ...halves(second, !wide, gap)];
  // Rows first, so the four come out in reading order whatever the shape of the area.
  const [top, bottom] = halves(area, false, gap);
  return [...halves(top, true, gap), ...halves(bottom, true, gap)];
};

// One photo is shown whole; several are cut to fill the room between them.
const placePhotos = (photos: readonly Size[], room: Box, gap: number) => {
  if (photos.length === 1) {
    const placed = contain(photos[0]!, room);
    return { photos: [placed], area: placed.box };
  }
  const cells = photoCells(room, photos.length, gap);
  return { photos: photos.map((photo, index) => cover(photo, cells[index]!)), area: room };
};

type Settings = { padding: number; gap: number; footer: number; align: CardAlign };

// A card as tall as its content: photos and text one over the other.
const growingCard = (input: CardInput, photos: readonly Size[], set: Settings): CardLayout => {
  const inner = WIDTH - set.padding * 2;
  const text = setText(input, 1, inner);
  const photoHeight =
    photos.length === 0
      ? 0
      : photos.length === 1
        ? fitInto(photos[0]!, { width: inner, height: MAX_PHOTO_HEIGHT }).height
        : // Two photos side by side as squares; four as a square of squares.
          photos.length === 2
          ? Math.round((inner - set.gap) / 2)
          : inner;
  const between = photos.length > 0 ? TEXT_GAP : 0;
  const textTop = set.padding + (input.textFirst ? 0 : photoHeight + between);
  const photoTop = set.padding + (input.textFirst ? text.height + between : 0);
  const placed =
    photos.length > 0
      ? placePhotos(
          photos,
          { x: set.padding, y: photoTop, width: inner, height: photoHeight },
          set.gap,
        )
      : undefined;
  const bottom = set.padding + photoHeight + between + text.height;
  return {
    width: WIDTH,
    height: Math.round(bottom + set.footer + set.padding),
    photos: placed?.photos ?? [],
    photoArea: placed?.area,
    ...text.at(set.padding, textTop, inner, set.align),
    block: { x: set.padding, y: set.padding, width: inner, height: bottom - set.padding },
  };
};

// Three photos and the text share a grid of four cells. Without a size the cells are squares,
// taller when the text needs it.
const gridCard = (input: CardInput, photos: readonly Size[], set: Settings): CardLayout => {
  const width = input.canvas?.width ?? WIDTH;
  const inner = width - set.padding * 2;
  const column = Math.round((inner - set.gap) / 2);
  // The gap is between photos. The text keeps the same distance from a photo here as anywhere
  // else on a card, so a tight grid does not press the settings against the pictures.
  const inset = Math.max(0, TEXT_GAP - set.gap);
  // Above and below, the text keeps the same air on both sides: fitted to the full height of
  // the cell its last line would sit on the bottom edge of the photo beside it.
  const air = Math.max(inset, TEXT_GAP / 2);
  const textWidth = column - inset;
  let scale = CELL_SCALE;
  let row: number;
  if (input.canvas) {
    row = Math.round((input.canvas.height - set.padding * 2 - set.footer - set.gap) / 2);
    scale = scaleThatFits(input, { width: textWidth, height: row - air * 2 });
  } else {
    row = Math.max(column, Math.ceil(setText(input, scale, textWidth).height + air * 2));
  }
  const block: Box = { x: set.padding, y: set.padding, width: inner, height: row * 2 + set.gap };
  const cells = photoCells(block, 4, set.gap);
  const cell = cells[input.textFirst ? 0 : 3]!;
  const photoCellsLeft = cells.filter(other => other !== cell);
  // The text's own room: the cell, drawn back from the side that faces a photo and from its
  // top and bottom.
  const room: Box = {
    x: cell.x + (input.textFirst ? 0 : inset),
    y: cell.y + air,
    width: textWidth,
    height: cell.height - air * 2,
  };
  const text = setText(input, scale, textWidth);
  return {
    width,
    height: input.canvas?.height ?? block.height + set.padding * 2 + set.footer,
    photos: photos.map((photo, index) => cover(photo, photoCellsLeft[index]!)),
    photoArea: block,
    ...text.at(room.x, room.y + Math.max(0, (room.height - text.height) / 2), textWidth, set.align),
    block,
  };
};

type Arranged = { layout: CardLayout; fits: boolean; photoArea: number };

// A card of a fixed size, with the text at one scale: the photos over the text, or beside it.
const arrange = (
  input: CardInput,
  canvas: Size,
  photos: readonly Size[],
  set: Settings,
  scale: number,
): Arranged[] => {
  const block: Box = {
    x: set.padding,
    y: set.padding,
    width: canvas.width - set.padding * 2,
    height: canvas.height - set.padding * 2 - set.footer,
  };
  const done = (
    parts: TextParts,
    placed: ReturnType<typeof placePhotos> | undefined,
    fits: boolean,
  ): Arranged => ({
    layout: { ...canvas, photos: placed?.photos ?? [], photoArea: placed?.area, ...parts, block },
    fits,
    photoArea: placed ? placed.area.width * placed.area.height : 0,
  });
  const between = photos.length > 0 ? TEXT_GAP : 0;

  const stackedText = setText(input, scale, block.width);
  const room = block.height - stackedText.height - between;
  // A single photo is fitted whole, so it may leave room over: the group is then centered.
  const photoHeight =
    photos.length === 0 || room <= 0
      ? 0
      : photos.length === 1
        ? fitInto(photos[0]!, { width: block.width, height: room }).height
        : room;
  const group = photoHeight + (photoHeight > 0 ? between : 0) + stackedText.height;
  const top = block.y + Math.max(0, (block.height - group) / 2);
  const after = photoHeight > 0 ? photoHeight + between : 0;
  const stacked = done(
    stackedText.at(block.x, top + (input.textFirst ? 0 : after), block.width, set.align),
    photoHeight > 0
      ? placePhotos(
          photos,
          {
            x: block.x,
            y: Math.round(top + (input.textFirst ? stackedText.height + between : 0)),
            width: block.width,
            height: photoHeight,
          },
          set.gap,
        )
      : undefined,
    stackedText.height <= block.height && (photos.length === 0 || room > 0),
  );
  if (photos.length === 0) return [stacked];

  const longest = Math.max(
    ...input.lines.map(line => input.measure(`${line.label}: ${line.value}`, 'line') * scale),
    input.measure(input.name, 'title') * scale,
  );
  const column = Math.round(
    Math.min(Math.max(longest, block.width * SIDE_COLUMN.min), block.width * SIDE_COLUMN.max),
  );
  const sideText = setText(input, scale, column);
  const sideWidth = block.width - column - TEXT_GAP;
  const side = done(
    sideText.at(
      input.textFirst ? block.x : block.x + sideWidth + TEXT_GAP,
      block.y + Math.max(0, (block.height - sideText.height) / 2),
      column,
      set.align,
    ),
    placePhotos(
      photos,
      {
        x: input.textFirst ? block.x + column + TEXT_GAP : block.x,
        y: block.y,
        width: sideWidth,
        height: block.height,
      },
      set.gap,
    ),
    // In a narrow column a setting that breaks over two lines reads badly, so a smaller size is
    // tried first; at the smallest readable one it may wrap.
    sideText.height <= block.height && sideWidth > 0 && (longest <= column || scale <= MIN_SCALE),
  );
  return [stacked, side];
};

const settingsOf = (input: CardInput): Settings => ({
  padding: input.padding ?? DEFAULT_PADDING,
  gap: input.gap ?? DEFAULT_GAP,
  footer: input.footer ?? 0,
  align: input.align ?? 'left',
});

const validPhotos = (input: CardInput) =>
  (input.photos ?? []).filter(photo => photo.width > 0 && photo.height > 0);

/**
 * Lays out the shareable card of a recipe with the text in a place of its own: the photos, the
 * name, then the settings as a list, one `Label: value` to a line. Text that is too wide wraps
 * instead of being cut short. A single photo is fitted whole, never cropped; several photos fill
 * the cells of a grid, each cut to its cell.
 *
 * Three photos and the text share a grid of four cells. Otherwise the photos go over the text
 * or beside it: on a card with no size that is one over the other and the card grows; on a card
 * of a fixed size it is whichever shows more of the photos, and the text is set smaller until
 * they cover a fair share of the card — down to a size that still reads, and past it only when
 * the text would otherwise not fit at all.
 * @param input the recipe name, the line under it, its settings as lines, the pixel sizes of
 * the photos, the size of the card when it is fixed, the margin, the gap between photo cells,
 * room to keep free under the content, how the text is aligned, whether it comes first, and a
 * function that measures text
 * @returns positions and sizes of everything on the card
 */
export const recipeCardLayout = (input: CardInput): CardLayout => {
  const photos = validPhotos(input);
  const set = settingsOf(input);
  const { canvas } = input;
  if (photos.length === 3) return gridCard(input, photos, set);
  if (!canvas) return growingCard(input, photos, set);

  // The arrangement that shows the most of the photos, among those whose text fits.
  const bestAt = (scale: number) =>
    arrange(input, canvas, photos, set, scale)
      .filter(item => item.fits)
      .sort((a, b) => b.photoArea - a.photoArea)[0];
  const share = PHOTO_SHARE * canvas.width * canvas.height;

  let largest: Arranged | undefined;
  for (const scale of SCALE_STEPS) {
    const best = bestAt(scale);
    if (!best) continue;
    if (photos.length === 0 || best.photoArea >= share) return best.layout;
    if (!largest || best.photoArea > largest.photoArea) largest = best;
  }
  if (largest) return largest.layout;

  // Too many settings for this size even at the smallest readable text: keep shrinking, so
  // nothing runs off the card.
  for (let scale = MIN_SCALE - 0.05; scale > 0.1; scale -= 0.05) {
    const best = bestAt(scale);
    if (best) return best.layout;
  }
  return arrange(input, canvas, photos, set, 0.1)[0]!.layout;
};

/**
 * Lays out a recipe card whose photos are its background: they fill the card edge to edge, cut
 * to fit, and the text sits over them as one group in a corner or the middle. The text is sized
 * as a share of the largest it could be and still fit inside the margin, so it can never run off
 * the card. Without a size, the card takes the shape of its one photo.
 * @param input what `recipeCardLayout` takes, and where the text group goes and how large it is
 * as a share (0 to 1) of the largest that fits
 * @returns positions and sizes of everything on the card
 */
export const recipeCoverLayout = (
  input: CardInput & { place: CardTextPlace; share: number },
): CardLayout => {
  const photos = validPhotos(input);
  const set = settingsOf(input);
  const single = photos.length === 1 ? photos[0] : undefined;
  const canvas = input.canvas ?? {
    width: WIDTH,
    height: single
      ? Math.min(
          COVER_HEIGHT.max,
          Math.max(COVER_HEIGHT.min, Math.round((WIDTH * single.height) / single.width)),
        )
      : COVER_HEIGHT.fallback,
  };
  const whole: Box = { x: 0, y: 0, ...canvas };
  const cells = photoCells(whole, photos.length, set.gap);
  const block: Box = {
    x: set.padding,
    y: set.padding,
    width: canvas.width - set.padding * 2,
    height: canvas.height - set.padding * 2 - set.footer,
  };

  const fits = (scale: number) => setText(input, scale, block.width).height <= block.height;
  let low = 0.1;
  let high = MAX_COVER_SCALE;
  for (let turn = 0; turn < 16; turn++) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle;
    else high = middle;
  }
  let scale = Math.max(0.1, low * Math.min(1, Math.max(0, input.share)));
  // Wrapping can make a slightly smaller size a line taller: step down until it fits again.
  while (scale > 0.1 && !fits(scale)) scale *= 0.97;

  const text = setText(input, scale, block.width);
  const x = input.place.endsWith('left')
    ? block.x
    : input.place.endsWith('right')
      ? block.x + block.width - text.used
      : block.x + (block.width - text.used) / 2;
  const y = input.place.startsWith('top')
    ? block.y
    : input.place.startsWith('bottom')
      ? block.y + block.height - text.height
      : block.y + (block.height - text.height) / 2;
  return {
    ...canvas,
    photos: photos.map((photo, index) => cover(photo, cells[index]!)),
    photoArea: photos.length > 0 ? whole : undefined,
    ...text.at(x, y, text.used, set.align),
    block,
  };
};

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Finds the photo that sits in a corner of the card's photos. In a grid one cell may hold the
 * text instead of a photo, so the corner of the whole area is not always a photo: this gives the
 * photo whose own corner is nearest to it.
 * @param layout the card's layout
 * @param corner which corner of the photos
 * @returns where that photo is drawn, or undefined when the card has no photo
 */
export const photoAtCorner = (
  { photos, photoArea }: Pick<CardLayout, 'photos' | 'photoArea'>,
  corner: Corner,
): Box | undefined => {
  if (!photoArea || photos.length === 0) return undefined;
  const pointOf = (box: Box) => ({
    x: box.x + (corner.endsWith('right') ? box.width : 0),
    y: box.y + (corner.startsWith('bottom') ? box.height : 0),
  });
  const target = pointOf(photoArea);
  const away = (box: Box) => Math.hypot(pointOf(box).x - target.x, pointOf(box).y - target.y);
  return photos
    .map(photo => photo.box)
    .reduce((best, box) => (away(box) < away(best) ? box : best));
};

/**
 * How much larger than its layout a card can be saved so its photos keep the detail they have:
 * the factor at which the most reduced photo is drawn pixel for pixel, never below 1 and never
 * past the largest canvas the device can draw.
 * @param layout the card's layout
 * @param budget most pixels a canvas of a given size may have on this device. Defaults to the
 *   size every target browser draws; saving passes the device's own (`devicePixelBudget`)
 * @returns the factor to scale the whole card by
 */
export const cardExportScale = (
  { width, height, photos }: Pick<CardLayout, 'width' | 'height' | 'photos'>,
  budget: PixelBudget = safePixelBudget,
) => {
  const wanted = Math.max(1, ...photos.map(({ source, box }) => source.width / box.width));
  const pixels = width * height * wanted * wanted;
  // Every target browser draws this much, so the device is not asked.
  if (pixels <= SAFE_CANVAS_PIXELS) return wanted;
  const max = budget(width * wanted, height * wanted);
  return Math.max(1, Math.min(wanted, Math.sqrt(max / (width * height))));
};

/** A photo on the card: the size it is held at for the preview, and the size it was opened at. */
export type CardPhotoSize = {
  shown: Size;
  full: Size;
  /** The recipe's example photo, which is only ever a reduced copy. */
  example: boolean;
};

/**
 * The sizes a card can be saved at, worked out from the layout its preview was drawn with.
 * @param layout the card's layout, made from the photos at their `shown` size
 * @param photos each photo's shown and full size, in the card's order
 * @param budget the device's canvas budget, or nothing to report the size the photos ask for
 * @returns `posting`, the working size; `original`, the size Original saves at; `wanted`, the
 *   size it would have without the device's limit; and `byExample`, whether the example photo is
 *   the one that sets the size
 */
export const cardFileSizes = (
  layout: Pick<CardLayout, 'width' | 'height' | 'photos'>,
  photos: readonly CardPhotoSize[],
  budget?: PixelBudget,
) => {
  // The layout cuts the photos at their shown size; at full size the same cut has more pixels.
  const detail = layout.photos.map((placed, index) => {
    const photo = photos[index];
    const by = photo ? photo.full.width / photo.shown.width : 1;
    return { ...placed, source: { ...placed.source, width: placed.source.width * by } };
  });
  const atFull = { ...layout, photos: detail };
  const wanted = cardExportScale(atFull, () => Infinity);
  const scale = budget ? cardExportScale(atFull, budget) : wanted;
  const at = (by: number) => ({
    width: Math.floor(layout.width * by),
    height: Math.floor(layout.height * by),
  });
  // The photo with the most detail to spare is the one the card grows for.
  const setter = detail.reduce(
    (best, placed, index) =>
      placed.source.width / placed.box.width >
      (detail[best]?.source.width ?? 0) / (detail[best]?.box.width ?? 1)
        ? index
        : best,
    0,
  );
  return {
    posting: at(1),
    original: at(scale),
    wanted: at(wanted),
    byExample: photos[setter]?.example === true,
  };
};
