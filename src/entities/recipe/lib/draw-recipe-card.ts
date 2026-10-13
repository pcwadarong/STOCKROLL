import { BRAND, SHADE } from '@/shared/config/palette';

import {
  CARD_TEXT,
  type CardText,
  type CardTextStyle,
  recipeCardLayout,
} from '../model/recipe-card';
import type { RecipeLine } from '../model/recipe-lines';

// System faces only: a canvas does not wait for web fonts, and these need no loading.
const SANS = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const LOOK: Record<CardTextStyle, { weight: number; family: string; color: string }> = {
  title: { weight: 700, family: SANS, color: BRAND.black },
  sub: { weight: 400, family: MONO, color: BRAND.gray },
  label: { weight: 400, family: MONO, color: BRAND.gray },
  value: { weight: 500, family: SANS, color: BRAND.black },
};

const fontOf = (style: CardTextStyle) =>
  `${LOOK[style].weight} ${CARD_TEXT[style].size}px ${LOOK[style].family}`;

/**
 * Draws a recipe card onto a canvas: the example photo, the name, then every setting in two
 * columns. Text is measured with the canvas's own fonts and wrapped, so long values are shown in
 * full. The canvas is resized to fit the card.
 * @param canvas canvas to draw on; its size is replaced
 * @param card the recipe name, the line under it and its settings as lines
 * @param photo the example photo, when the recipe has one
 * @returns where everything was drawn, for whoever lays something over the card
 */
export const drawRecipeCard = (
  canvas: HTMLCanvasElement,
  card: { name: string; sub: string; lines: readonly RecipeLine[] },
  photo?: ImageBitmap,
) => {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');

  const layout = recipeCardLayout({
    ...card,
    photo,
    measure: (text, style) => {
      context.font = fontOf(style);
      return context.measureText(text).width;
    },
  });

  // Resizing clears the canvas and resets its state, so it comes before any drawing.
  canvas.width = layout.width;
  canvas.height = layout.height;
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

  const write = ({ style, lines, x, y, lineHeight }: CardText) => {
    context.font = fontOf(style);
    context.fillStyle = LOOK[style].color;
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  };

  write(layout.title);
  write(layout.sub);
  context.fillStyle = SHADE.ruleSoft;
  context.fillRect(layout.rule.x, layout.rule.y, layout.rule.width, layout.rule.height);
  for (const { label, value } of layout.cells) {
    write(label);
    write(value);
  }
  return layout;
};
