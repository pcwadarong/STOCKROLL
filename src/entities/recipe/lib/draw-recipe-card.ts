import {
  CARD_TEXT,
  type CardAlign,
  cardExportScale,
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
 * settings (left out, a color is picked: over photos by `inkOver` from the pixels behind the text,
 * otherwise `fallback`), whether to draw at the photos' full detail, and — for a card whose
 * photos are its background — `cover`: where the text sits, how large it is and how much the
 * photos are darkened (0 to 1)
 * @returns the layout, in card units, and `scale`: how many canvas pixels one card unit is
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
    colors: { background: string; title?: string; text?: string; fallback: string };
    /** Picks a readable text color from RGBA pixels. Used for text set over photos. */
    inkOver?: (pixels: ArrayLike<number>) => string;
    full?: boolean;
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
  const scale = options.full ? cardExportScale(layout) : 1;
  canvas.width = Math.round(layout.width * scale);
  canvas.height = Math.round(layout.height * scale);
  // Everything below is drawn in card units; the transform turns them into canvas pixels.
  context.setTransform(scale, 0, 0, scale, 0, 0);
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

  // Over photos no one color always reads: it is picked from what ended up behind the text.
  let auto = colors.fallback;
  if (cover && layout.photos.length > 0 && options.inkOver && !(colors.title && colors.text)) {
    const last = layout.lines.at(-1) ?? layout.sub;
    const top = layout.title.y - layout.title.size;
    const bottom = last.y + (last.lines.length - 1) * last.lineHeight;
    try {
      // Pixels are read in canvas pixels, whatever the transform.
      const pixels = context.getImageData(
        Math.max(0, Math.floor(layout.rule.x * scale)),
        Math.max(0, Math.floor(top * scale)),
        Math.max(1, Math.ceil(layout.rule.width * scale)),
        Math.max(1, Math.ceil((bottom - top) * scale)),
      );
      auto = options.inkOver(pixels.data);
    } catch {
      // The pixels cannot be read (out of memory): keep the fallback.
    }
  }
  const titleColor = colors.title ?? auto;
  const textColor = colors.text ?? auto;

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

  write(layout.title, titleColor);
  write(layout.sub, textColor, SUB_ALPHA);
  context.fillStyle = textColor;
  context.globalAlpha = RULE_ALPHA;
  context.fillRect(layout.rule.x, layout.rule.y, layout.rule.width, layout.rule.height);
  context.globalAlpha = 1;
  for (const line of layout.lines) write(line, textColor);
  context.textAlign = 'start';
  context.setTransform(1, 0, 0, 1, 0, 0);
  return { ...layout, scale };
};
