import { vars } from '@seed-design/css/vars';
import { style, styleVariants } from '@vanilla-extract/css';

// A setting and the remarks under it stay together, closer than two settings are.
export const root = style({ display: 'grid', gap: vars.$dimension.x2, minWidth: 0 });

// Name, value and earlier value on the left, wrapping among themselves; Clear stays on the first
// line at the end, so it does not drop under a long earlier value.
export const head = style({
  display: 'flex',
  alignItems: 'baseline',
  columnGap: vars.$dimension.x2,
  minWidth: 0,
});

export const summary = style({
  display: 'flex',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  columnGap: vars.$dimension.x2,
  minWidth: 0,
});

// Matches the label SEED draws above its own fields, so the form reads alike throughout.
export const label = style({
  fontSize: vars.$fontSize.t5,
  lineHeight: vars.$lineHeight.t5,
  fontWeight: vars.$fontWeight.medium,
  color: vars.$color.fg.neutral,
});

const valueBase = {
  fontSize: vars.$fontSize.t4,
  lineHeight: vars.$lineHeight.t4,
  fontVariantNumeric: 'tabular-nums',
};

export const value = style({ ...valueBase, fontWeight: vars.$fontWeight.bold });

// "Not set" is quieter than a value, so an empty setting does not read as one set to something.
export const unset = style({ ...valueBase, color: vars.$color.fg.neutralSubtle });

// The value this edit replaced: quieter than the value, so the change reads without a color of
// its own.
export const was = style({ ...valueBase, color: vars.$color.fg.neutralSubtle });

/** The earlier value of a field that is typed rather than picked, on its own line under it. */
export const wasLine = style({
  margin: 0,
  fontSize: vars.$fontSize.t3,
  color: vars.$color.fg.neutralSubtle,
});

export const clear = style({ marginLeft: 'auto', flexShrink: 0 });

// Colored, so the remark is not read past among the hints: red for a value that needs a second
// look, green for one that was filled in.
const noteBase = { margin: 0, fontSize: vars.$fontSize.t3, fontWeight: vars.$fontWeight.medium };

export const note = styleVariants({
  alert: { ...noteBase, color: vars.$color.fg.brand },
  done: { ...noteBase, color: vars.$color.fg.positive },
});
