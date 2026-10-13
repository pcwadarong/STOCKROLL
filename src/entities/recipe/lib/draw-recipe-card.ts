import {
  CARD_TEXT,
  type CardAlign,
  type CardText,
  type CardTextPlace,
  type CardTextStyle,
  recipeCardLayout,
  recipeCoverLayout,
} from '../model/recipe-card';
import type { RecipeLine } from '../model/recipe-lines';

// System faces only: a canvas does not wait for web fonts, and these need no loading.
const SANS = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const FACE: Record<CardTextStyle, { weight: number; family: string }> = {
  title: { weight: 700, family: SANS },
  sub: { weight: 400, family: MONO },
  line: { weight: 500, family: SANS },
};
// Size the text is measured at; the layout scales the widths itself.
const MEASURE_SIZE = 100;
// The line under the name and the hairline are the text color, set quieter.
const SUB_ALPHA = 0.6;
const RULE_ALPHA = 0.18;

const fontOf = (style: CardTextStyle, size: number) =>
  `${FACE[style].weight} ${size}px ${FACE[style].family}`;

/**
 * Draws a recipe card onto a canvas: the photos, the name, then every setting as a line of a
 * list. Text is measured with the canvas's own fonts and wrapped, so long values are shown in
 * full. The canvas is resized to the card.
 * @param canvas canvas to draw on; its size is replaced
 * @param card the recipe name, the line under it and its settings as lines
 * @param options the photos in order, the card's size when it is fixed, its spacing and text
 * alignment, room to keep free under the content, the colors of the card, the name and the
 * settings, and — for a card whose photos are its background — `cover`: where the text sits, how
 * large it is and how much the photos are darkened (0 to 1)
 * @returns where everything was drawn, for whoever lays something over the card
 */
export const drawRecipeCard = (
  canvas: HTMLCanvasElement,
  card: { name: string; sub: string; lines: readonly RecipeLine[] },
  options: {
    photos: readonly ImageBitmap[];
    size?: { width: number; height: number };
    footer?: number;
    padding?: number;
    gap?: number;
    align?: CardAlign;
    textFirst?: boolean;
    cover?: { place: CardTextPlace; share: number; dim: number };
    colors: { background: string; title: string; text: string };
  },
) => {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  const { photos, colors, cover } = options;

  const input = {
    ...card,
    photos,
    canvas: options.size,
    footer: options.footer,
    padding: options.padding,
    gap: options.gap,
    align: options.align,
    textFirst: options.textFirst,
    measure: (text: string, style: CardTextStyle) => {
      context.font = fontOf(style, MEASURE_SIZE);
      return (context.measureText(text).width / MEASURE_SIZE) * CARD_TEXT[style].size;
    },
  };
  const layout = cover
    ? recipeCoverLayout({ ...input, place: cover.place, share: cover.share })
    : recipeCardLayout(input);

  // Resizing clears the canvas and resets its state, so it comes before any drawing.
  canvas.width = layout.width;
  canvas.height = layout.height;
  context.fillStyle = colors.background;
  context.fillRect(0, 0, layout.width, layout.height);
  context.imageSmoothingQuality = 'high';
  layout.photos.forEach(({ box, source }, index) => {
    const photo = photos[index];
    if (photo)
      context.drawImage(
        photo,
        source.x,
        source.y,
        source.width,
        source.height,
        box.x,
        box.y,
        box.width,
        box.height,
      );
  });
  if (cover && layout.photos.length > 0 && cover.dim > 0) {
    context.fillStyle = `rgba(0, 0, 0, ${cover.dim})`;
    context.fillRect(0, 0, layout.width, layout.height);
  }

  const write = (text: CardText, color: string, alpha = 1) => {
    context.font = fontOf(text.style, text.size);
    context.textAlign = text.align;
    context.fillStyle = color;
    context.globalAlpha = alpha;
    text.lines.forEach((line, index) =>
      context.fillText(line, text.x, text.y + index * text.lineHeight),
    );
    context.globalAlpha = 1;
  };

  write(layout.title, colors.title);
  write(layout.sub, colors.text, SUB_ALPHA);
  context.fillStyle = colors.text;
  context.globalAlpha = RULE_ALPHA;
  context.fillRect(layout.rule.x, layout.rule.y, layout.rule.width, layout.rule.height);
  context.globalAlpha = 1;
  for (const line of layout.lines) write(line, colors.text);
  context.textAlign = 'start';
  return layout;
};
