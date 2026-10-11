import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import {
  COMPACT_APP_BAR_HEIGHT,
  COMPACT_MEDIA_QUERY,
  COMPACT_STANDALONE_MEDIA_QUERY,
} from '@/shared/config/responsive';

export const page = style({
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr)',
  height: '100dvh',
  '@media': {
    // On phones the document scrolls instead of an inner panel. A fixed-height shell stops at the
    // browser toolbar and leaves an empty band behind it; a scrolling page runs underneath and
    // lets the toolbar collapse on scroll. (Same reasoning as EditorPage.)
    [COMPACT_MEDIA_QUERY]: { display: 'block', height: 'auto', minHeight: '100dvh' },
    // In the installed app the bar is pinned out of the flow (see AppBar `pinnedBar`), so its
    // height is reserved as padding.
    [COMPACT_STANDALONE_MEDIA_QUERY]: { paddingTop: COMPACT_APP_BAR_HEIGHT },
  },
});

// The footer scrolls with the content but sits at the bottom when the content is short.
// A flex column, not a grid: a `minmax(0, 1fr)` row would let tall content shrink under the footer.
export const scroller = style({
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  '@media': {
    // On phones this is no longer the scroll container (see `page`) and there is no footer to push
    // down, so it is a plain block.
    [COMPACT_MEDIA_QUERY]: { display: 'block', overflowY: 'visible' },
  },
});

export const content = style({
  flex: '1 0 auto',
  minWidth: 0,
  boxSizing: 'border-box',
  display: 'grid',
  alignContent: 'start',
  gap: vars.$dimension.x6,
  width: '100%',
  maxWidth: '44rem',
  marginInline: 'auto',
  padding: vars.$dimension.x4,
  paddingTop: vars.$dimension.x6,
  paddingBottom: vars.$dimension.x10,
  '@media': {
    // The page ends under the browser toolbar and home indicator here; keep the last row clear.
    [COMPACT_MEDIA_QUERY]: {
      paddingBottom: `calc(${vars.$dimension.x10} + env(safe-area-inset-bottom))`,
    },
  },
});

export const wide = style({ maxWidth: '64rem' });
