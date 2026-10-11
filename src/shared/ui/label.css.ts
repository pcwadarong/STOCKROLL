import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { DISPLAY_FONT, LABEL_FONT } from '../config/typography';

// The three text voices of the UI. Everything else is the regular sans-serif body face.

/** Condensed display face for the wordmark and headings. Set the size where it is used. */
export const displayText = style({
  margin: 0,
  fontFamily: DISPLAY_FONT,
  fontWeight: vars.$fontWeight.regular,
  letterSpacing: '0.04em',
  lineHeight: 1,
  textTransform: 'uppercase',
});

/**
 * Small uppercase typewriter text for navigation, labels and metadata.
 * Body copy stays in the regular sans-serif — setting everything in this face reads as a toy.
 */
export const labelText = style({
  fontFamily: LABEL_FONT,
  fontSize: vars.$fontSize.t3,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

/** A label used as a small heading: the same face, bold, with no margin of its own. */
export const labelTitle = style([labelText, { margin: 0, fontWeight: vars.$fontWeight.bold }]);

/** Flat paper card with a thin rule, like a printed product label. No offset shadow. */
export const card = style({
  background: vars.$color.bg.layerDefault,
  border: `1px solid ${vars.$color.stroke.neutralWeak}`,
  borderRadius: vars.$radius.r2_5,
});
