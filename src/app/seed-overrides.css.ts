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
// SEED gives every segment a minimum width, which makes four of them wider than the editor's
// panel. Segments share the track equally instead; their labels are short.
globalStyle('html .seed-segmented-control__item', { minWidth: 0 });
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
// SEED covers a disabled selected segment with a pale fill, which hid the green indicator under
// the light label. The indicator stays visible so the applied value still reads.
const disabled = ':is(:disabled, [disabled], [data-disabled])';
globalStyle(`html .seed-segmented-control__item${disabled}${checked}`, {
  background: 'transparent',
  color: beige,
});
// When every segment is off, the control fades as a whole, like a disabled button, instead of
// graying each label on top of the fade.
const allDisabled = `html .seed-segmented-control__root:not(:has(.seed-segmented-control__item${enabled}))`;
globalStyle(allDisabled, { opacity: 0.4 });
globalStyle(`${allDisabled} .seed-segmented-control__item${disabled}:not(${checked})`, {
  color: vars.$color.fg.neutralSubtle,
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
globalStyle('html .seed-dialog__content', { wordBreak: 'normal', overflowWrap: 'break-word' });

// Dialog: a body that scrolls fades out at its lower edge, and SEED pads it by the full depth of
// that fade, which leaves a wide empty band above the footer once scrolled to the end. A
// shallower fade keeps the cue and closes the band.
const FADE = vars.$dimension.x4;
globalStyle('html .seed-dialog__body[data-overflow]', {
  paddingBottom: FADE,
  maskImage: `linear-gradient(to top, transparent 0, black ${FADE})`,
  WebkitMaskImage: `linear-gradient(to top, transparent 0, black ${FADE})`,
});

// Answers sit side by side with Cancel on the left, and wrap when there are too many to fit.
globalStyle('html .seed-alert-dialog__footer', {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: vars.$dimension.x2,
});
globalStyle('html .seed-alert-dialog__footer > *', { flex: '1 1 auto' });
