import { vars } from '@seed-design/css/vars';
import { style, styleVariants } from '@vanilla-extract/css';

// A setting and the remarks under it stay together, closer than two settings are.
export const root = style({ display: 'grid', gap: vars.$dimension.x2, minWidth: 0 });

// Name on the left, then the value, with Clear pushed to the end of the line.
export const head = style({
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

export const clear = style({ marginLeft: 'auto' });

// Colored, so the remark is not read past among the hints: red for a value that needs a second
// look, green for one that was filled in.
const noteBase = { margin: 0, fontSize: vars.$fontSize.t3, fontWeight: vars.$fontWeight.medium };

export const note = styleVariants({
  alert: { ...noteBase, color: vars.$color.fg.brand },
  done: { ...noteBase, color: vars.$color.fg.positive },
});
