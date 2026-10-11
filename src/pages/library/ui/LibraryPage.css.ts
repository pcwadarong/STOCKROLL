import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { beige } from '@/shared/config/accent.css';
import { NARROW_MEDIA_QUERY } from '@/shared/config/responsive';
import { DISPLAY_FONT, LABEL_FONT } from '@/shared/config/typography';

const INK = vars.$color.fg.neutral;

export const heading = style({
  overflowWrap: 'anywhere',
  margin: 0,
  fontFamily: DISPLAY_FONT,
  fontSize: vars.$fontSize.t9,
  fontWeight: vars.$fontWeight.regular,
  letterSpacing: '0.04em',
  lineHeight: 1,
  textTransform: 'uppercase',
});

export const intro = style({ display: 'grid', gap: vars.$dimension.x2 });

export const tabs = style({ display: 'flex', flexWrap: 'wrap', gap: vars.$dimension.x3 });

// Thin-ruled labels. Flat, so they read as print rather than raised buttons.
export const tab = style({
  display: 'inline-flex',
  gap: vars.$dimension.x2,
  paddingInline: vars.$dimension.x4,
  paddingBlock: vars.$dimension.x2,
  border: `1px solid ${vars.$color.stroke.neutralWeak}`,
  borderRadius: vars.$radius.r1,
  color: INK,
  fontFamily: LABEL_FONT,
  fontSize: vars.$fontSize.t3,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  selectors: {
    '&:hover, &:focus-visible': { borderColor: INK },
    '&[aria-current="page"]': {
      background: vars.$color.bg.positiveSolid,
      borderColor: vars.$color.bg.positiveSolid,
      color: beige,
    },
  },
});

export const panel = style({
  display: 'grid',
  gap: vars.$dimension.x5,
  padding: vars.$dimension.x6,
  minWidth: 0,
  '@media': { [NARROW_MEDIA_QUERY]: { padding: vars.$dimension.x4 } },
});

export const header = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.$dimension.x4,
  paddingBottom: vars.$dimension.x4,
  borderBottom: `1px solid ${INK}`,
});

export const panelTitle = style({ margin: 0, fontWeight: vars.$fontWeight.bold });

// Catalog-style metadata: label on the left, value on the right, hairlines between rows.
export const meta = style({
  display: 'grid',
  gridTemplateColumns: 'max-content minmax(0, 1fr)',
  columnGap: vars.$dimension.x8,
  margin: 0,
  '@media': { [NARROW_MEDIA_QUERY]: { columnGap: vars.$dimension.x4 } },
});

const metaCell = style({
  margin: 0,
  paddingBlock: vars.$dimension.x1_5,
  borderBottom: `1px solid ${vars.$color.stroke.neutralSubtle}`,
});

export const metaLabel = style([metaCell, { color: vars.$color.fg.neutralSubtle }]);

export const metaValue = style([
  metaCell,
  { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
]);

export const empty = style({ display: 'grid', justifyItems: 'start', gap: vars.$dimension.x3 });

export const list = style({ display: 'grid', margin: 0, padding: 0, listStyle: 'none' });

export const row = style({
  overflowWrap: 'anywhere',
  display: 'grid',
  gap: vars.$dimension.x0_5,
  paddingBlock: vars.$dimension.x3,
  borderBottom: `1px solid ${vars.$color.stroke.neutralSubtle}`,
  color: 'inherit',
  textDecoration: 'none',
  selectors: { '&:hover, &:focus-visible': { color: vars.$color.fg.brand } },
});

export const actions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: vars.$dimension.x3,
});
