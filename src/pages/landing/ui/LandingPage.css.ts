import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { tertiary } from '@/shared/config/accent.css';
import { NARROW_MEDIA_QUERY, REDUCED_MOTION_QUERY } from '@/shared/config/responsive';
import { displayText, labelText } from '@/shared/ui/label.css';

const INK = vars.$color.fg.neutral;

// Small, big, small, big: each line gets room so the stack reads as a rhythm, not one block.
export const hero = style({
  display: 'grid',
  justifyItems: 'start',
  paddingTop: vars.$dimension.x4,
  paddingBottom: vars.$dimension.x10,
});

// Quiet overline: small, wide-set, brown.
export const overline = style([
  labelText,
  {
    margin: 0,
    marginBottom: vars.$dimension.x5,
    color: tertiary,
    fontSize: vars.$fontSize.t2,
    letterSpacing: '0.24em',
    lineHeight: 1.6,
    textTransform: 'uppercase',
  },
]);

export const wordmark = style([
  displayText,
  {
    maxWidth: '100%',
    marginBottom: vars.$dimension.x6,
    color: vars.$color.fg.brand,
    fontSize: 'clamp(3rem, 19vw, 8.5rem)',
    lineHeight: 0.9,
    letterSpacing: '0.01em',
  },
]);

// The tagline steps back down: label-sized, one phrase per line.
export const tagline = style([
  labelText,
  {
    display: 'grid',
    gap: vars.$dimension.x0_5,
    margin: 0,
    marginBottom: vars.$dimension.x8,
    fontSize: vars.$fontSize.t3,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
]);

// An index, like the contents column of a catalog: one ruled row per destination.
export const index = style({
  margin: 0,
  padding: 0,
  listStyle: 'none',
  borderTop: `1px solid ${INK}`,
});

export const row = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(7rem, 14rem) minmax(0, 1fr) auto',
  alignItems: 'baseline',
  columnGap: vars.$dimension.x6,
  rowGap: vars.$dimension.x2_5,
  paddingBlock: vars.$dimension.x5,
  borderBottom: `1px solid ${vars.$color.stroke.neutralWeak}`,
  color: 'inherit',
  textDecoration: 'none',
  transition: `color ${vars.$duration.d2}`,
  selectors: {
    '&:hover, &:focus-visible': { color: vars.$color.fg.positive },
    // The list is closed by the page itself, so the last row needs no rule under it.
    'li:last-child > &': { borderBottom: 0 },
  },
  '@media': {
    [NARROW_MEDIA_QUERY]: { gridTemplateColumns: 'minmax(0, 1fr) auto' },
    [REDUCED_MOTION_QUERY]: { transition: 'none' },
  },
});

export const rowTitle = style([displayText, { fontSize: vars.$fontSize.t7 }]);

export const rowBody = style({
  margin: 0,
  lineHeight: 1.55,
  color: vars.$color.fg.neutralMuted,
  '@media': { [NARROW_MEDIA_QUERY]: { gridColumn: '1 / -1', gridRow: 2 } },
});

// The arrow slides right on hover.
export const arrow = style([
  labelText,
  {
    transition: `transform ${vars.$duration.d3} ${vars.$timingFunction.easing}`,
    selectors: {
      [`${row}:hover &, ${row}:focus-visible &`]: { transform: 'translateX(0.375rem)' },
    },
    '@media': { [REDUCED_MOTION_QUERY]: { transition: 'none' } },
  },
]);
