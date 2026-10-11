import type { FrameLayout } from '../model/layout';
import type { Paper } from '../model/presets';

export type Caption = {
  leftPrimary: string;
  leftSecondary: string;
  rightPrimary: string;
  rightSecondary: string;
};

type Row = {
  left: string;
  right: string;
  box: { x: number; width: number };
  baseline: number;
  size: number;
  weight: number;
  color: string;
  minGap: number;
};

const FONT_STACK = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const PRIMARY_SIZE = 27;
const SECONDARY_SIZE = 22;
const ROW_MIN_GAP = 32;
const MIN_SHRINK = 0.62;

const ellipsize = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 0 && ctx.measureText(`${text.slice(0, end).trimEnd()}…`).width > maxWidth) end--;
  return end > 0 ? `${text.slice(0, end).trimEnd()}…` : '';
};

const drawRow = (ctx: CanvasRenderingContext2D, row: Row) => {
  const { box } = row;
  const font = (size: number) => `${row.weight} ${size}px ${FONT_STACK}`;

  // When left and right collide, shrink the text first, then ellipsize the left side only.
  // The right side (exposure values) is numeric — truncating it would show wrong information.
  ctx.font = font(row.size);
  const natural = ctx.measureText(row.left).width + ctx.measureText(row.right).width;
  const available = box.width - (row.left && row.right ? row.minGap : 0);
  const shrink = natural > available ? Math.max(MIN_SHRINK, available / natural) : 1;

  ctx.font = font(row.size * shrink);
  ctx.fillStyle = row.color;

  const rightWidth = ctx.measureText(row.right).width;
  const left = ellipsize(ctx, row.left, available - rightWidth);

  ctx.textAlign = 'left';
  ctx.fillText(left, box.x, row.baseline);
  ctx.textAlign = 'right';
  ctx.fillText(row.right, box.x + box.width, row.baseline);
};

/**
 * Draws margin, photo and caption onto the canvas per the computed layout. The caller sizes the canvas first.
 * @param ctx target 2D context
 * @param image source photo
 * @param layout result of `computeLayout`
 * @param caption the four caption strings. Empty strings are not drawn
 * @param paper margin and text colors
 */
export const drawFrame = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  layout: FrameLayout,
  caption: Caption,
  paper: Paper,
) => {
  const { canvas, photo, caption: box, unit } = layout;

  ctx.fillStyle = paper.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, photo.x, photo.y, photo.width, photo.height);

  ctx.textBaseline = 'alphabetic';
  drawRow(ctx, {
    left: caption.leftPrimary,
    right: caption.rightPrimary,
    box,
    baseline: box.y + PRIMARY_SIZE * unit,
    size: PRIMARY_SIZE * unit,
    weight: 600,
    color: paper.ink,
    minGap: ROW_MIN_GAP * unit,
  });
  drawRow(ctx, {
    left: caption.leftSecondary,
    right: caption.rightSecondary,
    box,
    baseline: box.y + box.height - 6 * unit,
    size: SECONDARY_SIZE * unit,
    weight: 400,
    color: paper.subInk,
    minGap: ROW_MIN_GAP * unit,
  });
};
