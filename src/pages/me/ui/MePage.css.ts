import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { labelText } from '@/shared/ui/label.css';

/** Brand line above the legal links, in the label voice like the site footer. */
export const legal = style([
  labelText,
  { display: 'grid', gap: vars.$dimension.x3, color: vars.$color.fg.neutralMuted },
]);
