import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { labelText } from './label.css';

export const compact = style({ display: 'grid', gap: vars.$dimension.x1_5, minWidth: 0 });

// A filter's name speaks in the small label voice, not as a form label.
export const compactLabel = style([
  labelText,
  { fontSize: vars.$fontSize.t2, color: vars.$color.fg.neutralSubtle },
]);
