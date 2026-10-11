import { vars } from '@seed-design/css/vars';
import { style, styleVariants } from '@vanilla-extract/css';

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
  gap: vars.$dimension.x1_5,
  paddingBlock: vars.$dimension.x4,
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

// Dropdowns share the line evenly and wrap on narrow screens; the favorites star ends the line.
export const filters = style({
  display: 'grid',
  flex: 1,
  gridTemplateColumns: 'repeat(auto-fit, minmax(8.5rem, 1fr))',
  gap: vars.$dimension.x3,
  minWidth: 0,
});

export const filterBar = style({
  display: 'flex',
  alignItems: 'end',
  gap: vars.$dimension.x3,
});

// As tall as the dropdowns it sits beside (SEED's medium select is x10).
export const favoritesToggle = style({ flex: 'none', minHeight: vars.$dimension.x10 });

// A list row with a control beside the link (the favorite star).
export const rowWithAction = style({
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  alignItems: 'center',
  columnGap: vars.$dimension.x3,
  borderBottom: `1px solid ${vars.$color.stroke.neutralSubtle}`,
  // The panel's own edge closes the list; a rule under the last row would double it.
  selectors: { '&:last-child': { borderBottom: 0 } },
});

export const rowLink = style([row, { borderBottom: 0 }]);

// A state worth pointing out at the end of a row's facts.
export const rowNote = styleVariants({
  alert: { color: vars.$color.fg.brand },
  muted: { color: vars.$color.fg.neutralSubtle },
});

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
    // A filled star is green, like every other control that is switched on.
    '&[aria-pressed="true"]': { color: vars.$color.fg.positive },
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

export const photo = style({
  display: 'block',
  width: '100%',
  height: 'auto',
  borderRadius: vars.$radius.r1,
  border: `1px solid ${vars.$color.stroke.neutralSubtle}`,
});

export const hiddenInput = style({ display: 'none' });

// The detail screen's right-hand column stacks its panels.
export const stack = style({ display: 'grid', gap: vars.$dimension.x6, minWidth: 0 });

export const toolbar = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: vars.$dimension.x3,
});
