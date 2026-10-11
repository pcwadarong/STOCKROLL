import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

export const root = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: vars.$dimension.x3,
  minWidth: 0,
});

export const email = style({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
