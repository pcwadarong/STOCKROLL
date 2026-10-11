import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { REDUCED_MOTION_QUERY } from '@/shared/config/responsive';

// The strip scrolls sideways inside itself, so a long queue never widens the page.
export const strip = style({
  display: 'flex',
  gap: vars.$dimension.x2,
  maxWidth: '100%',
  margin: 0,
  // Room for the focus ring, which the scroll container would otherwise clip.
  padding: vars.$dimension.x1_5,
  overflowX: 'auto',
  listStyle: 'none',
});

export const item = style({ flex: 'none' });

// Square and 3.5rem: a comfortable touch target that still fits five across a 360px screen.
export const thumbButton = style({
  display: 'block',
  width: '3.5rem',
  height: '3.5rem',
  padding: 0,
  overflow: 'hidden',
  border: '2px solid transparent',
  borderRadius: vars.$radius.r1,
  background: vars.$color.bg.layerDefault,
  opacity: 0.6,
  cursor: 'pointer',
  transition: `opacity ${vars.$duration.d2}`,
  selectors: {
    '&:hover:not(:disabled), &:focus-visible': { opacity: 1 },
    '&:focus-visible': {
      outline: `2px solid ${vars.$color.stroke.focusRing}`,
      outlineOffset: '3px',
    },
    // The current photo is marked with a rule in the key color, not with a fill or a shadow.
    '&[aria-current="true"]': { borderColor: vars.$color.stroke.brandSolid, opacity: 1 },
    '&:disabled': { cursor: 'not-allowed' },
  },
  '@media': { [REDUCED_MOTION_QUERY]: { transition: 'none' } },
});

export const thumbnail = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});
