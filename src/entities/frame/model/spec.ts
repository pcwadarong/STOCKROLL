import { buildCaption, type CaptionBlock, captionHeight, type FrameInfo } from './caption';
import type { FrameSpec, Size } from './layout';
import { cropRect, type FrameStyle, PADDING_UNITS } from './style';

// A film strip band on a 1080-wide canvas: a lane for the sprocket holes along the outer edge and
// a lane for one line of edge print beside the picture. The print lane grows with the text, so
// large or tall lettering never crowds the holes.
export const STRIP_HOLE_LANE = 40;
const STRIP_PRINT_PAD = 22;
const STRIP_PRINT_ROW = 28;

/**
 * Height of one film strip band.
 * @param scale text size multiplier
 * @returns height on a 1080-wide canvas
 */
export const stripHeight = (scale: number) =>
  STRIP_HOLE_LANE + STRIP_PRINT_ROW * scale + STRIP_PRINT_PAD;

/**
 * Turns the chosen style and the caption it produced into what the layout needs: how much margin,
 * which part of the photo, and how much room the caption takes.
 * @param photo pixel size of the source photo
 * @param style the look picked in the editor
 * @param block the caption built for that look
 * @param scale text size multiplier the caption is drawn at (`textScale`)
 * @returns the layout spec
 */
export const frameSpec = (
  photo: Size,
  style: FrameStyle,
  block: CaptionBlock,
  scale: number,
): FrameSpec => ({
  margin: PADDING_UNITS[style.padding],
  position: style.position,
  source: cropRect(photo, style.crop),
  captionHeight: captionHeight(block.rows, scale),
  captionPlacement: block.placement,
  strip: block.placement === 'strip' ? stripHeight(scale) : 0,
});

/**
 * Builds the caption a style calls for. The user's image reaches the caption only through the
 * Text template.
 * @param style the look picked in the editor
 * @param info shooting info as strings
 * @param own the user's own lines to set in the template's place for them. Empty for none
 * @param hasImage whether the user attached an image to go with those lines
 * @returns the caption block to lay out and draw
 */
export const frameCaption = (
  style: FrameStyle,
  info: FrameInfo,
  own: readonly string[],
  hasImage: boolean,
) => buildCaption(style.template, info, own, hasImage && style.template === 'text');
