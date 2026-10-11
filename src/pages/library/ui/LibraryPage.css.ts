import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { beige } from '@/shared/config/accent.css';
import { COMPACT_MEDIA_QUERY } from '@/shared/config/responsive';
import { labelText } from '@/shared/ui/label.css';

const INK = vars.$color.fg.neutral;

export const tabs = style({ display: 'flex', flexWrap: 'wrap', gap: vars.$dimension.x3 });

// Thin-ruled labels. Flat, so they read as print rather than raised buttons.
export const tab = style([
  labelText,
  {
    display: 'inline-flex',
    gap: vars.$dimension.x2,
    paddingInline: vars.$dimension.x4,
    paddingBlock: vars.$dimension.x2,
    border: `1px solid ${vars.$color.stroke.neutralWeak}`,
    borderRadius: vars.$radius.r1,
    color: INK,
    textDecoration: 'none',
    selectors: {
      '&:hover, &:focus-visible': { borderColor: INK },
      '&[aria-current="page"]': {
        background: vars.$color.bg.positiveSolid,
        borderColor: vars.$color.bg.positiveSolid,
        color: beige,
      },
    },
  },
]);

export const list = style({ display: 'grid', margin: 0, padding: 0, listStyle: 'none' });

export const row = style({
  display: 'grid',
  gap: vars.$dimension.x0_5,
  paddingBlock: vars.$dimension.x3,
  borderBottom: `1px solid ${vars.$color.stroke.neutralSubtle}`,
  color: 'inherit',
  textDecoration: 'none',
  overflowWrap: 'anywhere',
  selectors: { '&:hover, &:focus-visible': { color: vars.$color.fg.positive } },
});

export const rowTitle = style({ fontSize: vars.$fontSize.t5, fontWeight: vars.$fontWeight.bold });

// Pushed to the far left, away from Save, so it is not hit by accident.
export const destructive = style({ marginRight: 'auto', color: vars.$color.fg.brand });

export const actions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: vars.$dimension.x3,
});

// Filter chips share the tab look; they are buttons, so the pressed state marks the active one.
export const filter = style([
  tab,
  {
    background: 'none',
    cursor: 'pointer',
    selectors: {
      '&[aria-pressed="true"]': {
        background: vars.$color.bg.positiveSolid,
        borderColor: vars.$color.bg.positiveSolid,
        color: beige,
      },
    },
  },
]);

// A list row with a control beside the link (the favorite star).
export const rowWithAction = style({
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  alignItems: 'center',
  columnGap: vars.$dimension.x3,
  borderBottom: `1px solid ${vars.$color.stroke.neutralSubtle}`,
});

export const rowLink = style([row, { borderBottom: 0 }]);

export const star = style({
  display: 'inline-grid',
  placeItems: 'center',
  width: '2.25rem',
  height: '2.25rem',
  border: 0,
  borderRadius: vars.$radius.r1,
  background: 'none',
  color: vars.$color.fg.neutralSubtle,
  fontSize: vars.$fontSize.t6,
  lineHeight: 1,
  cursor: 'pointer',
  selectors: {
    '&[aria-pressed="true"]': { color: vars.$color.fg.brand },
    '&:hover, &:focus-visible': { color: vars.$color.fg.positive },
  },
});

// Detail screen: settings on the left, version history on the right; stacked on narrow screens.
export const columns = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 16rem',
  alignItems: 'start',
  gap: vars.$dimension.x6,
  '@media': { [COMPACT_MEDIA_QUERY]: { gridTemplateColumns: 'minmax(0, 1fr)' } },
});

export const sections = style({ display: 'grid', gap: vars.$dimension.x6 });

export const section = style({ display: 'grid', gap: vars.$dimension.x2 });

export const versionList = style({ display: 'grid', margin: 0, padding: 0, listStyle: 'none' });

export const versionItem = style([
  labelText,
  {
    display: 'flex',
    justifyContent: 'space-between',
    gap: vars.$dimension.x3,
    width: '100%',
    paddingBlock: vars.$dimension.x2_5,
    paddingInline: vars.$dimension.x2,
    border: 0,
    borderBottom: `1px solid ${vars.$color.stroke.neutralSubtle}`,
    background: 'none',
    color: INK,
    textDecoration: 'none',
    selectors: {
      '&:hover, &:focus-visible': { color: vars.$color.fg.positive },
      '&[aria-current="true"]': { background: vars.$color.bg.positiveSolid, color: beige },
    },
  },
]);

export const note = style({ margin: 0, color: vars.$color.fg.neutralMuted });

export const toolbar = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: vars.$dimension.x3,
});
