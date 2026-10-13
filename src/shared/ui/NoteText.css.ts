import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

// The user's own words: line breaks are kept, and a long unbroken string wraps instead of
// widening the page.
export const root = style({
  display: 'grid',
  gap: vars.$dimension.x1,
  margin: 0,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
});

export const label = style({ color: vars.$color.fg.neutralSubtle });
