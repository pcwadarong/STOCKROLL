/**
 * At or below this width the layout is "compact": the editor stacks its preview and panel, and
 * the app bar swaps its inline navigation for a menu button that opens a side drawer.
 */
export const COMPACT_MEDIA_QUERY = 'screen and (max-width: 760px)';

/** Phone-sized widths, where rows that sit side by side on larger screens stack. */
export const NARROW_MEDIA_QUERY = 'screen and (max-width: 560px)';

/** Users who asked their system for less motion. Animations and transitions are dropped here. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
