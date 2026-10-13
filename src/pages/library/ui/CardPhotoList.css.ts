import { vars } from '@seed-design/css/vars';
import { globalStyle, style } from '@vanilla-extract/css';

export const root = style({ display: 'grid', gap: vars.$dimension.x3, minWidth: 0 });

export const list = style({
  display: 'grid',
  gap: vars.$dimension.x2,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

// A small picture, what it is, then its actions: the actions drop under when there is no room.
export const item = style({
  display: 'grid',
  gridTemplateColumns: '3.5rem minmax(0, 1fr)',
  alignItems: 'center',
  columnGap: vars.$dimension.x3,
});

export const thumbnail = style({
  gridRow: 'span 2',
  display: 'block',
  width: '3.5rem',
  height: '3.5rem',
  objectFit: 'cover',
  borderRadius: vars.$radius.r1,
  background: vars.$color.bg.neutralWeak,
});

export const caption = style({
  fontSize: vars.$fontSize.t3,
  color: vars.$color.fg.neutralSubtle,
});

// The two arrows, then Remove. Level with one another, and wide enough apart to tap.
export const actions = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: vars.$dimension.x4,
});

// An arrow that has nowhere to go is shown faint rather than taken away, so the others stay put.
globalStyle(`${actions} > :disabled`, { opacity: 0.3, cursor: 'default' });

export const note = style({
  margin: 0,
  fontSize: vars.$fontSize.t3,
  lineHeight: vars.$lineHeight.t3,
  color: vars.$color.fg.neutralSubtle,
});

export const hiddenInput = style({ display: 'none' });

// The arrows are small marks beside the word, not buttons of their own weight.
globalStyle(`${actions} svg`, { width: '1rem', height: '1rem' });
