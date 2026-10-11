import { style } from '@vanilla-extract/css';

export const page = style({
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr)',
  height: '100dvh',
});
