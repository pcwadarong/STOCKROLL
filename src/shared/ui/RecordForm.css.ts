import { vars } from '@seed-design/css/vars';
import { style, styleVariants } from '@vanilla-extract/css';

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

// A field and the remark under it stay together, closer than two fields are.
export const flagged = style({ display: 'grid', gap: vars.$dimension.x1_5 });

// Colored, so the remark is not read past among the hints: red for a value that needs a second
// look, green for one that was filled in.
const noteBase = { margin: 0, fontSize: vars.$fontSize.t3, fontWeight: vars.$fontWeight.medium };

export const note = styleVariants({
  alert: { ...noteBase, color: vars.$color.fg.brand },
  done: { ...noteBase, color: vars.$color.fg.positive },
});
