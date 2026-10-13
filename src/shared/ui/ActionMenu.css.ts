import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

// The mark that says the button opens a list rather than acting at once.
export const caret = style({ marginLeft: vars.$dimension.x1_5, lineHeight: 1 });
