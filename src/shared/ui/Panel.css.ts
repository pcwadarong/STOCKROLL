import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { NARROW_MEDIA_QUERY } from '../config/responsive';

import { card } from './label.css';

export const root = style([
  card,
  {
    display: 'grid',
    gap: vars.$dimension.x5,
    minWidth: 0,
    padding: vars.$dimension.x6,
    '@media': { [NARROW_MEDIA_QUERY]: { padding: vars.$dimension.x4 } },
  },
]);

export const header = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.$dimension.x4,
  paddingBottom: vars.$dimension.x4,
  borderBottom: `1px solid ${vars.$color.fg.neutral}`,
});
