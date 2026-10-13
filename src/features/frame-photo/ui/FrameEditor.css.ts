import { vars } from '@seed-design/css/vars';
import { globalStyle, style } from '@vanilla-extract/css';

import * as bench from '@/shared/ui/workbench.css';

// The preview-and-panel frame is shared with the recipe card (`shared/ui/workbench.css`).
export const { root, stage, preview, status, panel, group, legend, actions, action } = bench;

export const stageDragging = style({ outlineColor: vars.$color.stroke.brandSolid });

// Decoding the next photo, or lent to "Save all": the last frame stays, visibly not current.
export const previewBusy = style({ opacity: 0.5 });

export const empty = style({
  display: 'grid',
  justifyItems: 'center',
  gap: vars.$dimension.x4,
  maxWidth: '20rem',
  textAlign: 'center',
});

// Wraps every settings group so one `inert` freezes them all; spaced like the panel itself.
export const settings = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.$dimension.x8,
});

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

// Each field lends its label and its input to the shared rows, so a label that wraps
// ("Focal length (mm)") pushes its neighbour's input down with it and the inputs stay level.
// The fields are SEED's own roots, which take no class name, hence the child selector.
globalStyle(`${exposure} > *`, {
  display: 'grid',
  gridRow: 'span 2',
  gridTemplateRows: 'subgrid',
  rowGap: vars.$dimension.x2,
  // Labels sit on the input, so a one-line label lines up with the last line of a wrapped one.
  alignItems: 'end',
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

export const hiddenInput = style({ display: 'none' });
