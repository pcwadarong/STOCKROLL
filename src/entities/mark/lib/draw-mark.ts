import { FONT_FACES } from '@/shared/lib/canvas-fonts';

import { inkOver, type Mark, planMark, type Rect, type Size } from '../model/mark';

// Size the lines are measured at to learn their width in ems.
const MEASURE_SIZE = 100;

/**
 * Lays the user's text and image over a finished picture. Call it last, after everything else is
 * drawn: the automatic text color is read from the pixels already under the mark. The caller
 * makes sure the mark's font is loaded (`ensureFont`).
 * @param ctx target 2D context
 * @param area whether the mark goes inside the photo or over the whole picture (`overlayArea`)
 * @param areas the photo's rectangle when the picture has one, the photo with whatever the
 * template attached to it, and the whole picture
 * @param unit length of 1px on a 1080-wide picture, so the mark scales with the output size
 * @param mark the user's settings
 * @param lines the lines to print (`markLines`). None and no image draw nothing
 * @param image the user's image, if one is attached. Never leaves the device
 */
export const drawMark = (
  ctx: CanvasRenderingContext2D,
  area: 'photo' | 'image',
  areas: { photo?: Rect | null; block?: Rect | null; whole: Rect },
  unit: number,
  mark: Mark,
  lines: readonly string[],
  image?: (CanvasImageSource & Size) | null,
) => {
  if (lines.length === 0 && !image) return;

  const face = FONT_FACES[mark.font];
  // The first line carries the weight; a second one is set quieter under it.
  const fontOf = (index: number, size: number) =>
    `${index === 0 ? face.strong : face.quiet} ${size}px ${face.family}`;

  ctx.save();
  // Whatever drew before may have left letter spacing or a shadow behind.
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = '0px';
    ctx.wordSpacing = '0px';
  }
  ctx.shadowColor = 'transparent';
  const plan = planMark({
    area,
    areas,
    unit,
    position: mark.position,
    size: mark.size,
    lineEms: lines.map((line, index) => {
      ctx.font = fontOf(index, MEASURE_SIZE);
      return ctx.measureText(line).width / MEASURE_SIZE;
    }),
    image,
  });
  if (!plan) return ctx.restore();

  if (plan.image && image) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, plan.image.x, plan.image.y, plan.image.width, plan.image.height);
  }
  if (plan.lines.length > 0) {
    ctx.fillStyle = mark.color || inkBehind(ctx, plan.box);
    ctx.textAlign = plan.align;
    ctx.textBaseline = 'middle';
    plan.lines.forEach((place, index) => {
      ctx.font = fontOf(index, plan.size);
      ctx.fillText(lines[index] ?? '', place.x, place.middle);
    });
  }
  ctx.restore();
};

const inkBehind = (ctx: CanvasRenderingContext2D, box: Rect) => {
  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y));
  const width = Math.min(ctx.canvas.width - x, Math.ceil(box.width));
  const height = Math.min(ctx.canvas.height - y, Math.ceil(box.height));
  if (width <= 0 || height <= 0) return inkOver([]);
  try {
    return inkOver(ctx.getImageData(x, y, width, height).data);
  } catch {
    // The pixels cannot be read (out of memory, or a canvas the browser will not read back).
    return inkOver([]);
  }
};
