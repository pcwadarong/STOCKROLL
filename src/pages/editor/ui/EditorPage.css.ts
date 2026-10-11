import { style } from '@vanilla-extract/css';

import { COMPACT_MEDIA_QUERY } from '@/shared/config/responsive';

export const page = style({
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr)',
  height: '100dvh',
  '@media': {
    // On phones the document scrolls instead of the panel. A fixed-height shell stops at the
    // browser toolbar and leaves an empty band behind it; a scrolling page runs underneath.
    [COMPACT_MEDIA_QUERY]: { display: 'block', height: 'auto', minHeight: '100dvh' },
  },
});
