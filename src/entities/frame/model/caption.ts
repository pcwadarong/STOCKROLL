import type { FrameTemplate } from './style';

/**
 * Shooting info as ready-to-print strings. A missing value is an empty string and is simply not
 * drawn: nothing here is ever filled in by guessing.
 */
export type FrameInfo = {
  camera: string;
  lens: string;
  /** Film stock for a film camera, recipe or look for a digital one. */
  look: string;
  iso: string;
  focal: string;
  aperture: string;
  shutter: string;
  /** Date the photo was taken, when the file records one. */
  date: string;
};

export const EMPTY_INFO: FrameInfo = {
  camera: '',
  lens: '',
  look: '',
  iso: '',
  focal: '',
  aperture: '',
  shutter: '',
  date: '',
};

export type CaptionRow =
  /** Two strings pushed to the two ends of the line. */
  | { kind: 'sides'; left: string; right: string; strong: boolean }
  /** One string placed by the style's alignment. */
  | { kind: 'text'; text: string; strong: boolean }
  /** Short values spread evenly across the line. */
  | { kind: 'cells'; cells: string[] };

export type CaptionBlock = {
  /** `below` the photo in the margin, `over` its lower edge, or on the film `strip`. */
  placement: 'below' | 'over' | 'strip';
  /** `paper` follows the margin color, `light` is for text on the photo, `amber` for read-outs. */
  tone: 'paper' | 'light' | 'amber';
  rows: CaptionRow[];
};

const join = (parts: readonly string[], separator: string) => parts.filter(Boolean).join(separator);

const exposure = (info: FrameInfo) => [info.iso, info.focal, info.aperture, info.shutter];

const sides = (left: string, right: string, strong: boolean): CaptionRow[] =>
  left || right ? [{ kind: 'sides', left, right, strong }] : [];

const text = (value: string, strong: boolean): CaptionRow[] =>
  value ? [{ kind: 'text', text: value, strong }] : [];

/**
 * Lays the shooting info out as rows for a template. Rows with nothing to say are left out, so a
 * film scan with no exposure data gets a shorter caption rather than blank lines.
 * The user's own text always comes last, on a line of its own.
 * @param template the look picked
 * @param info shooting info as strings
 * @param ownText the user's free line
 * @returns where the caption goes, its tone, and its rows from top to bottom
 */
export const buildCaption = (
  template: FrameTemplate,
  info: FrameInfo,
  ownText: string,
): CaptionBlock => {
  const own = text(ownText.trim(), false);

  switch (template) {
    case 'label':
      return {
        placement: 'below',
        tone: 'paper',
        rows: [
          ...sides(info.camera ? `Shot on ${info.camera}` : '', join(exposure(info), ' '), true),
          ...sides(info.lens, info.look, false),
          ...own,
        ],
      };
    case 'center':
    case 'overlay':
      return {
        placement: template === 'overlay' ? 'over' : 'below',
        tone: template === 'overlay' ? 'light' : 'paper',
        rows: [
          ...text(join([info.camera, info.lens], ' · '), true),
          ...text(join([...exposure(info), info.look], ' · '), false),
          ...own,
        ],
      };
    case 'bar': {
      const cells = [info.aperture, info.shutter, info.iso, info.focal].filter(Boolean);
      return {
        placement: 'below',
        tone: 'paper',
        rows: [...(cells.length > 0 ? [{ kind: 'cells' as const, cells }] : []), ...own],
      };
    }
    case 'stamp': {
      // Two columns that both sit on the bottom edge: what and when on the left, the exposure
      // read-out on the right. The shorter column is padded at the top, not the bottom.
      const left = [info.date, info.camera, info.lens, ownText.trim()].filter(Boolean);
      const right = [info.aperture, info.shutter, info.iso].filter(Boolean);
      const height = Math.max(left.length, right.length);
      const pad = (column: string[]) => [
        ...Array<string>(height - column.length).fill(''),
        ...column,
      ];
      const [l, r] = [pad(left), pad(right)];
      return {
        placement: 'over',
        tone: 'amber',
        rows: l.map((value, index) => ({
          kind: 'sides' as const,
          left: value.toUpperCase(),
          right: (r[index] ?? '').toUpperCase(),
          strong: false,
        })),
      };
    }
    case 'film':
      return {
        placement: 'strip',
        tone: 'amber',
        rows: [
          ...sides(
            (info.look || info.camera).toUpperCase(),
            join(exposure(info), '  ').toUpperCase(),
            false,
          ),
          ...own,
        ],
      };
    case 'none':
      return { placement: 'below', tone: 'paper', rows: own };
  }
};

// Row heights on a 1080-wide canvas. A strong row plus a quiet one is the classic 74-high caption.
const STRONG_ROW = 34;
const QUIET_ROW = 28;
const ROW_GAP = 12;

/**
 * Height of one caption row before text scaling.
 * @param row the row to measure
 * @returns its height on a 1080-wide canvas
 */
export const rowHeight = (row: CaptionRow) =>
  row.kind === 'cells' || row.strong ? STRONG_ROW : QUIET_ROW;

/**
 * Height the caption needs, so the layout can reserve it before anything is drawn.
 * @param rows caption rows
 * @param scale text size multiplier
 * @returns height on a 1080-wide canvas. Zero when there are no rows
 */
export const captionHeight = (rows: readonly CaptionRow[], scale: number) =>
  rows.length === 0
    ? 0
    : (rows.reduce((sum, row) => sum + rowHeight(row), 0) + ROW_GAP * (rows.length - 1)) * scale;

export const CAPTION_ROW_GAP = ROW_GAP;

/** Height of the user's logo before text scaling, on a 1080-wide canvas. */
export const LOGO_HEIGHT = 44;

/**
 * Tells whether a logo sits between the two sides of the caption rather than above it. That is
 * the case for a caption below the photo made only of two-sided rows, where the middle is free.
 * @param block the caption
 * @returns true when the logo goes in the middle of the rows
 */
export const logoInline = (block: CaptionBlock) =>
  block.placement === 'below' &&
  block.rows.length > 0 &&
  block.rows.every(row => row.kind === 'sides');

/**
 * Extra height a logo needs above the caption rows. None when there is no logo, when it sits
 * inline, or on a film strip, which has no room for one.
 * @param block the caption
 * @param hasLogo whether the user attached a logo
 * @param scale text size multiplier
 * @returns height on a 1080-wide canvas
 */
export const logoRoom = (block: CaptionBlock, hasLogo: boolean, scale: number) => {
  if (!hasLogo || block.placement === 'strip' || logoInline(block)) return 0;
  return (LOGO_HEIGHT + (block.rows.length > 0 ? ROW_GAP : 0)) * scale;
};
