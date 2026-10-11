import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { beige } from '@/shared/config/accent.css';

export const footer = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.$dimension.x4,
  padding: vars.$dimension.x4,
  paddingBottom: `max(${vars.$dimension.x4}, env(safe-area-inset-bottom))`,
  background: vars.$color.fg.neutral,
  color: beige,
});

export const links = style({ display: 'flex', flexWrap: 'wrap', gap: vars.$dimension.x4 });

export const link = style({
  color: 'inherit',
  textUnderlineOffset: '0.2em',
  selectors: { '&:hover, &:focus-visible': { textDecorationThickness: '2px' } },
});
