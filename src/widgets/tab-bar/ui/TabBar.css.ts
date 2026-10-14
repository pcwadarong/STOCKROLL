import { vars } from '@seed-design/css/vars';
import { globalStyle, style } from '@vanilla-extract/css';

import { COMPACT_MEDIA_QUERY, COMPACT_TAB_BAR_HEIGHT } from '@/shared/config/responsive';
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
      display: 'grid',
      gridAutoFlow: 'column',
      gridAutoColumns: 'minmax(0, 1fr)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: vars.$color.bg.layerBasement,
      borderTop: `1px solid ${vars.$color.stroke.neutralWeak}`,
    },
  },
});

export const tab = style([
  labelText,
  {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    minHeight: COMPACT_TAB_BAR_HEIGHT,
    color: vars.$color.fg.neutralMuted,
    fontSize: vars.$fontSize.t2,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    // The current tab is marked by a rule along the bar's top edge, like the app bar's underline.
    '::before': {
      content: '',
      position: 'absolute',
      top: '-1px',
      insetInline: vars.$dimension.x3,
      height: '2px',
      background: 'currentColor',
      transform: 'scaleX(0)',
    },
    selectors: {
      '&[aria-current="page"]': { color: vars.$color.fg.neutral },
      '&[aria-current="page"]::before': { transform: 'scaleX(1)' },
      '&:focus-visible': {
        outline: `2px solid ${vars.$color.fg.neutral}`,
        outlineOffset: `calc(-1 * ${vars.$dimension.x1})`,
      },
    },
  },
]);

// The page keeps its last row clear of the bar.
globalStyle(`html:has(${bar}) body`, {
  '@media': { [COMPACT_MEDIA_QUERY]: { paddingBottom: COMPACT_TAB_BAR_HEIGHT } },
});

// The on-screen keyboard would lift a fixed bar to sit over the field being typed in.
globalStyle(
  `html:has(input:not([type="checkbox"], [type="radio"], [type="file"]):focus, textarea:focus) ${bar}`,
  { display: 'none' },
);
