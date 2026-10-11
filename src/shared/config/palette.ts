/**
 * Brand colors, tuned from the STOCKROLL moodboard for screen use.
 * The UI should read like a premium analog camera brand — film packaging, an archival label,
 * a product catalog: warm off-white paper, charcoal ink, thin rules. Red is the key color,
 * green second (used sparingly), brown third. This is the only place raw color values live.
 */
export const BRAND = {
  red: '#8e211e',
  green: '#1f4e3d',
  brown: '#4b3427',
  black: '#141414',
  cream: '#f4efe3',
  ivory: '#faf7ef',
  gray: '#6e6a60',
} as const;

/** Shades derived from the brand colors for states the moodboard does not define. */
export const SHADE = {
  redPressed: '#761b19',
  redWeak: '#efd9d2',
  greenPressed: '#183d30',
  greenWeak: '#d5e0d6',
  creamDeep: '#e9e2d2',
  creamDeeper: '#dcd3bf',
  inkMuted: '#3d3b36',
  inkFaint: '#9a958a',
  /** Thin rule: charcoal at about a third strength. */
  rule: 'rgba(20, 20, 20, 0.35)',
  ruleSoft: 'rgba(20, 20, 20, 0.14)',
  /** Soft drop shadow under the photo preview only. Cards and buttons stay flat. */
  shadow: '0 8px 24px rgba(20, 20, 20, 0.1)',
} as const;
