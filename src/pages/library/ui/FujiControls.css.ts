import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { labelText } from '@/shared/ui/label.css';

// Lines of one setting sit closer together than two settings do.
export const rows = style({ display: 'grid', gap: vars.$dimension.x3, minWidth: 0 });

// A short name above its line of choices.
export const row = style({ display: 'grid', gap: vars.$dimension.x1, minWidth: 0 });

export const rowLabel = style([labelText, { color: vars.$color.fg.neutralMuted }]);

// The grid with its axis names around it: B+ above, R− left, R+ right, B− below.
export const gridFrame = style({
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 18rem) auto',
  gridTemplateAreas: '". top ." "left grid right" ". bottom ." "keys keys keys"',
  alignItems: 'center',
  justifyContent: 'start',
  columnGap: vars.$dimension.x2,
  rowGap: vars.$dimension.x1,
});

const axis = style([labelText, { color: vars.$color.fg.neutralMuted }]);
export const axisTop = style([axis, { gridArea: 'top', justifySelf: 'center' }]);
export const axisBottom = style([axis, { gridArea: 'bottom', justifySelf: 'center' }]);
export const axisLeft = style([axis, { gridArea: 'left' }]);
export const axisRight = style([axis, { gridArea: 'right' }]);

// The camera's own shift screen is colored toward each end — red right, blue up, yellow down,
// green left. A faint wash of the same keeps which way is warmer readable at a glance, without
// becoming a color block on the label-like page.
const tint = (color: string) => `color-mix(in srgb, ${color} 14%, transparent)`;
const ACROSS = `linear-gradient(to right, ${tint(vars.$color.palette.green500)}, transparent 50%, ${tint(vars.$color.palette.red500)})`;
const UP_DOWN = `linear-gradient(to bottom, ${tint(vars.$color.palette.blue500)}, transparent 50%, ${tint(vars.$color.palette.yellow500)})`;

// A square of dots, one per step, with the zero lines drawn through the middle. Only the grid
// takes touch gestures for itself, so dragging on it does not scroll the page and the page still
// scrolls everywhere else.
export const grid = style({
  gridArea: 'grid',
  position: 'relative',
  width: '100%',
  aspectRatio: '1',
  border: `1px solid ${vars.$color.stroke.neutralWeak}`,
  backgroundColor: vars.$color.bg.layerDefault,
  // Dots on top; their tile size is set where the grid is drawn, the tints fill it.
  backgroundImage: `radial-gradient(circle, ${vars.$color.stroke.neutralWeak} 1px, transparent 1px), ${ACROSS}, ${UP_DOWN}`,
  backgroundPosition: 'center',
  touchAction: 'none',
  cursor: 'crosshair',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  selectors: {
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      background: vars.$color.stroke.neutralSubtle,
      pointerEvents: 'none',
    },
    '&::before': { left: '50%', top: 0, bottom: 0, width: '1px' },
    '&::after': { top: '50%', left: 0, right: 0, height: '1px' },
  },
});

// The chosen point: a filled square centered on its step.
export const marker = style({
  position: 'absolute',
  zIndex: 1,
  width: vars.$dimension.x3,
  height: vars.$dimension.x3,
  transform: 'translate(-50%, -50%)',
  background: vars.$color.bg.brandSolid,
  border: `1px solid ${vars.$color.bg.layerDefault}`,
  pointerEvents: 'none',
});

export const keys = style({
  gridArea: 'keys',
  margin: 0,
  fontSize: vars.$fontSize.t3,
  color: vars.$color.fg.neutralSubtle,
});

// Where the point was before this edit: the same square, hollow, under the current one.
export const earlierMarker = style([
  marker,
  {
    zIndex: 0,
    background: 'transparent',
    border: `1px solid ${vars.$color.fg.neutralMuted}`,
  },
]);
