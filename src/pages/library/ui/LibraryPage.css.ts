import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { beige } from '@/shared/config/accent.css';
import { labelText } from '@/shared/ui/label.css';

const INK = vars.$color.fg.neutral;

export const tabs = style({ display: 'flex', flexWrap: 'wrap', gap: vars.$dimension.x3 });

// Thin-ruled labels. Flat, so they read as print rather than raised buttons.
export const tab = style([
  labelText,
  {
    display: 'inline-flex',
    gap: vars.$dimension.x2,
    paddingInline: vars.$dimension.x4,
    paddingBlock: vars.$dimension.x2,
    border: `1px solid ${vars.$color.stroke.neutralWeak}`,
    borderRadius: vars.$radius.r1,
    color: INK,
    textDecoration: 'none',
    selectors: {
      '&:hover, &:focus-visible': { borderColor: INK },
      '&[aria-current="page"]': {
        background: vars.$color.bg.positiveSolid,
        borderColor: vars.$color.bg.positiveSolid,
        color: beige,
      },
    },
  },
]);

export const list = style({ display: 'grid', margin: 0, padding: 0, listStyle: 'none' });

export const row = style({
  display: 'grid',
  gap: vars.$dimension.x0_5,
  paddingBlock: vars.$dimension.x3,
  borderBottom: `1px solid ${vars.$color.stroke.neutralSubtle}`,
  color: 'inherit',
  textDecoration: 'none',
  overflowWrap: 'anywhere',
  selectors: { '&:hover, &:focus-visible': { color: vars.$color.fg.positive } },
});

export const rowTitle = style({ fontSize: vars.$fontSize.t5, fontWeight: vars.$fontWeight.bold });

// Pushed to the far left, away from Save, so it is not hit by accident.
export const destructive = style({ marginRight: 'auto', color: vars.$color.fg.brand });

export const actions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: vars.$dimension.x3,
});
