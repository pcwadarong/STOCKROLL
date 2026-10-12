import type { RecipeLine } from './recipe-lines';

// The card is drawn on a canvas, which cannot use CSS tokens: these are its own dimensions, for a
// card 1080 wide.
const WIDTH = 1080;
const PAD = 64;
const INNER = WIDTH - PAD * 2;
/** Tallest the photo may get, so a portrait shot does not push the settings far down. */
const MAX_PHOTO_HEIGHT = 1190;
const COLUMN_GAP = 48;
const ROW_GAP = 28;
const LABEL_GAP = 10;

/** The four kinds of text on a card. The drawing code turns each into a canvas font. */
export type CardTextStyle = 'title' | 'sub' | 'label' | 'value';

/** Size and line height per kind of text, in card pixels. */
export const CARD_TEXT: Record<CardTextStyle, { size: number; lineHeight: number }> = {
  title: { size: 60, lineHeight: 70 },
  sub: { size: 26, lineHeight: 34 },
  label: { size: 24, lineHeight: 30 },
  value: { size: 36, lineHeight: 44 },
};

/** Tells how wide a piece of text is when drawn in a style. Supplied by whoever owns the canvas. */
export type MeasureText = (text: string, style: CardTextStyle) => number;

type Box = { x: number; y: number; width: number; height: number };

/** Text set in one or more lines. `y` is the baseline of the first line. */
export type CardText = {
  style: CardTextStyle;
  lines: string[];
  x: number;
  y: number;
  lineHeight: number;
};

/** Where everything on a recipe card goes. */
export type CardLayout = {
  width: number;
  height: number;
  /** Where the example photo is drawn, whole. Absent when the recipe has none. */
  photo?: Box;
  title: CardText;
  sub: CardText;
  /** Hairline between the heading and the settings. */
  rule: Box;
  cells: { label: CardText; value: CardText }[];
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

/**
 * Lays out the shareable card of a recipe: the example photo, the name, then the settings in two
 * columns. The photo is fitted whole — never cropped — and text that is too wide wraps instead
 * of being cut short, so the card shows every value in full and is as tall as that takes.
 * @param input the recipe name, the line under it, its settings as lines, the pixel size of the
 * photo when there is one, and a function that measures text
 * @returns positions and sizes for a card 1080 pixels wide
 */
export const recipeCardLayout = ({
  name,
  sub,
  lines,
  photo,
  measure,
}: {
  name: string;
  sub: string;
  lines: readonly RecipeLine[];
  photo?: { width: number; height: number };
  measure: MeasureText;
}): CardLayout => {
  const block = (text: string, style: CardTextStyle, x: number, top: number, width: number) => {
    const { size, lineHeight } = CARD_TEXT[style];
    const wrapped = wrapText(text, width, piece => measure(piece, style));
    const set: CardText = { style, lines: wrapped, x, y: top + size, lineHeight };
    return { set, bottom: top + wrapped.length * lineHeight };
  };

  let y = PAD;
  let photoBox: Box | undefined;
  if (photo && photo.width > 0 && photo.height > 0) {
    const scale = Math.min(INNER / photo.width, MAX_PHOTO_HEIGHT / photo.height);
    const width = Math.round(photo.width * scale);
    const height = Math.round(photo.height * scale);
    photoBox = { x: Math.round((WIDTH - width) / 2), y, width, height };
    y += height + PAD;
  }

  const title = block(name, 'title', PAD, y, INNER);
  // Labels and the line under the name are set in capitals, so they are measured that way.
  const subText = block(sub.toUpperCase(), 'sub', PAD, title.bottom + 8, INNER);
  const rule = { x: PAD, y: subText.bottom + 28, width: INNER, height: 2 };
  y = rule.y + rule.height + ROW_GAP;

  const columnWidth = (INNER - COLUMN_GAP) / 2;
  const cells: CardLayout['cells'] = [];
  for (let index = 0; index < lines.length; index += 2) {
    // A row is as tall as its taller cell, so a wrapped value pushes the next row down.
    const row = lines.slice(index, index + 2).map((line, column) => {
      const x = PAD + column * (columnWidth + COLUMN_GAP);
      const label = block(line.label.toUpperCase(), 'label', x, y, columnWidth);
      const value = block(line.value, 'value', x, label.bottom + LABEL_GAP, columnWidth);
      return { label: label.set, value: value.set, bottom: value.bottom };
    });
    cells.push(...row.map(({ label, value }) => ({ label, value })));
    y = Math.max(...row.map(cell => cell.bottom)) + ROW_GAP;
  }

  return {
    width: WIDTH,
    height: y - ROW_GAP + PAD,
    photo: photoBox,
    title: title.set,
    sub: subText.set,
    rule,
    cells,
  };
};
