import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import {
  COMPACT_APP_BAR_HEIGHT,
  COMPACT_STANDALONE_MEDIA_QUERY,
  SHORT_COMPACT_MEDIA_QUERY,
} from '@/shared/config/responsive';
import { card, labelText } from '@/shared/ui/label.css';

const FILM = vars.$color.bg.neutralInverted;
const EDGE = vars.$color.fg.neutralInverted;
const faint = (share: number) => `color-mix(in srgb, ${EDGE} ${share}%, transparent)`;

// Perforations: paper showing through the film, one row along each edge.
const HOLE = `linear-gradient(to right, ${vars.$color.bg.layerDefault} 0 55%, transparent 55%)`;
const HOLE_HEIGHT = '0.375rem';
const HOLE_INSET = '0.375rem';

// A roll as one strip of film: every slot a frame, all ten on a single line. Where the line is
// wider than the screen the strip scrolls sideways inside itself, so the page never does.
export const strip = style({
  position: 'relative',
  display: 'flex',
  gap: vars.$dimension.x2,
  margin: 0,
  // Clear of the perforations above and below.
  paddingBlock: `calc(${HOLE_INSET} * 2 + ${HOLE_HEIGHT})`,
  paddingInline: vars.$dimension.x3,
  listStyle: 'none',
  overflowX: 'auto',
  overscrollBehaviorX: 'contain',
  scrollbarWidth: 'thin',
  scrollbarColor: `${faint(40)} ${FILM}`,
  borderRadius: vars.$radius.r1,
  backgroundColor: FILM,
  backgroundImage: `${HOLE}, ${HOLE}`,
  backgroundRepeat: 'repeat-x',
  backgroundSize: `0.875rem ${HOLE_HEIGHT}`,
  backgroundPosition: `left ${HOLE_INSET} top ${HOLE_INSET}, left ${HOLE_INSET} bottom ${HOLE_INSET}`,
  // The perforations travel with the frames instead of staying put while the film moves.
  backgroundAttachment: 'local',
  color: EDGE,
});

// Frames share the line evenly where it fits and keep this width where it does not.
export const slot = style({ flex: '1 0 5.25rem', minWidth: 0 });

export const cell = style({
  display: 'grid',
  gap: vars.$dimension.x1,
  width: '100%',
  minWidth: 0,
  padding: 0,
  border: 0,
  background: 'none',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  selectors: {
    'button&': { cursor: 'pointer' },
    // The usual green ring would vanish on the dark film.
    '&:focus-visible': { outline: `2px solid ${EDGE}`, outlineOffset: vars.$dimension.x0_5 },
  },
});

// 3:2, the shape of a 35mm frame.
export const frame = style({
  display: 'grid',
  placeItems: 'center',
  aspectRatio: '3 / 2',
  overflow: 'hidden',
  borderRadius: vars.$radius.r0_5,
  background: faint(14),
  selectors: {
    [`button${cell}:hover &`]: { outline: `1px solid ${faint(60)}` },
    [`${cell}[aria-pressed="true"] &`]: { outline: `2px solid ${EDGE}` },
  },
});

// An unexposed frame: an outline only, so it reads as a place to fill.
export const emptyFrame = style([frame, { border: `1px dashed ${faint(40)}`, background: 'none' }]);

export const image = style({ display: 'block', width: '100%', height: '100%', objectFit: 'cover' });

export const frameText = style([
  labelText,
  {
    padding: vars.$dimension.x1,
    fontSize: vars.$fontSize.t1,
    lineHeight: 1.3,
    textAlign: 'center',
    overflowWrap: 'anywhere',
  },
]);

// Edge printing under the frame: the slot, then the recipe's name on what is left of the line.
export const edge = style([
  labelText,
  {
    display: 'flex',
    alignItems: 'baseline',
    gap: vars.$dimension.x1,
    minWidth: 0,
    fontSize: vars.$fontSize.t1,
  },
]);

