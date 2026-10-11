import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

export const page = style({
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr)',
  height: '100dvh',
});

// The footer scrolls with the content but sits at the bottom when the content is short.
// A flex column, not a grid: a `minmax(0, 1fr)` row would let tall content shrink under the footer.
export const scroller = style({
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
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
});

export const wide = style({ maxWidth: '64rem' });
