import { globalStyle } from '@vanilla-extract/css';

import { beige, tertiary } from '@/shared/config/accent.css';
import { BRAND as B, SHADE as S } from '@/shared/config/palette';

// Re-points SEED's semantic color variables at the STOCKROLL palette. Components keep using
// `vars.$color.*`; only the values behind them change.
//
// One theme only: warm off-white paper with charcoal ink. SEED runs in `light-only` mode (vite.config.ts) and
// this selector's extra `html` outranks SEED's own `:root[data-seed-color-mode="light-only"]`
// rule. Nothing here depends on the system light/dark setting.
const ROOT = "html:root[data-seed-color-mode='light-only']";

globalStyle(ROOT, {
  vars: {
    [beige]: B.cream,
    [tertiary]: B.brown,
    // red — key color: primary actions, header
    '--seed-color-bg-brand-solid': B.red,
    '--seed-color-bg-brand-solid-pressed': S.redPressed,
    '--seed-color-bg-brand-weak': S.redWeak,
    '--seed-color-bg-brand-weak-pressed': S.creamDeeper,
    '--seed-color-fg-brand': B.red,
    '--seed-color-fg-brand-contrast': B.red,
    '--seed-color-fg-on-brand-solid': beige,
    '--seed-color-stroke-brand-solid': B.red,
    '--seed-color-stroke-brand-weak': S.redWeak,
    // green — second color, used sparingly: the selected tab and focus
    '--seed-color-bg-positive-solid': B.green,
    '--seed-color-bg-positive-solid-pressed': S.greenPressed,
    '--seed-color-bg-positive-weak': S.greenWeak,
    '--seed-color-bg-positive-weak-pressed': S.creamDeeper,
    '--seed-color-fg-positive': B.green,
    '--seed-color-fg-positive-contrast': B.green,
    '--seed-color-fg-on-positive-solid': beige,
    '--seed-color-stroke-positive-solid': B.green,
    '--seed-color-stroke-positive-weak': S.greenWeak,
    '--seed-color-stroke-focus-ring': B.green,
    // ink
    '--seed-color-fg-neutral': B.black,
    '--seed-color-fg-neutral-muted': S.inkMuted,
    '--seed-color-fg-neutral-subtle': B.gray,
    '--seed-color-fg-placeholder': S.inkFaint,
    // Disabled text stays in the warm ink family instead of SEED's cool gray.
    '--seed-color-fg-disabled': S.inkFaint,
    '--seed-color-fg-neutral-inverted': B.cream,
    '--seed-color-fg-on-neutral-solid': B.cream,
    '--seed-color-bg-neutral-inverted': B.black,
    '--seed-color-bg-neutral-inverted-pressed': S.inkMuted,
    '--seed-color-bg-neutral-solid': B.black,
    '--seed-color-bg-neutral-solid-pressed': S.inkMuted,
    // paper and thin rules
    '--seed-color-bg-layer-basement': B.cream,
    '--seed-color-bg-layer-default': B.ivory,
    '--seed-color-bg-layer-default-pressed': S.creamDeep,
    '--seed-color-bg-layer-floating': B.ivory,
    '--seed-color-bg-layer-floating-pressed': S.creamDeep,
    '--seed-color-bg-neutral-weak': S.creamDeep,
    '--seed-color-bg-neutral-weak-pressed': S.creamDeeper,
    '--seed-color-stroke-neutral-subtle': S.ruleSoft,
    '--seed-color-stroke-neutral-weak': S.rule,
    '--seed-color-stroke-neutral-muted': S.rule,
  },
});
