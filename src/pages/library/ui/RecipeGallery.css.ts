import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { beige } from '@/shared/config/accent.css';
import { NARROW_MEDIA_QUERY } from '@/shared/config/responsive';
import { labelText } from '@/shared/ui/label.css';

// Recipes by picture. 8rem keeps two tiles side by side on the narrowest phone.
export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(8rem, 1fr))',
  gap: vars.$dimension.x4,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

// Recipes by name: one per line, for picking without pictures.
export const names = style({ display: 'grid', margin: 0, padding: 0, listStyle: 'none' });

export const tile = style({
  display: 'grid',
  gap: vars.$dimension.x1_5,
  width: '100%',
  minWidth: 0,
  padding: 0,
  border: 0,
  background: 'none',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  textDecoration: 'none',
  overflowWrap: 'anywhere',
  cursor: 'pointer',
  selectors: { '&:hover, &:focus-visible': { color: vars.$color.fg.positive } },
});

export const nameRow = style([
  tile,
  {
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: vars.$dimension.x3,
    paddingBlock: vars.$dimension.x3,
    borderBottom: `1px solid ${vars.$color.stroke.neutralSubtle}`,
  },
]);

export const frame = style({
  position: 'relative',
  display: 'grid',
  placeItems: 'center',
  aspectRatio: '1',
  overflow: 'hidden',
  border: `1px solid ${vars.$color.stroke.neutralWeak}`,
  borderRadius: vars.$radius.r1,
  background: vars.$color.bg.neutralWeak,
  color: vars.$color.fg.neutralSubtle,
  selectors: {
    // The slot or recipe being worked on is ruled in green, like every control that is on.
    [`${tile}[aria-pressed="true"] &`]: {
      outline: `2px solid ${vars.$color.fg.positive}`,
      outlineOffset: vars.$dimension.x0_5,
    },
  },
});

// An empty slot is a dashed outline rather than a filled box, so it reads as a place to fill.
export const emptyFrame = style([frame, { borderStyle: 'dashed', background: 'none' }]);

export const image = style({ display: 'block', width: '100%', height: '100%', objectFit: 'cover' });

export const placeholder = style([labelText, { padding: vars.$dimension.x2, textAlign: 'center' }]);

export const badge = style([
  labelText,
  {
    position: 'absolute',
    top: vars.$dimension.x1,
    left: vars.$dimension.x1,
    paddingInline: vars.$dimension.x1_5,
    paddingBlock: vars.$dimension.x0_5,
    borderRadius: vars.$radius.r1,
    background: vars.$color.bg.positiveSolid,
    color: beige,
    fontWeight: vars.$fontWeight.bold,
  },
]);

// The same badge beside a name, where there is no picture to sit on.
export const inlineBadge = style([badge, { position: 'static' }]);

export const title = style({ fontWeight: vars.$fontWeight.bold });

export const sub = style([labelText, { color: vars.$color.fg.neutralSubtle, lineHeight: 1.6 }]);

// A roll's custom settings on its own screen: all seven across where there is room, four across
// on a phone.
export const slotSheet = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: vars.$dimension.x3,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  '@media': { [NARROW_MEDIA_QUERY]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } },
});

// A slot with nothing to lead to keeps the tile's shape without acting like a link.
export const stillTile = style([
  tile,
  { cursor: 'default', selectors: { '&:hover, &:focus-visible': { color: 'inherit' } } },
]);

export const slotLabel = style([labelText, { fontWeight: vars.$fontWeight.bold }]);

export const slotName = style({ fontSize: vars.$fontSize.t2, lineHeight: 1.3 });
