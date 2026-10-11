import { vars } from '@seed-design/css/vars';
import { keyframes, style } from '@vanilla-extract/css';

import { beige } from '@/shared/config/accent.css';
import { COMPACT_MEDIA_QUERY } from '@/shared/config/responsive';
import { DISPLAY_FONT, LABEL_FONT } from '@/shared/config/typography';

const compact = (rule: Record<string, string | number>) => ({ [COMPACT_MEDIA_QUERY]: rule });

// A low, solid band like the name plate on a camera: red, cream lettering, a thin rule.
export const bar = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.$dimension.x6,
  minHeight: '3.5rem',
  paddingInline: vars.$dimension.x4,
  paddingTop: 'env(safe-area-inset-top)',
  background: vars.$color.bg.brandSolid,
  color: beige,
  borderBottom: `1px solid ${vars.$color.fg.neutral}`,
  '@media': compact({ justifyContent: 'space-between' }),
});

export const title = style({
  margin: 0,
  fontFamily: DISPLAY_FONT,
  fontSize: vars.$fontSize.t6,
  fontWeight: vars.$fontWeight.regular,
  letterSpacing: '0.14em',
  lineHeight: 1,
});

export const titleLink = style({ color: 'inherit', textDecoration: 'none' });

/** Inline navigation and account menu. Hidden on compact widths, where the drawer takes over. */
export const inline = style({
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  gap: vars.$dimension.x6,
  minWidth: 0,
  '@media': compact({ display: 'none' }),
});

export const nav = style({
  display: 'flex',
  gap: vars.$dimension.x5,
  marginRight: 'auto',
});

export const link = style({
  position: 'relative',
  paddingBlock: vars.$dimension.x1,
  color: 'inherit',
  fontFamily: LABEL_FONT,
  fontSize: vars.$fontSize.t3,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  // The underline is drawn from the left on hover and stays drawn on the current page.
  '::after': {
    content: '',
    position: 'absolute',
    insetInline: 0,
    bottom: 0,
    height: '2px',
    background: 'currentColor',
    transform: 'scaleX(0)',
    transformOrigin: 'left',
    transition: `transform ${vars.$duration.d4} ${vars.$timingFunction.easing}`,
  },
  selectors: {
    '&:hover::after, &:focus-visible::after, &[aria-current="page"]::after': {
      transform: 'scaleX(1)',
    },
  },
  '@media': { '(prefers-reduced-motion: reduce)': { '::after': { transition: 'none' } } },
});

/** Menu button, shown only on compact widths. */
export const menuButton = style({
  display: 'none',
  alignItems: 'center',
  gap: vars.$dimension.x2,
  minHeight: '2.75rem',
  paddingInline: vars.$dimension.x2,
  border: 0,
  background: 'none',
  color: 'inherit',
  fontFamily: LABEL_FONT,
  fontSize: vars.$fontSize.t3,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  selectors: { '&:focus-visible': { outline: `2px solid ${beige}`, outlineOffset: '2px' } },
  '@media': compact({ display: 'inline-flex' }),
});

// Three rules drawn with a gradient, so the icon needs no extra elements.
export const menuIcon = style({
  width: '1.25rem',
  height: '0.875rem',
  background:
    'linear-gradient(currentColor, currentColor) top / 100% 2px no-repeat, linear-gradient(currentColor, currentColor) center / 100% 2px no-repeat, linear-gradient(currentColor, currentColor) bottom / 100% 2px no-repeat',
});

const slideIn = keyframes({ from: { transform: 'translateX(100%)' }, to: { transform: 'none' } });
const fadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

/** Side drawer: a native modal dialog pinned to the right edge. */
export const drawer = style({
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: { '&[open], &::backdrop': { animation: 'none' } },
    },
  },
  position: 'fixed',
  inset: '0 0 0 auto',
  width: 'min(20rem, 86vw)',
  height: '100dvh',
  maxHeight: 'none',
  margin: 0,
  padding: vars.$dimension.x5,
  paddingTop: `max(${vars.$dimension.x5}, env(safe-area-inset-top))`,
  border: 0,
  borderLeft: `1px solid ${vars.$color.fg.neutral}`,
  background: vars.$color.bg.brandSolid,
  color: beige,
  selectors: {
    '&[open]': {
      display: 'flex',
      flexDirection: 'column',
      gap: vars.$dimension.x6,
      animation: `${slideIn} ${vars.$duration.d5} ${vars.$timingFunction.easing}`,
    },
    '&::backdrop': {
      background: vars.$color.bg.overlay,
      animation: `${fadeIn} ${vars.$duration.d5} ${vars.$timingFunction.easing}`,
    },
  },
});

export const drawerHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const drawerNav = style({ display: 'grid' });

export const drawerLink = style({
  paddingBlock: vars.$dimension.x4,
  borderBottom: `1px solid ${beige}`,
  color: 'inherit',
  fontFamily: DISPLAY_FONT,
  fontSize: vars.$fontSize.t8,
  letterSpacing: '0.04em',
  lineHeight: 1,
  textTransform: 'uppercase',
  textDecoration: 'none',
  selectors: {
    '&:first-child': { borderTop: `1px solid ${beige}` },
    '&[aria-current="page"]': { textDecoration: 'underline', textUnderlineOffset: '0.18em' },
  },
});

export const drawerFoot = style({ marginTop: 'auto' });
