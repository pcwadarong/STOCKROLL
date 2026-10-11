import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { LABEL_FONT } from '../config/typography';

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

/** Flat paper card with a thin rule, like a printed product label. No offset shadow. */
export const card = style({
  background: vars.$color.bg.layerDefault,
  border: `1px solid ${vars.$color.stroke.neutralWeak}`,
  borderRadius: vars.$radius.r2_5,
});
