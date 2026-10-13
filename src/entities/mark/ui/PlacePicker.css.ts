import { vars } from '@seed-design/css/vars';
import { style, styleVariants } from '@vanilla-extract/css';

import { labelText } from '@/shared/ui/label.css';

export const root = style({ display: 'grid', gap: vars.$dimension.x3, minWidth: 0 });

// The exported picture in miniature: the outer rule is its edge, the inner box is the photo.
export const diagram = style({
  position: 'relative',
  width: '100%',
  maxWidth: '16rem',
  aspectRatio: '5 / 4',
  border: `1px solid ${vars.$color.stroke.neutralWeak}`,
  borderRadius: vars.$radius.r1_5,
  background: vars.$color.bg.layerDefault,
});

export const photo = style([
  labelText,
  {
    position: 'absolute',
    inset: '30% 18%',
    display: 'grid',
    placeItems: 'center',
    border: `1px solid ${vars.$color.stroke.neutralWeak}`,
    background: vars.$color.bg.neutralWeak,
    color: vars.$color.fg.neutralSubtle,
  },
]);

// Each spot is centered on its point, with padding so the dot is easy to hit.
export const spot = style({
  position: 'absolute',
  display: 'grid',
  padding: vars.$dimension.x1_5,
  transform: 'translate(-50%, -50%)',
  cursor: 'pointer',
});

const ACROSS = { left: 0, center: 1, right: 2 } as const;
const at = (xs: readonly [string, string, string], y: string) =>
  Object.fromEntries(
    Object.entries(ACROSS).map(([name, index]) => [name, { left: xs[index], top: y }]),
  ) as Record<keyof typeof ACROSS, { left: string; top: string }>;

const OUTER = ['7%', '50%', '93%'] as const;
const INNER = ['26%', '50%', '74%'] as const;
// Just outside the photo, in line with its left edge, middle and right edge.
const BESIDE = ['21%', '50%', '79%'] as const;
const outside = { above: at(BESIDE, '21%'), below: at(BESIDE, '79%') };
const whole = { top: at(OUTER, '8%'), bottom: at(OUTER, '92%') };
const inside = { top: at(INNER, '39%'), bottom: at(INNER, '61%') };

/** Where each spot sits on the diagram, keyed by area and position. */
export const spotAt = styleVariants({
  'image-top-left': whole.top.left,
  'image-top': whole.top.center,
  'image-top-right': whole.top.right,
  'image-bottom-left': whole.bottom.left,
  'image-bottom': whole.bottom.center,
  'image-bottom-right': whole.bottom.right,
  'image-above-left': outside.above.left,
  'image-above': outside.above.center,
  'image-above-right': outside.above.right,
  'image-below-left': outside.below.left,
  'image-below': outside.below.center,
  'image-below-right': outside.below.right,
  'photo-top-left': inside.top.left,
  'photo-top': inside.top.center,
  'photo-top-right': inside.top.right,
  'photo-bottom-left': inside.bottom.left,
  'photo-bottom': inside.bottom.center,
  'photo-bottom-right': inside.bottom.right,
});

export const dot = style({
  appearance: 'none',
  width: vars.$dimension.x4,
  height: vars.$dimension.x4,
  margin: 0,
  border: `1px solid ${vars.$color.stroke.neutralMuted}`,
  borderRadius: vars.$radius.full,
  background: vars.$color.bg.layerDefault,
  cursor: 'pointer',
  selectors: {
    '&:hover, &:focus-visible': { borderColor: vars.$color.bg.positiveSolid },
    '&:focus-visible': {
      outline: `2px solid ${vars.$color.stroke.focusRing}`,
      outlineOffset: vars.$dimension.x0_5,
    },
    '&:checked': {
      borderColor: vars.$color.bg.positiveSolid,
      background: vars.$color.bg.positiveSolid,
    },
  },
});

// The one choice that is not a point on the picture: leave the place to the template.
export const templateRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.$dimension.x2,
  fontSize: vars.$fontSize.t4,
  lineHeight: vars.$lineHeight.t4,
  color: vars.$color.fg.neutral,
  cursor: 'pointer',
});

export const hint = style({
  margin: 0,
  fontSize: vars.$fontSize.t3,
  lineHeight: vars.$lineHeight.t3,
  color: vars.$color.fg.neutralSubtle,
});
