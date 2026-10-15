import { vars } from '@seed-design/css/vars';
import { globalStyle, style } from '@vanilla-extract/css';

import {
  COMPACT_MEDIA_QUERY,
  COMPACT_TAB_BAR_HEIGHT,
  REDUCED_MOTION_QUERY,
} from '@/shared/config/responsive';
import { labelText } from '@/shared/ui/label.css';

// The page's own color with a rule on top, not a colored band: the browser toolbar and the home
// indicator float over this edge and take the page's color, so a band of another color would
// end in a stripe of cream under it.
export const bar = style({
  display: 'none',
  '@media': {
    [COMPACT_MEDIA_QUERY]: {
      position: 'fixed',
      insetInline: 0,
      bottom: 0,
      zIndex: 20,
      display: 'block',
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: vars.$color.bg.layerBasement,
      borderTop: `1px solid ${vars.$color.stroke.neutralWeak}`,
    },
  },
});

// SEED's guideline caps the row at 480px so the tabs do not spread apart on a wide phone or tablet.
export const tabs = style({
  position: 'relative',
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: 'minmax(0, 1fr)',
  maxWidth: '30rem',
  marginInline: 'auto',
});

export const tab = style([
  labelText,
  {
    display: 'grid',
    justifyItems: 'center',
    alignContent: 'center',
    gap: vars.$dimension.x1,
    minHeight: COMPACT_TAB_BAR_HEIGHT,
    color: vars.$color.fg.neutralMuted,
    fontSize: vars.$fontSize.t1,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    transition: `color ${vars.$duration.d4} ${vars.$timingFunction.easing}`,
    selectors: {
      // Current is told by color, as the guideline asks, and by the rule above it.
      '&[aria-current="page"]': { color: vars.$color.fg.brand },
      '&:focus-visible': {
        outline: `2px solid ${vars.$color.fg.neutral}`,
        outlineOffset: `calc(-1 * ${vars.$dimension.x1})`,
      },
    },
    '@media': { [REDUCED_MOTION_QUERY]: { transition: 'none' } },
  },
]);

// One rule for the whole row, moved from tab to tab rather than drawn on each, so it slides.
// Width and position are set inline from the tab count and the current tab.
export const indicator = style({
  position: 'absolute',
  top: '-1px',
  left: 0,
  height: '2px',
  background: vars.$color.fg.brand,
  pointerEvents: 'none',
  transition: `transform ${vars.$duration.d5} ${vars.$timingFunction.easing}, opacity ${vars.$duration.d4} ${vars.$timingFunction.easing}`,
  '@media': { [REDUCED_MOTION_QUERY]: { transition: 'none' } },
});

// The page keeps its last row clear of the bar.
globalStyle(`html:has(${bar}) body`, {
  '@media': { [COMPACT_MEDIA_QUERY]: { paddingBottom: COMPACT_TAB_BAR_HEIGHT } },
});

// The on-screen keyboard would lift a fixed bar to sit over the field being typed in.
globalStyle(
  `html:has(input:not([type="checkbox"], [type="radio"], [type="file"]):focus, textarea:focus) ${bar}`,
  { display: 'none' },
);
