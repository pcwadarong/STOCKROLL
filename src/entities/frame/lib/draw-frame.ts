import { FONT_FACES, type FontId } from '@/shared/lib/canvas-fonts';

import {
  CAPTION_ROW_GAP,
  type CaptionBlock,
  type CaptionRow,
  MARK_IMAGE,
  rowHeight,
} from '../model/caption';
import type { FrameLayout, Rect } from '../model/layout';
import { STRIP_HOLE_LANE } from '../model/spec';
import { AMBER, inkFor, type TextAlign } from '../model/style';

/** How the caption is lettered. Colors come from the block's tone and the margin color. */
export type FrameLook = {
  background: string;
  font: FontId;
  /** Text size multiplier. */
  scale: number;
  /** Lettering color chosen by the user. Unset lets the caption's tone and the margin decide. */
  color?: string;
  align: TextAlign;
  /** A small image of the user's own, drawn beside their text. Never leaves the device. */
  logo?: CanvasImageSource & { width: number; height: number };
};

const STRONG_SIZE = 27;
const QUIET_SIZE = 22;
const ROW_MIN_GAP = 32;
const MIN_SHRINK = 0.62;
const STRIP_COLOR = '#0b0b0c';

type Pen = {
  ctx: CanvasRenderingContext2D;
  unit: number;
  look: FrameLook;
  ink: string;
  subInk: string;
};

const ellipsize = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 0 && ctx.measureText(`${text.slice(0, end).trimEnd()}…`).width > maxWidth) end--;
  return end > 0 ? `${text.slice(0, end).trimEnd()}…` : '';
};

const fontOf = (pen: Pen, strong: boolean, size: number) => {
  const face = FONT_FACES[pen.look.font];
  return `${strong ? face.strong : face.quiet} ${size}px ${face.family}`;
};

/** Sets the font, shrinking it until the text fits the width or the shrink limit is reached. */
const fit = (
  pen: Pen,
  strong: boolean,
  size: number,
  natural: (font: string) => number,
  room: number,
) => {
  pen.ctx.font = fontOf(pen, strong, size);
  const width = natural(pen.ctx.font);
  const shrink = width > room ? Math.max(MIN_SHRINK, room / width) : 1;
  pen.ctx.font = fontOf(pen, strong, size * shrink);
};

const drawRow = (pen: Pen, row: CaptionRow, box: Rect, baseline: number) => {
  const { ctx, unit, look } = pen;
  const strong = row.kind === 'cells' || row.kind === 'mark' || row.strong;
  const size = (strong ? STRONG_SIZE : QUIET_SIZE) * unit * look.scale;
  ctx.fillStyle = strong ? pen.ink : pen.subInk;

  if (row.kind === 'mark') {
    // The image is fitted into a square by its longer side, then image and text are placed as
    // one group, so they stay together whichever way the line is aligned. The image sits on the
    // outside: before the text, or after it when the group is pushed to the right.
    const logo = row.image ? look.logo : undefined;
    const side = logo ? MARK_IMAGE * unit * look.scale : 0;
    const gap = logo && row.text ? 18 * unit * look.scale : 0;
    const room = box.width - side - gap;
    ctx.fillStyle = pen.ink;
    fit(pen, true, size, () => ctx.measureText(row.text).width, room);
    const label = ellipsize(ctx, row.text, room);
    const width = side + gap + ctx.measureText(label).width;
    const x =
      look.align === 'left'
        ? box.x
        : look.align === 'right'
          ? box.x + box.width - width
          : box.x + (box.width - width) / 2;
    const top = baseline;
    const imageLast = look.align === 'right';
    if (logo) {
      const fitted = side / Math.max(logo.width, logo.height);
      const [w, h] = [logo.width * fitted, logo.height * fitted];
      const imageX = imageLast ? x + width - side : x;
      ctx.drawImage(logo, imageX + (side - w) / 2, top + (side - h) / 2, w, h);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      label,
      imageLast ? x : x + side + gap,
      top + (logo ? side : rowHeight(row) * unit * look.scale) / 2,
    );
    ctx.textBaseline = 'alphabetic';
    return;
  }

  if (row.kind === 'cells') {
    // Each value is centered in an equal share of the line, so four values read as four columns.
    const share = box.width / row.cells.length;
    fit(
      pen,
      true,
      size,
      () => Math.max(...row.cells.map(cell => ctx.measureText(cell).width)),
      share - ROW_MIN_GAP * unit,
    );
    ctx.textAlign = 'center';
    row.cells.forEach((cell, index) => ctx.fillText(cell, box.x + share * (index + 0.5), baseline));
    return;
  }

  if (row.kind === 'text') {
    fit(pen, row.strong, size, () => ctx.measureText(row.text).width, box.width);
    const x =
      look.align === 'left'
        ? box.x
        : look.align === 'right'
          ? box.x + box.width
          : box.x + box.width / 2;
    ctx.textAlign = look.align;
    ctx.fillText(ellipsize(ctx, row.text, box.width), x, baseline);
    return;
  }

  // When left and right collide, shrink the text first, then ellipsize the left side only.
  // The right side (exposure values) is numeric — truncating it would show wrong information.
  const room = box.width - (row.left && row.right ? ROW_MIN_GAP * unit : 0);
  // Each side has its own weight: a camera name can share a row with a quieter look.
  const set = (side: boolean, shrink = 1) => {
    ctx.font = fontOf(pen, side, (side ? STRONG_SIZE : QUIET_SIZE) * unit * look.scale * shrink);
    ctx.fillStyle = side ? pen.ink : pen.subInk;
  };
  const rightStrong = row.rightStrong ?? row.strong;
  set(row.strong);
  const leftNatural = ctx.measureText(row.left).width;
  set(rightStrong);
  const natural = leftNatural + ctx.measureText(row.right).width;
  const shrink = natural > room ? Math.max(MIN_SHRINK, room / natural) : 1;

  set(rightStrong, shrink);
  const rightWidth = ctx.measureText(row.right).width;
  ctx.textAlign = 'right';
  ctx.fillText(row.right, box.x + box.width, baseline);
  set(row.strong, shrink);
  ctx.textAlign = 'left';
  ctx.fillText(ellipsize(ctx, row.left, room - rightWidth), box.x, baseline);
};

