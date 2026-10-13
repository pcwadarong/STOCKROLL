import { vars } from '@seed-design/css/vars';
import { style, styleVariants } from '@vanilla-extract/css';

import { beige } from '@/shared/config/accent.css';
import { COMPACT_MEDIA_QUERY, NARROW_MEDIA_QUERY } from '@/shared/config/responsive';
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

// Facts wrap on phones; the label face is set tight for single lines, so give wrapped lines air.
export const rowFacts = style({ lineHeight: 1.6 });

export const rowTitle = style({ fontSize: vars.$fontSize.t5, fontWeight: vars.$fontWeight.bold });

// Pushed to the far left, away from Save, so it is not hit by accident.
export const destructive = style({ marginRight: 'auto', color: vars.$color.fg.brand });

export const actions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: vars.$dimension.x3,
});

// Dropdowns and the favorites toggle share one grid: a single line where there is room, and
// as few lines as fit on a phone. 6.5rem is the narrowest a dropdown can be and still show its name.
export const filterBar = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(6.5rem, 1fr))',
  gap: vars.$dimension.x2,
});

// As tall as the dropdowns it sits beside (SEED's medium select is x10).
export const favoritesToggle = style({ gap: vars.$dimension.x1_5, minHeight: vars.$dimension.x10 });

// The glyph is drawn small in the label face; sized up so it reads as the star in the rows.
export const toggleStar = style({ fontSize: vars.$fontSize.t6, lineHeight: 1 });

// A list row with a control beside the link (the favorite star).
export const rowWithAction = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
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
  fontSize: vars.$fontSize.t8,
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

export const note = style({ margin: 0, color: vars.$color.fg.neutralMuted });

// Shown whole, never cropped. Capped in height so a portrait shot does not push the settings
// off the screen.
export const photo = style({
  display: 'block',
  maxWidth: '100%',
  maxHeight: '28rem',
  width: 'auto',
  height: 'auto',
  borderRadius: vars.$radius.r1,
  border: `1px solid ${vars.$color.stroke.neutralSubtle}`,
});

export const hiddenInput = style({ display: 'none' });

export const toolbar = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: vars.$dimension.x3,
});

// A version's settings as a printed sheet: two columns of name-over-value, one column on phones.
export const sheet = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  columnGap: vars.$dimension.x6,
  margin: 0,
  '@media': { [NARROW_MEDIA_QUERY]: { gridTemplateColumns: 'minmax(0, 1fr)' } },
});

export const sheetCell = style({
  display: 'grid',
  gap: vars.$dimension.x1,
  paddingBlock: vars.$dimension.x2_5,
  borderBottom: `1px solid ${vars.$color.stroke.neutralSubtle}`,
});

export const sheetLabel = style([labelText, { color: vars.$color.fg.neutralSubtle }]);

export const sheetValue = style({
  margin: 0,
  fontSize: vars.$fontSize.t5,
  fontWeight: vars.$fontWeight.medium,
  overflowWrap: 'anywhere',
});

// The star sits at the end of a panel's heading row, pulled up so it does not make the row taller.
export const headingStar = style([star, { marginBlock: `calc(${vars.$dimension.x2} * -1)` }]);

// What a paste could not use, set quietly in gray. What it did fill is marked under each field.
export const pasteResult = style({ display: 'grid', gap: vars.$dimension.x3 });

export const pasteGroup = style({ display: 'grid', gap: vars.$dimension.x1_5 });

export const pasteCount = style([labelText, { margin: 0, color: vars.$color.fg.neutralSubtle }]);

export const pasteUnread = style({
  display: 'grid',
  gap: vars.$dimension.x0_5,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  color: vars.$color.fg.neutralSubtle,
  fontSize: vars.$fontSize.t3,
  overflowWrap: 'anywhere',
});

// Detail screen: the title on the left, its menus at the top right; the menus drop below the
// title when there is no room beside it.
export const detailHeader = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: vars.$dimension.x4,
});
