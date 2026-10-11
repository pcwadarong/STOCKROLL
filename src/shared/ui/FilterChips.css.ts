import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

export const group = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: vars.$dimension.x2,
});

// Fixed width so the chips of stacked groups start on the same line.
export const label = style({
  minWidth: '6.5rem',
  fontSize: vars.$fontSize.t2,
  color: vars.$color.fg.neutralSubtle,
});
