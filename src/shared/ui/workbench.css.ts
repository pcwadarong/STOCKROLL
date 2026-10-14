import { vars } from '@seed-design/css/vars';
import { globalStyle, style } from '@vanilla-extract/css';

import { tertiary } from '@/shared/config/accent.css';
import { SHADE } from '@/shared/config/palette';
import {
  COMPACT_MEDIA_QUERY,
  COMPACT_STAGE_FOLDED_SVH,
  COMPACT_STAGE_SVH,
  REDUCED_MOTION_QUERY,
  SHORT_COMPACT_MEDIA_QUERY,
} from '@/shared/config/responsive';

import { labelText, labelTitle } from './label.css';

// The frame of a screen that makes a picture: the picture on the left, its settings in a panel
// on the right. Shared by the frame editor and the recipe card, so both behave the same on a
// phone — the page scrolls and the preview stays pinned.

// Wraps the app bar and the workbench under it.
export const page = style({
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr)',
  height: '100dvh',
  '@media': {
    // On phones the document scrolls instead of the panel. A fixed-height shell stops at the
    // browser toolbar and leaves an empty band behind it; a scrolling page runs underneath.
    [COMPACT_MEDIA_QUERY]: { display: 'block', height: 'auto', minHeight: '100dvh' },
  },
});

export const root = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 22.5rem',
  // Without a bounded row the canvas grows to its pixel height instead of fitting the stage.
  gridTemplateRows: 'minmax(0, 1fr)',
  minHeight: 0,
  '@media': {
    // Stacked in normal flow: the page scrolls, the preview stays pinned (see `stage`).
    [COMPACT_MEDIA_QUERY]: { display: 'block' },
  },
});

export const stage = style({
  display: 'grid',
  placeItems: 'center',
  // Definite tracks give the canvas' max-width/max-height percentages something to resolve against.
  gridTemplate: 'minmax(0, 1fr) / minmax(0, 1fr)',
  // The status line and the thumbnail strip sit under the preview and take only their own height.
  gridAutoRows: 'auto',
  gap: vars.$dimension.x2,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
  padding: vars.$dimension.x6,
  outline: '1px dashed transparent',
  outlineOffset: `calc(${vars.$dimension.x2} * -1)`,
  '@media': {
    [COMPACT_MEDIA_QUERY]: {
      // Pinned while the settings scroll under it, so a change is seen as it is made.
      position: 'sticky',
      top: 0,
      zIndex: 1,
      // `svh`, not `dvh`: the height must not jump when the browser toolbar collapses on scroll.
      height: `${COMPACT_STAGE_SVH}svh`,
      transition: `height ${vars.$duration.d4} ${vars.$timingFunction.easing}`,
      paddingInline: vars.$dimension.x3,
      paddingBottom: vars.$dimension.x3,
      // Once the app bar has scrolled away the preview sits at the very top, under the notch.
      paddingTop: `max(${vars.$dimension.x5}, env(safe-area-inset-top))`,
      background: vars.$color.bg.layerBasement,
      borderBottom: `1px solid ${vars.$color.stroke.neutralWeak}`,
    },
    // A phone on its side has no height to spare for a pinned preview: let it scroll away.
    [SHORT_COMPACT_MEDIA_QUERY]: { position: 'relative' },
    [REDUCED_MOTION_QUERY]: { transition: 'none' },
  },
  selectors: {
    // The on-screen keyboard covers the lower half without changing any CSS viewport unit, so a
    // pinned preview would sit over the field being typed in. Unpin it while a field has focus.
    [`${root}:has(input[inputmode]:focus) &`]: { position: 'relative' },
  },
});

/**
 * The pinned preview made smaller while the page is scrolled into the settings
 * (`useFoldedStage`), so the fields get room. Back to full height at the top of the page.
 */
export const stageFolded = style({
  '@media': {
    [COMPACT_MEDIA_QUERY]: { height: `${COMPACT_STAGE_FOLDED_SVH}svh` },
    // Not pinned here, so there is nothing to make room for.
    [SHORT_COMPACT_MEDIA_QUERY]: { height: `${COMPACT_STAGE_SVH}svh` },
  },
});

// Folding the preview shortens the page above what is on screen. Scroll anchoring (Chrome, not
// Safari) would answer by scrolling up as much, back past the fold point, so the preview would
// unfold, scroll down again and fold: a loop. Without it both browsers let the content move up.
globalStyle(`html:has(${stage})`, { overflowAnchor: 'none' });

export const preview = style({
  maxWidth: '100%',
  maxHeight: '100%',
  // The one soft shadow in the UI: the print resting on the desk.
  boxShadow: SHADE.shadow,
});

// One line is always reserved, so a message appearing does not resize the preview.
export const status = style([
  labelText,
  { minHeight: '1lh', margin: 0, textAlign: 'center', color: vars.$color.fg.neutralMuted },
]);

export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.$dimension.x8,
  padding: vars.$dimension.x5,
  paddingBottom: `max(${vars.$dimension.x4}, env(safe-area-inset-bottom))`,
  overflowY: 'auto',
  background: vars.$color.bg.layerDefault,
  borderLeft: `1px solid ${vars.$color.stroke.neutralWeak}`,
  '@media': {
    // The page scrolls here, so the panel is as tall as its content and ends clear of the
    // browser toolbar and home indicator, which float over the page.
    [COMPACT_MEDIA_QUERY]: {
      borderLeft: 0,
      overflowY: 'visible',
      paddingBottom: `calc(${vars.$dimension.x8} + env(safe-area-inset-bottom))`,
    },
  },
});

export const group = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.$dimension.x2,
  minWidth: 0,
  margin: 0,
  padding: 0,
  border: 0,
});

// Section headings use the third color (brown), set as a small label.
export const legend = style([
  labelTitle,
  // Padding, not margin: browsers ignore a legend's bottom margin inside a fieldset.
  { padding: 0, paddingBottom: vars.$dimension.x3, color: tertiary },
]);

export const actions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.$dimension.x2,
  marginTop: 'auto',
});

// Actions share a row evenly and wrap when the panel is too narrow for them.
export const action = style({ flex: '1 1 7rem' });
