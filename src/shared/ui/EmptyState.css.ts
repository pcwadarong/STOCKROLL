import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { displayText } from './label.css';

export const root = style({ display: 'grid', justifyItems: 'start', gap: vars.$dimension.x4 });

// Louder than the panel label above it, so the two never read as the same level.
export const title = style([displayText, { fontSize: vars.$fontSize.t7 }]);

export const body = style({ margin: 0, color: vars.$color.fg.neutralMuted });
