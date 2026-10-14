import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

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
  // A set compact height, so a shell that pins the bar can reserve exactly this much. Three columns:
  // Back at the start, the name centred whether or not Back is there, the end left empty.
  '@media': compact({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
    gap: vars.$dimension.x2,
    height: COMPACT_APP_BAR_HEIGHT,
  }),
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

export const title = style([
  displayText,
  {
    fontSize: vars.$fontSize.t6,
    letterSpacing: '0.14em',
    '@media': compact({ gridColumn: 2, gridRow: 1, justifySelf: 'center' }),
  },
]);

export const titleLink = style({ color: 'inherit', textDecoration: 'none' });

/** Inline navigation and account menu. Hidden on compact widths: the tab bar and the Me screen. */
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

/** Back button at the start of the bar. Compact widths only; wide screens have the browser's. */
export const backButton = style([
  labelText,
  {
    display: 'none',
    gridColumn: 1,
    justifySelf: 'start',
    alignItems: 'center',
    gap: vars.$dimension.x2,
    minHeight: '2.75rem',
    marginLeft: `calc(-1 * ${vars.$dimension.x2})`,
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

/** On compact widths the screen's name takes the wordmark's place. */
export const titleBesideName = style({ '@media': compact({ display: 'none' }) });

/**
 * The screen's name, centred in the bar on compact widths. Hidden from assistive technology: the
 * page's own heading says the same and comes first in the content.
 */
export const screenName = style([
  title,
  {
    display: 'none',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    '@media': compact({ display: 'block' }),
  },
]);
