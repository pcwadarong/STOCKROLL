import {
  type CaptionBlock,
  computeLayout,
  drawFrame,
  frameCaption,
  type FrameInfo,
  type FrameLayout,
  frameSpec,
  type FrameStyle,
  hasOwnPlace,
  letteringFor,
  type OutputPreset,
  type Size,
  textScale,
} from '@/entities/frame';
import { drawMark, type Mark, markRoom, overlayArea } from '@/entities/mark';
import { ensureFont } from '@/shared/lib/canvas-fonts';
import { canvasToJpeg } from '@/shared/lib/save-file';

/** How large the exported file is. `full` keeps the photo's own resolution. */
export type ExportDetail = 'optimized' | 'full';

/** The user's own text as it is drawn: the settings and the attached image, if any. */
export type OwnText = { mark: Mark; image: ImageBitmap | null };

// Optimized trades a little quality for a file that uploads fast; full keeps as much as JPEG allows.
const JPEG_QUALITY = { optimized: 0.9, full: 0.97 } as const;

/**
 * Decodes a photo at full size, with the rotation its EXIF asks for already applied.
 * The caller owns the bitmap and must `close()` it: one 24MP photo is about 96MB decoded.
 * @param file image file
 * @returns the decoded bitmap. Rejects when the browser cannot decode the file
 */
export const decodePhoto = (file: Blob) =>
  createImageBitmap(file, { imageOrientation: 'from-image' });

const letteringOf = (style: FrameStyle, { mark }: OwnText) =>
  letteringFor(style.template, { font: mark.font, size: mark.size, color: mark.color });

/**
 * The size the caption is lettered at: the user's size on the Text template, the template's own
 * everywhere else.
 * @param style the look picked in the editor
 * @param own the user's text settings
 * @returns the text size multiplier to lay out and draw the caption with
 */
export const captionScale = (style: FrameStyle, own: OwnText) =>
  textScale(style.template, letteringOf(style, own).size);

/**
 * The layout spec for a photo, with room kept above or below it when the user's text is set just
 * outside the photo there. Without that room a thin margin would leave the text nowhere to go.
 * @param photo pixel size of the photo
 * @param style the look picked in the editor
 * @param block the photo's caption
 * @param own the user's text settings and image
 * @param lines the user's lines as printed on this photo
 * @returns the layout spec
 */
export const specOf = (
  photo: Size,
  style: FrameStyle,
  block: CaptionBlock,
  own: OwnText,
  lines: readonly string[],
) => {
  const { position, size } = own.mark;
  const outside = overlayArea(own.mark.area, hasOwnPlace(style.template)) === 'image';
  const room = outside ? markRoom(size, lines.length, own.image !== null) : 0;
  return frameSpec(photo, style, block, captionScale(style, own), {
    above: position.startsWith('above') ? room : 0,
    below: position.startsWith('below') ? room : 0,
  });
};

/**
 * Builds a photo's caption. The user's lines join it only when they are left to the template to
 * place and the template has a place for them; otherwise they are laid over the picture by
 * `drawOwnText`.
 * @param style the look picked in the editor
 * @param info the photo's shooting info as strings
 * @param own the user's text settings and image
 * @param lines the user's lines as printed on this photo
 * @returns the caption block to lay out and draw
 */
export const captionOf = (
  style: FrameStyle,
  info: FrameInfo,
  own: OwnText,
  lines: readonly string[],
) => {
  const placed = own.mark.area === 'template' && hasOwnPlace(style.template);
  return frameCaption(style, info, placed ? lines : [], placed && own.image !== null);
};

/**
 * The fonts a frame is lettered in, to load before drawing it: a canvas draws in the fallback
 * face when the font file has not arrived yet.
 * @param style the look picked in the editor
 * @param own the user's text settings
 * @returns the caption's font and the font of the user's text
 */
export const fontsOf = (style: FrameStyle, own: OwnText) => [
  letteringOf(style, own).font,
  own.mark.font,
];

/**
 * The lettering part of a style, in the form the drawing code takes.
 * @param style the look picked in the editor
 * @param own the user's text settings and image
 * @returns margin color, font, text scale and color, alignment and the user's image
 */
export const lookOf = (style: FrameStyle, own: OwnText) => {
  const lettering = letteringOf(style, own);
  return {
    background: style.background,
    font: lettering.font,
    scale: captionScale(style, own),
    color: lettering.color || undefined,
    // The position control belongs to the Text template; the other looks center their lines.
    align: style.template === 'text' ? style.align : ('center' as const),
    logo: own.image ?? undefined,
  };
};

/**
 * Lays the user's text over a frame that has just been drawn, when it is not left to the
 * template — or is, but the template has no place for it. The preview and the export both end with this, so it sits in the same place in both.
 * @param ctx the context the frame was drawn on
 * @param layout the layout the frame was drawn with
 * @param style the look picked in the editor
 * @param own the user's text settings and image
 * @param lines the user's lines as printed on this photo
 */
export const drawOwnText = (
  ctx: CanvasRenderingContext2D,
  layout: FrameLayout,
  style: FrameStyle,
  own: OwnText,
  lines: readonly string[],
) => {
  const area = overlayArea(own.mark.area, hasOwnPlace(style.template));
  if (!area) return;
  const { photo, strips, caption, canvas } = layout;
  // Text set above or below the photo clears its film strips and a caption printed under it:
  // both are part of the picture, and the layout kept the room for the text past them.
  const top = strips ? strips.top.y : photo.y;
  const edge = strips ? strips.bottom.y + strips.bottom.height : photo.y + photo.height;
  const bottom = caption.height > 0 && caption.y >= edge ? caption.y + caption.height : edge;
  drawMark(
    ctx,
    area,
    {
      photo,
      block: { x: photo.x, y: top, width: photo.width, height: bottom - top },
      whole: { x: 0, y: 0, ...canvas },
    },
    layout.unit,
    own.mark,
    lines,
    own.image,
  );
};

/**
 * Draws one framed photo on its own canvas, separate from the preview, and encodes it as JPEG.
 * The canvas is emptied before returning: Safari counts canvas memory against a page-wide limit
 * and frees it late, which a batch of full-size exports would run into.
 * @param bitmap decoded photo
 * @param settings output preset, file detail, caption rows, the frame style, and the user's own
 * text with its lines as printed on this photo
 * @returns the JPEG file contents
 */
export const renderJpeg = async (
  bitmap: ImageBitmap,
  settings: {
    preset: OutputPreset;
    detail: ExportDetail;
    block: CaptionBlock;
    style: FrameStyle;
    own: OwnText;
    lines: readonly string[];
  },
) => {
  const { preset, detail, block, style, own, lines } = settings;
  const spec = specOf(bitmap, style, block, own, lines);
  const layout = computeLayout(bitmap, preset, detail, spec);
  await Promise.all(fontsOf(style, own).map(ensureFont));
  const canvas = document.createElement('canvas');
  canvas.width = layout.canvas.width;
  canvas.height = layout.canvas.height;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    drawFrame(ctx, bitmap, layout, block, lookOf(style, own));
    drawOwnText(ctx, layout, style, own, lines);
    return await canvasToJpeg(canvas, JPEG_QUALITY[detail]);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
};