/** Draws rows from the top of a box down, each on its own baseline. */
const drawRows = (pen: Pen, rows: readonly CaptionRow[], box: Rect) => {
  const scale = pen.unit * pen.look.scale;
  let top = box.y;
  for (const row of rows) {
    const height = rowHeight(row) * scale;
    // Text sits a little above the bottom of its row, like type on a ruled line.
    // A mark row is centered on its own height, so it is handed its top edge instead.
    drawRow(pen, row, box, row.kind === 'mark' ? top : top + height - 7 * scale);
    top += height + CAPTION_ROW_GAP * scale;
  }
};

const drawStrips = (pen: Pen, strips: { top: Rect; bottom: Rect }) => {
  const { ctx, unit, look } = pen;
  ctx.fillStyle = STRIP_COLOR;
  for (const band of [strips.top, strips.bottom])
    ctx.fillRect(band.x, band.y, band.width, band.height);

  // Sprocket holes show the paper behind the film. They run down the middle of the lane along
  // the outer edge of each band; the inner lane is left for the edge print.
  const lane = STRIP_HOLE_LANE * unit;
  const hole = { width: 30 * unit, height: 20 * unit, pitch: 58 * unit, radius: 4 * unit };
  const inLane = (lane - hole.height) / 2;
  ctx.fillStyle = look.background;
  for (const [band, y] of [
    [strips.top, strips.top.y + inLane],
    [strips.bottom, strips.bottom.y + strips.bottom.height - lane + inLane],
  ] as const) {
    const count = Math.floor((band.width - hole.pitch / 2) / hole.pitch);
    const start = band.x + (band.width - (count - 1) * hole.pitch - hole.width) / 2;
    for (let index = 0; index < count; index++) {
      ctx.beginPath();
      ctx.roundRect(start + index * hole.pitch, y, hole.width, hole.height, hole.radius);
      ctx.fill();
    }
  }
};

/**
 * Draws margin, photo and caption onto the canvas per the computed layout. The caller sizes the
 * canvas first and makes sure the font is loaded (`ensureFont`).
 * @param ctx target 2D context
 * @param image source photo
 * @param layout result of `computeLayout`
 * @param block caption rows and where they go. Empty strings are not drawn
 * @param look margin color, lettering and the optional logo
 */
export const drawFrame = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  layout: FrameLayout,
  block: CaptionBlock,
  look: FrameLook,
) => {
  const { canvas, photo, source, caption, strips, unit } = layout;

  ctx.fillStyle = look.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    photo.x,
    photo.y,
    photo.width,
    photo.height,
  );

  const paper = inkFor(look.background);
  const tone = look.color
    ? { ink: look.color, subInk: look.color }
    : block.tone === 'amber'
      ? { ink: AMBER, subInk: AMBER }
      : block.tone === 'light'
        ? { ink: '#ffffff', subInk: 'rgba(255, 255, 255, 0.86)' }
        : paper;
  const pen: Pen = { ctx, unit, look, ...tone };

  if (strips) drawStrips(pen, strips);
  ctx.textBaseline = 'alphabetic';

  // Read-outs and edge print are set like markings, with air between the letters. Condensed and
  // segment faces run their words together without it.
  const spaced = block.tone === 'amber';
  const size = QUIET_SIZE * unit * look.scale;
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${spaced ? size * 0.06 : 0}px`;
    ctx.wordSpacing = `${spaced ? size * 0.45 : 0}px`;
  }

  if (block.placement === 'strip' && strips) {
    // Edge print: the first row runs along the lower band, a second one along the upper band.
    // Each sits in the middle of its print lane, whatever the face's own proportions are.
    const inset = caption.x - strips.bottom.x;
    const lane = STRIP_HOLE_LANE * unit;
    const print = (strip: Rect, row: CaptionRow, upper: boolean) => {
      const middle = upper
        ? strip.y + lane + (strip.height - lane) / 2
        : strip.y + (strip.height - lane) / 2;
      ctx.textBaseline = 'middle';
      drawRow(
        pen,
        row,
        { x: strip.x + inset, y: strip.y, width: strip.width - inset * 2, height: strip.height },
        middle,
      );
      ctx.textBaseline = 'alphabetic';
    };
    if (block.rows[0]) print(strips.bottom, block.rows[0], false);
    if (block.rows[1]) print(strips.top, block.rows[1], true);
    return;
  }

  if (block.placement === 'over' && block.rows.length > 0) {
    // A soft halo keeps text readable over a busy picture without boxing it in: dark under light
    // lettering, light under dark.
    const lightText = inkFor(pen.ink.startsWith('#') ? pen.ink : '#ffffff').ink === '#111111';
    ctx.shadowColor = lightText ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 8 * unit;
    ctx.shadowOffsetY = 1 * unit;
  }
  drawRows(pen, block.rows, caption);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
};
