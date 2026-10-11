import { vars } from '@seed-design/css/vars';
import { globalStyle, style } from '@vanilla-extract/css';

import { tertiary } from '@/shared/config/accent.css';
import { SHADE } from '@/shared/config/palette';
import { COMPACT_MEDIA_QUERY } from '@/shared/config/responsive';
import { labelText, labelTitle } from '@/shared/ui/label.css';

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
      height: '46svh',
      paddingInline: vars.$dimension.x3,
      paddingBottom: vars.$dimension.x3,
      // Once the app bar has scrolled away the preview sits at the very top, under the notch.
      paddingTop: `max(${vars.$dimension.x5}, env(safe-area-inset-top))`,
      background: vars.$color.bg.layerBasement,
      borderBottom: `1px solid ${vars.$color.stroke.neutralWeak}`,
    },
  },
});

export const stageDragging = style({ outlineColor: vars.$color.stroke.brandSolid });

export const preview = style({
  maxWidth: '100%',
  maxHeight: '100%',
  // The one soft shadow in the UI: the print resting on the desk.
  boxShadow: SHADE.shadow,
});

// Decoding the next photo, or lent to "Save all": the last frame stays, visibly not current.
export const previewBusy = style({ opacity: 0.5 });

// One line is always reserved, so a message appearing does not resize the preview.
export const status = style([
  labelText,
  { minHeight: '1lh', margin: 0, textAlign: 'center', color: vars.$color.fg.neutralMuted },
]);

export const empty = style({
  display: 'grid',
  justifyItems: 'center',
  gap: vars.$dimension.x4,
  maxWidth: '20rem',
  textAlign: 'center',
});

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

// Wraps every settings group so one `inert` freezes them all; spaced like the panel itself.
export const settings = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.$dimension.x8,
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

export const field = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: vars.$dimension.x2_5,
});

// Exposure is four numbers, laid out two by two.
export const exposure = style({
  display: 'grid',
  marginTop: vars.$dimension.x3,
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: vars.$dimension.x3,
});

export const fieldAction = style({ alignSelf: 'flex-end' });

// Long camera file names wrap anywhere rather than widen the panel.
export const fileName = style({ overflowWrap: 'anywhere' });

export const queueActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.$dimension.x2,
});

// One line of text links under the file name.
export const queueLinks = style({
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: vars.$dimension.x5,
});

// Text links are only a line tall; the padding makes them a fair touch target.
globalStyle(`${queueLinks} > *`, { paddingBlock: vars.$dimension.x2 });

export const actions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.$dimension.x2,
  marginTop: 'auto',
});

// Actions share a row evenly and wrap when the panel is too narrow for them.
export const action = style({ flex: '1 1 7rem' });

// "Save all" takes a row of its own under the single-photo actions.
export const actionWide = style({ flex: '1 1 100%' });

export const hiddenInput = style({ display: 'none' });
