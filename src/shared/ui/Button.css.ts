import { vars } from '@seed-design/css/vars';
import { style, styleVariants } from '@vanilla-extract/css';

import { LABEL_FONT } from '../config/typography';

import { beige } from '../config/accent.css';

const INK = vars.$color.fg.neutral;
const hover = '&:hover:not(:disabled), &:focus-visible';

// Every filled or outlined button turns green on hover and keyboard focus.
const green = {
  background: vars.$color.bg.positiveSolid,
  borderColor: vars.$color.bg.positiveSolid,
  color: beige,
};

// Flat and thin-ruled: a printed label, not a raised sticker.
const base = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${INK}`,
  borderRadius: vars.$radius.r1_5,
  fontFamily: LABEL_FONT,
  fontWeight: vars.$fontWeight.bold,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  textAlign: 'center',
  cursor: 'pointer',
  transition: `background ${vars.$duration.d2}, color ${vars.$duration.d2}`,
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${vars.$color.stroke.focusRing}`,
      outlineOffset: '3px',
    },
    '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
  },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});

export const variant = styleVariants({
  primary: [
    base,
    {
      background: vars.$color.bg.brandSolid,
      color: beige,
      selectors: { [hover]: green },
    },
  ],
  secondary: [
    base,
    {
      background: 'transparent',
      color: INK,
      borderColor: vars.$color.stroke.neutralWeak,
      selectors: { [hover]: green },
    },
  ],
  green: [
    base,
    {
      background: vars.$color.bg.positiveSolid,
      color: beige,
      borderColor: vars.$color.bg.positiveSolid,
      selectors: { [hover]: { background: vars.$color.bg.positiveSolidPressed } },
    },
  ],
  /** For red or green surfaces such as the header: cream outline and lettering. */
  inverse: [
    base,
    {
      background: 'transparent',
      color: beige,
      borderColor: beige,
      selectors: { [hover]: { background: beige, color: INK } },
    },
  ],
  /** Text-only action for low-emphasis links such as "Add camera" under a field. */
  plain: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 0,
    border: 0,
    background: 'none',
    color: INK,
    fontFamily: LABEL_FONT,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    textDecoration: 'underline',
    textUnderlineOffset: '0.2em',
    cursor: 'pointer',
    selectors: { '&:hover, &:focus-visible': { color: vars.$color.fg.positive } },
  },
});

export const size = styleVariants({
  medium: {
    minHeight: '2.75rem',
    paddingInline: vars.$dimension.x5,
    paddingBlock: vars.$dimension.x2,
    fontSize: vars.$fontSize.t3,
  },
  small: {
    minHeight: '2rem',
    paddingInline: vars.$dimension.x3,
    paddingBlock: vars.$dimension.x1,
    fontSize: vars.$fontSize.t2,
  },
});

export const plainSize = style({ fontSize: vars.$fontSize.t3 });
