import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { NARROW_MEDIA_QUERY } from '../config/responsive';

import { labelText } from './label.css';

// Catalog-style metadata: label on the left, value on the right, hairlines between rows.
export const root = style([
  labelText,
  {
    display: 'grid',
    gridTemplateColumns: 'max-content minmax(0, 1fr)',
    columnGap: vars.$dimension.x8,
    margin: 0,
    '@media': { [NARROW_MEDIA_QUERY]: { columnGap: vars.$dimension.x4 } },
  },
]);

const cell = style({
  margin: 0,
  paddingBlock: vars.$dimension.x1_5,
  borderBottom: `1px solid ${vars.$color.stroke.neutralSubtle}`,
});

export const label = style([cell, { color: vars.$color.fg.neutralSubtle }]);

// A value is one fact on one line, so a long one is ellipsized rather than wrapped.
export const value = style([
  cell,
  { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
]);
