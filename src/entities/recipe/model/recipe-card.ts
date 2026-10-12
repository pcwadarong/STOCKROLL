import type { RecipeLine } from './recipe-lines';

// The card is drawn on a canvas, which cannot use CSS tokens: these are its own dimensions, for a
// card 1080 wide.
const WIDTH = 1080;
const PAD = 64;
const INNER = WIDTH - PAD * 2;
/** Tallest the photo may get, so a portrait shot does not push the settings far down. */
const MAX_PHOTO_HEIGHT = 1190;
const TITLE_SIZE = 60;
const SUB_SIZE = 26;
const LABEL_SIZE = 24;
const VALUE_SIZE = 36;
const ROW_HEIGHT = 108;
const COLUMN_GAP = 48;

type Box = { x: number; y: number; width: number; height: number };
type Text = { text: string; x: number; y: number; size: number; maxWidth: number };

/** Where everything on a recipe card goes. Text positions are baselines. */
export type CardLayout = {
  width: number;
  height: number;
  /** Where the example photo is drawn, whole. Absent when the recipe has none. */
  photo?: Box;
  title: Text;
  sub: Text;
  /** Hairline between the heading and the settings. */
  rule: Box;
  cells: { label: Text; value: Text }[];
};

/**
 * Lays out the shareable card of a recipe: the example photo, the name, then the settings in two
 * columns. The photo is fitted whole — never cropped — and the card is as tall as its content.
 * @param input the recipe name, the line under it, its settings as lines, and the pixel size of
 * the photo when there is one
 * @returns positions and sizes for a card 1080 pixels wide
 */
export const recipeCardLayout = ({
  name,
  sub,
  lines,
  photo,
}: {
  name: string;
  sub: string;
  lines: readonly RecipeLine[];
  photo?: { width: number; height: number };
}): CardLayout => {
  let y = PAD;
  let photoBox: Box | undefined;
  if (photo && photo.width > 0 && photo.height > 0) {
    const scale = Math.min(INNER / photo.width, MAX_PHOTO_HEIGHT / photo.height);
    const width = Math.round(photo.width * scale);
    const height = Math.round(photo.height * scale);
    photoBox = { x: Math.round((WIDTH - width) / 2), y, width, height };
    y += height + PAD;
  }

  const title = { text: name, x: PAD, y: y + TITLE_SIZE, size: TITLE_SIZE, maxWidth: INNER };
  y = title.y + 20;
  const subText = { text: sub, x: PAD, y: y + SUB_SIZE, size: SUB_SIZE, maxWidth: INNER };
  y = subText.y + 36;
  const rule = { x: PAD, y, width: INNER, height: 2 };
  y += 2 + 28;

  const columnWidth = (INNER - COLUMN_GAP) / 2;
  const cells = lines.map((line, index) => {
    const x = PAD + (index % 2) * (columnWidth + COLUMN_GAP);
    const top = y + Math.floor(index / 2) * ROW_HEIGHT;
    return {
      label: { text: line.label, x, y: top + LABEL_SIZE, size: LABEL_SIZE, maxWidth: columnWidth },
      value: {
        text: line.value,
        x,
        y: top + LABEL_SIZE + 14 + VALUE_SIZE,
        size: VALUE_SIZE,
        maxWidth: columnWidth,
      },
    };
  });

  const rows = Math.ceil(lines.length / 2);
  return {
    width: WIDTH,
    height: y + rows * ROW_HEIGHT + PAD - (rows > 0 ? 24 : 28),
    photo: photoBox,
    title,
    sub: subText,
    rule,
    cells,
  };
};
