import { vars } from '@seed-design/css/vars';
import { globalStyle, keyframes, style } from '@vanilla-extract/css';

import { beige } from '@/shared/config/accent.css';
import {
  COMPACT_APP_BAR_HEIGHT,
  COMPACT_MEDIA_QUERY,
  COMPACT_STANDALONE_MEDIA_QUERY,
  REDUCED_MOTION_QUERY,
} from '@/shared/config/responsive';
import { displayText, labelText } from '@/shared/ui/label.css';

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
  // A set compact height, so a shell that pins the bar can reserve exactly this much; the title and
  // menu button both fit within it.
  '@media': compact({ justifyContent: 'space-between', height: COMPACT_APP_BAR_HEIGHT }),
});

// Opt-in pin for document-scrolling shells (PageShell on phones), in the installed app only. There
// the page runs under the status bar, so a bar that scrolled away would let text pass behind the
// clock. In a browser tab the bar scrolls with the page instead: Safari colours its own top area
// from an element pinned to the top edge, and a pinned red bar turned that area red.
// `fixed`, not `sticky`: a sticky bar re-pins a frame late on fast momentum scrolls.
// The editor leaves this off; its preview takes the top (see FrameEditor's `stage`).
export const pinnedBar = style({
  '@media': {
    [COMPACT_STANDALONE_MEDIA_QUERY]: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20 },
  },
});

export const title = style([displayText, { fontSize: vars.$fontSize.t6, letterSpacing: '0.14em' }]);

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

export const link = style([
  labelText,
  {
    position: 'relative',
    paddingBlock: vars.$dimension.x1,
    color: 'inherit',
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
    '@media': { [REDUCED_MOTION_QUERY]: { '::after': { transition: 'none' } } },
  },
]);

/** Menu button, shown only on compact widths. */
export const menuButton = style([
  labelText,
  {
    display: 'none',
    alignItems: 'center',
    gap: vars.$dimension.x2,
    minHeight: '2.75rem',
    paddingInline: vars.$dimension.x2,
    border: 0,
    background: 'none',
    color: 'inherit',
    fontSize: vars.$fontSize.t3,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    selectors: { '&:focus-visible': { outline: `2px solid ${beige}`, outlineOffset: '2px' } },
    '@media': compact({ display: 'inline-flex' }),
  },
]);

/** Back button: the menu button's look, at the start of the bar. Compact widths only. */
export const backButton = style({ marginLeft: `calc(-1 * ${vars.$dimension.x2})` });

/** On compact widths the Back button takes the wordmark's place. */
export const titleBesideBack = style({ '@media': compact({ display: 'none' }) });

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
    [REDUCED_MOTION_QUERY]: {
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
  paddingBottom: `max(${vars.$dimension.x5}, env(safe-area-inset-bottom))`,
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

// A modal dialog makes the page inert but does not stop it scrolling: on phones, where the document
// is the scroller, a swipe on the backdrop would move the page behind the open drawer.
globalStyle(`html:has(${drawer}[open])`, { overflow: 'hidden' });

export const drawerHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const drawerNav = style({ display: 'grid' });

export const drawerLink = style([
  displayText,
  {
    paddingBlock: vars.$dimension.x4,
    borderBottom: `1px solid ${beige}`,
    color: 'inherit',
    fontSize: vars.$fontSize.t8,
    textDecoration: 'none',
    selectors: {
      '&:first-child': { borderTop: `1px solid ${beige}` },
      '&[aria-current="page"]': { textDecoration: 'underline', textUnderlineOffset: '0.18em' },
    },
  },
]);

export const drawerFoot = style({ display: 'grid', gap: vars.$dimension.x5, marginTop: 'auto' });

/** Brand line and legal links under the account menu, set off by a thin rule. */
export const drawerLegal = style([
  labelText,
  {
    display: 'grid',
    gap: vars.$dimension.x3,
    paddingTop: vars.$dimension.x4,
    borderTop: `1px solid ${beige}`,
  },
]);
