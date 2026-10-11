import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

// Extra room above a section heading separates it from the section before.
export const heading = style({
  marginTop: vars.$dimension.x4,
  paddingBottom: vars.$dimension.x2,
  borderBottom: `1px solid ${vars.$color.stroke.neutralSubtle}`,
  selectors: { '&:first-child': { marginTop: 0 } },
});

export const root = style({
  display: 'grid',
  gap: vars.$dimension.x4,
});
