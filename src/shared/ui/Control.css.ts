import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

// A group of settings, one under another with clear air between them.
export const controls = style({ display: 'grid', gap: vars.$dimension.x5, minWidth: 0 });

// One setting: name, control, optional hint.
export const control = style({ display: 'grid', gap: vars.$dimension.x2, minWidth: 0 });

// Matches the label SEED draws above its own fields, so every setting in a panel reads alike.
export const controlLabel = style({
  fontSize: vars.$fontSize.t5,
  lineHeight: vars.$lineHeight.t5,
  fontWeight: vars.$fontWeight.medium,
  color: vars.$color.fg.neutral,
});

// A color well and its preset colors: four equal cells on one line, the height of other controls.
export const swatchRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: vars.$dimension.x2,
});

// Narrow cells: the label must fit a quarter of the panel.
export const swatch = style({
  minWidth: 0,
  minHeight: vars.$dimension.x10,
  paddingInline: vars.$dimension.x1,
});

// The native color well, squared off to sit with the label buttons beside it.
export const colorInput = style({
  width: '100%',
  height: vars.$dimension.x10,
  padding: 0,
  border: `1px solid ${vars.$color.stroke.neutralWeak}`,
  borderRadius: vars.$radius.r1_5,
  background: 'none',
  cursor: 'pointer',
});

export const hiddenInput = style({ display: 'none' });
