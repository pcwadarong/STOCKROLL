import { vars } from '@seed-design/css/vars';
import { globalStyle } from '@vanilla-extract/css';

import { beige } from '@/shared/config/accent.css';

// Shape and state fixes for SEED components whose defaults clash with the thin-ruled look.
// Plain colors belong in theme.css.ts; this file handles what a color variable cannot express.
// The `html` prefix outranks SEED's own selectors regardless of stylesheet order.

const RULE = `inset 0 0 0 1px ${vars.$color.stroke.neutralWeak}`;
const GREEN = vars.$color.bg.positiveSolid;
const checked = ':is(:checked, [data-checked])';

// Chips: a thin outline at rest; green when selected.
globalStyle('html .seed-chip__root', { boxShadow: RULE });
// SEED lightens a selected chip on hover while its label stays light, which made the label
// vanish. Selected chips keep their green fill in every state.
globalStyle(
  `html .seed-chip__root${checked}, html .seed-chip__root${checked}:is(:hover, :active, [data-hover], [data-active])`,
  { background: GREEN, boxShadow: `inset 0 0 0 1px ${GREEN}` },
);
globalStyle(`html .seed-chip__label${checked}`, { color: beige });

// Segmented control: outlined track, green selected segment.
globalStyle('html .seed-segmented-control__root', { boxShadow: RULE });
globalStyle('html .seed-segmented-control__indicator', { background: GREEN, boxShadow: 'none' });
globalStyle(`html .seed-segmented-control__item${checked}`, { color: beige });
// SEED paints hovered and pressed segments light gray with a selector that carries a `:not()`,
// so the override repeats it to outrank it. Selected segments stay clear over the green
// indicator; unselected ones get a faint tint instead of white.
const enabled = ':not(:is(:disabled, [disabled], [data-disabled]))';
const pointed = ':is(:hover, :active, [data-hover], [data-active])';
globalStyle(`html .seed-segmented-control__item${enabled}${checked}${pointed}`, {
  background: 'transparent',
  boxShadow: 'none',
});
globalStyle(`html .seed-segmented-control__item${enabled}:not(${checked})${pointed}`, {
  background: vars.$color.bg.neutralWeak,
  boxShadow: 'none',
});

// Dropdown list and action menu: ruled like a card, with a soft shadow so they read as floating
// above the page.
globalStyle('html .seed-select__content, html .seed-menu__content', {
  border: `1px solid ${vars.$color.stroke.neutralWeak}`,
  borderRadius: vars.$radius.r2,
  boxShadow: vars.$shadow.s2,
});

// Alert dialog: SEED breaks lines between any two letters, which suits Korean but splits English
// words mid-word. Break between words, and only inside one when it cannot fit at all.
globalStyle('html .seed-alert-dialog__content', {
  wordBreak: 'normal',
  overflowWrap: 'break-word',
});

// Answers sit side by side with Cancel on the left, and wrap when there are too many to fit.
globalStyle('html .seed-alert-dialog__footer', {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: vars.$dimension.x2,
});
globalStyle('html .seed-alert-dialog__footer > *', { flex: '1 1 auto' });