export const slotLabel = style({
  flex: 'none',
  paddingInline: vars.$dimension.x0_5,
  borderRadius: vars.$radius.r0_5,
  fontWeight: vars.$fontWeight.bold,
  selectors: {
    // The slot being filled carries the green of every control that is on.
    [`${cell}[aria-pressed="true"] &`]: { background: vars.$color.bg.positiveSolid },
  },
});

// One line by design: the full name is on the roll's own screen.
export const slotName = style({
  minWidth: 0,
  overflow: 'hidden',
  color: faint(75),
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const rolls = style({
  display: 'grid',
  gap: vars.$dimension.x5,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

// A roll in the list: its name over its strip, the whole of it leading to the roll.
export const roll = style({
  display: 'grid',
  gap: vars.$dimension.x2,
  minWidth: 0,
  color: 'inherit',
  textDecoration: 'none',
  selectors: { '&:hover, &:focus-visible': { color: vars.$color.fg.positive } },
});

export const rollHeader = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  columnGap: vars.$dimension.x3,
  overflowWrap: 'anywhere',
});

export const rollName = style({ fontSize: vars.$fontSize.t5, fontWeight: vars.$fontWeight.bold });

export const rollCount = style([labelText, { color: vars.$color.fg.neutralSubtle }]);

// Editing: the strip and Save stay in view while the recipes scroll under them, so the slot
// being filled is seen as each recipe is tapped.
const DOCK_GAP = `max(${vars.$dimension.x2}, env(safe-area-inset-top))`;
const DOCK_RADIUS = vars.$radius.r2_5;
const PAGE = vars.$color.bg.layerBasement;

export const dock = style({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  minWidth: 0,
  // The space kept above the pinned card is part of this box, so it can be painted: page colour
  // from the top edge down past the card's upper corners. Without it the recipes scrolling by
  // show in that gap and around the corners. Unpinned, it is the page's own colour and unseen;
  // the margin takes back the room the padding adds.
  paddingTop: DOCK_GAP,
  marginTop: `calc(${vars.$dimension.x2} * -1)`,
  backgroundImage: `linear-gradient(${PAGE}, ${PAGE})`,
  backgroundRepeat: 'no-repeat',
  backgroundSize: `100% calc(${DOCK_GAP} + ${DOCK_RADIUS})`,
  '@media': {
    // The installed app pins its bar over the page; stay below it. That bar's height already
    // includes the notch, so only the plain gap is kept here.
    [COMPACT_STANDALONE_MEDIA_QUERY]: {
      top: COMPACT_APP_BAR_HEIGHT,
      paddingTop: vars.$dimension.x2,
      backgroundSize: `100% calc(${vars.$dimension.x2} + ${DOCK_RADIUS})`,
    },
    // A phone on its side has no height to spare for a pinned strip.
    [SHORT_COMPACT_MEDIA_QUERY]: { position: 'static' },
  },
});

export const dockCard = style([
  card,
  {
    display: 'grid',
    gap: vars.$dimension.x3,
    minWidth: 0,
    padding: vars.$dimension.x3,
    borderRadius: DOCK_RADIUS,
    // Ruled in ink, not the card's faint line: recipes scroll under it on the same paper, and it
    // has to read as the thing on top.
    borderColor: vars.$color.fg.neutral,
  },
]);

// The on-screen keyboard changes no CSS viewport unit, so a pinned strip would sit over the name
// being typed. Let it scroll away while the name has focus.
export const dockLoose = style({ position: 'static' });

export const dockRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: vars.$dimension.x3,
});

// Kept to a few words so Save stays on the same line on a phone.
export const dockStatus = style([
  labelText,
  {
    display: 'flex',
    flex: '1 1 auto',
    alignItems: 'center',
    gap: vars.$dimension.x2,
    margin: 0,
    fontWeight: vars.$fontWeight.bold,
  },
]);

// The slot being filled, marked as it is on the strip above.
export const dockSlot = style({
  paddingInline: vars.$dimension.x1_5,
  paddingBlock: vars.$dimension.x0_5,
  borderRadius: vars.$radius.r1,
  background: vars.$color.bg.positiveSolid,
  color: EDGE,
});
