export { drawFrame, type FrameLook } from './lib/draw-frame';
export { ensureFont } from './lib/fonts';
export { type CaptionBlock, captionHeight, EMPTY_INFO, type FrameInfo } from './model/caption';
export {
  computeLayout,
  type FrameLayout,
  type FrameSpec,
  type Rect,
  type Size,
} from './model/layout';
export { DEFAULT_PRESET, OUTPUT_PRESETS, type OutputPreset } from './model/presets';
export { frameCaption, frameSpec } from './model/spec';
export {
  BACKGROUND_SWATCHES,
  cropRect,
  CROPS,
  DEFAULT_STYLE,
  effectiveStyle,
  FONTS,
  type FrameStyle,
  type FrameTemplate,
  PADDING_UNITS,
  PADDINGS,
  parseStyle,
  TEMPLATES,
  TEXT_SWATCHES,
  textScale,
} from './model/style';
