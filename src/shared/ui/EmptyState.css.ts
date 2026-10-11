import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

export const root = style({ display: 'grid', justifyItems: 'start', gap: vars.$dimension.x3 });

export const body = style({ margin: 0, color: vars.$color.fg.neutralMuted });
