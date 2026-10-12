import { BRAND, SHADE } from '@/shared/config/palette';

import type { CardLayout } from '../model/recipe-card';

// System faces only: a canvas does not wait for web fonts, and these need no loading.
const SANS = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

type Text = CardLayout['title'];

/** Shortens text with an ellipsis until it fits its column. */
const fit = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (context.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && context.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
};

/**
 * Draws a recipe card onto a canvas, sizing the canvas to the layout.
 * @param canvas canvas to draw on; its size is replaced
 * @param layout positions from `recipeCardLayout`
 * @param photo the example photo, required when the layout has a photo box
 */
export const drawRecipeCard = (
  canvas: HTMLCanvasElement,
  layout: CardLayout,
  photo?: CanvasImageSource,
) => {
  canvas.width = layout.width;
  canvas.height = layout.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');

  context.fillStyle = BRAND.ivory;
  context.fillRect(0, 0, layout.width, layout.height);
  if (layout.photo && photo)
    context.drawImage(
      photo,
      layout.photo.x,
      layout.photo.y,
      layout.photo.width,
      layout.photo.height,
    );

  const write = (text: Text, font: string, color: string, content = text.text) => {
    context.font = `${font.replace('{size}', String(text.size))}`;
    context.fillStyle = color;
    context.fillText(fit(context, content, text.maxWidth), text.x, text.y);
  };

  write(layout.title, `700 {size}px ${SANS}`, BRAND.black);
  write(layout.sub, `400 {size}px ${MONO}`, BRAND.gray, layout.sub.text.toUpperCase());
  context.fillStyle = SHADE.ruleSoft;
  context.fillRect(layout.rule.x, layout.rule.y, layout.rule.width, layout.rule.height);
  for (const { label, value } of layout.cells) {
    write(label, `400 {size}px ${MONO}`, BRAND.gray, label.text.toUpperCase());
    write(value, `500 {size}px ${SANS}`, BRAND.black);
  }
};
