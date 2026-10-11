import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { beige } from '@/shared/config/accent.css';
import { COMPACT_MEDIA_QUERY } from '@/shared/config/responsive';

export const footer = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.$dimension.x4,
  padding: vars.$dimension.x4,
  paddingBottom: `max(${vars.$dimension.x4}, env(safe-area-inset-bottom))`,
  background: vars.$color.fg.neutral,
  color: beige,
  // On phones the page ends under the browser toolbar and the home indicator, and that area takes
  // the page's color, not the footer's: a black footer there always ends in a cream band. The menu
  // drawer shows this content instead.
  '@media': { [COMPACT_MEDIA_QUERY]: { display: 'none' } },
});
