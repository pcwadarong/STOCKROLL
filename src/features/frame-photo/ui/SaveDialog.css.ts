import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

export const body = style({ display: 'grid', gap: vars.$dimension.x4, minWidth: 0 });

// Select all, Clear and the count on one line; the count is pushed to the far end.
export const toolbar = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: vars.$dimension.x4,
});

export const count = style({
  marginLeft: 'auto',
  fontSize: vars.$fontSize.t3,
  color: vars.$color.fg.neutralSubtle,
});

// The photos in a row that wraps, as many across as the dialog has room for.
export const list = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.$dimension.x2,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

// One photo: the picture is the whole checkbox, with its mark laid over the top left corner.
export const tile = style({
  position: 'relative',
  display: 'block',
  cursor: 'pointer',
  // The mark already answers a press; the picture around it should not shrink with it.
  vars: { '--seed-checkmark-feedback-scale': '1' },
  selectors: {
    '&:has(:focus-visible)': {
      outline: `2px solid ${vars.$color.stroke.focusRing}`,
      outlineOffset: '2px',
    },
  },
});

export const mark = style({
  position: 'absolute',
  top: vars.$dimension.x1,
  left: vars.$dimension.x1,
  display: 'grid',
  borderRadius: vars.$radius.r1,
  // Paper behind the box, so an unchecked one still reads over a dark photo.
  background: vars.$color.bg.layerDefault,
});

export const thumbnail = style({
  display: 'block',
  width: '5rem',
  height: '5rem',
  objectFit: 'cover',
  borderRadius: vars.$radius.r1,
  background: vars.$color.bg.neutralWeak,
});

export const progress = style({
  display: 'block',
  width: '100%',
  accentColor: vars.$color.bg.positiveSolid,
});

export const note = style({
  margin: 0,
  fontSize: vars.$fontSize.t3,
  lineHeight: vars.$lineHeight.t3,
  color: vars.$color.fg.neutralSubtle,
});

export const footer = style({ display: 'flex', justifyContent: 'flex-end', width: '100%' });
