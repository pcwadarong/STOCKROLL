import { type CaptionBlock, captionHeight, logoRoom } from './caption';
import type { FrameSpec, Size } from './layout';
import { cropRect, type FrameStyle, PADDING_UNITS, TEXT_SCALE } from './style';

// Height of each film strip band on a 1080-wide canvas: sprocket holes plus a line of edge print.
const STRIP_HEIGHT = 72;

/**
 * Turns the chosen style and the caption it produced into what the layout needs: how much margin,
 * which part of the photo, and how much room the caption takes.
 * @param photo pixel size of the source photo
 * @param style the look picked in the editor
 * @param block the caption built for that look
 * @param hasLogo whether a logo is attached
 * @returns the layout spec
 */
export const frameSpec = (
  photo: Size,
  style: FrameStyle,
  block: CaptionBlock,
  hasLogo: boolean,
): FrameSpec => {
  const scale = TEXT_SCALE[style.textSize];
  return {
    margin: PADDING_UNITS[style.padding],
    position: style.position,
    source: cropRect(photo, style.crop),
    captionHeight: captionHeight(block.rows, scale) + logoRoom(block, hasLogo, scale),
    captionPlacement: block.placement,
    strip: block.placement === 'strip' ? STRIP_HEIGHT : 0,
  };
};
