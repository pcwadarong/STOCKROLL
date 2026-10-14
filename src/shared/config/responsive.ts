/**
 * At or below this width the layout is "compact": the editor stacks its preview and panel, and
 * the app bar swaps its inline navigation for a menu button that opens a side drawer.
 */
export const COMPACT_MEDIA_QUERY = 'screen and (max-width: 760px)';

/**
 * Compact width in the installed app (opened from the home screen), where there is no browser
 * chrome and the page runs under the status bar.
 */
export const COMPACT_STANDALONE_MEDIA_QUERY =
  'screen and (max-width: 760px) and (display-mode: standalone)';

/**
 * Height of the app bar on compact widths, notch included. Shared so a shell that pins the bar
 * out of the flow can reserve exactly this much space for it.
 */
export const COMPACT_APP_BAR_HEIGHT = 'calc(3.5rem + env(safe-area-inset-top))';

/** Compact width with very little height, such as a phone held sideways. */
export const SHORT_COMPACT_MEDIA_QUERY = 'screen and (max-width: 760px) and (max-height: 520px)';

/** Phone-sized widths, where rows that sit side by side on larger screens stack. */
export const NARROW_MEDIA_QUERY = 'screen and (max-width: 560px)';

/** Users who asked their system for less motion. Animations and transitions are dropped here. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Height of the pinned preview on compact widths, in `svh`, while the top of the page shows. Over
 * half the screen: the photo is the point, and the settings scroll under it anyway.
 */
export const COMPACT_STAGE_SVH = 58;

/**
 * Height of the pinned preview, in `svh`, once the page has scrolled into the settings: small
 * enough to leave the fields room, large enough to see a change land.
 */
export const COMPACT_STAGE_FOLDED_SVH = 40;
