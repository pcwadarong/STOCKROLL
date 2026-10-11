import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

export const links = style({ display: 'flex', flexWrap: 'wrap', gap: vars.$dimension.x4 });

export const link = style({
  color: 'inherit',
  textUnderlineOffset: '0.2em',
  selectors: { '&:hover, &:focus-visible': { textDecorationThickness: '2px' } },
});
