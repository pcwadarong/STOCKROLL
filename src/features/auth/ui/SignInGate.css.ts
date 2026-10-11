import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

export const root = style({
  display: 'grid',
  justifyItems: 'start',
  gap: vars.$dimension.x4,
  padding: vars.$dimension.x6,
});

export const title = style({ margin: 0, fontWeight: vars.$fontWeight.bold });

export const body = style({ margin: 0, color: vars.$color.fg.neutralMuted });

export const actions = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: vars.$dimension.x4,
});
