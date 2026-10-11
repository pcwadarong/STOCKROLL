import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { displayText } from './label.css';

export const root = style({ display: 'grid', gap: vars.$dimension.x2 });

export const title = style([
  displayText,
  { fontSize: vars.$fontSize.t9, overflowWrap: 'anywhere' },
]);

export const lead = style({ margin: 0, color: vars.$color.fg.neutralMuted });
