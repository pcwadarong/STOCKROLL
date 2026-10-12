import { buildCaption, type CaptionBlock, captionHeight, type FrameInfo } from './caption';
import type { FrameSpec, Size } from './layout';
import { cropRect, effectiveStyle, type FrameStyle, PADDING_UNITS, textScale } from './style';

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
 * @returns the layout spec
 */
export const frameSpec = (photo: Size, style: FrameStyle, block: CaptionBlock): FrameSpec => {
  const scale = textScale(effectiveStyle(style));
  return {
    margin: PADDING_UNITS[style.padding],
    position: style.position,
    source: cropRect(photo, style.crop),
    captionHeight: captionHeight(block.rows, scale),
    captionPlacement: block.placement,
    strip: block.placement === 'strip' ? stripHeight(scale) : 0,
  };
};

/**
 * Builds the caption a style calls for. The user's own line and image reach the caption only
 * through the Text template.
 * @param style the look picked in the editor
 * @param info shooting info as strings
 * @param hasImage whether the user attached an image
 * @returns the caption block to lay out and draw
 */
export const frameCaption = (style: FrameStyle, info: FrameInfo, hasImage: boolean) => {
  const drawn = effectiveStyle(style);
  return buildCaption(drawn.template, info, drawn.text, hasImage && drawn.template === 'text');
};
