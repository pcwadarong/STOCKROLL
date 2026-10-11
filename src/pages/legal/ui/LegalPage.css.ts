import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

export const article = style({ display: 'grid', gap: vars.$dimension.x4 });

export const section = style({ display: 'grid', gap: vars.$dimension.x2 });

export const link = style({ color: vars.$color.fg.neutralMuted });
