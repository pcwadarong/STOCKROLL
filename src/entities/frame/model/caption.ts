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
  /** Two strings pushed to the two ends of the line. `rightStrong` defaults to `strong`. */
  | { kind: 'sides'; left: string; right: string; strong: boolean; rightStrong?: boolean }
  /** One string placed by the look's alignment. */
  | { kind: 'text'; text: string; strong: boolean }
  /** Short values spread evenly across the line. */
  | { kind: 'cells'; cells: string[] }
  /** The user's own line with their image beside it, placed together by the alignment. */
  | { kind: 'mark'; text: string; image: boolean };

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
 * Lays the shooting info out as rows for a template, with the user's own text in the place that
 * template keeps for it. Rows with nothing to say are left out, so a film scan with no exposure
 * data gets a shorter caption rather than blank lines. A template with room for one line gets the
 * user's lines joined into one; Bar has no place for them. The Text template shows no shooting
 * info: only the user's lines and image.
 * @param template the look picked
 * @param info shooting info as strings
 * @param own the user's own lines, at most two, none of them empty
 * @param hasImage whether the user attached an image. Used by the Text template only
 * @returns where the caption goes, its tone, and its rows from top to bottom
 */
export const buildCaption = (
  template: FrameTemplate,
  info: FrameInfo,
  own: readonly string[] = [],
  hasImage = false,
): CaptionBlock => {
  const oneLine = join(own, ' · ');
  switch (template) {
    case 'label': {
      const camera = info.camera ? `Shot on ${info.camera}` : '';
      const values = join(exposure(info), ' ');
      // The user's line goes at the bottom of the right column. With a look already there the
      // column is three deep, so the exposure moves up a row and the left column stays level
      // with the lower two.
      const rows: CaptionRow[] =
        oneLine && info.look
          ? [
              ...sides('', values, true),
              { kind: 'sides', left: camera, right: info.look, strong: true, rightStrong: false },
              ...sides(info.lens, oneLine, false),
            ]
          : [...sides(camera, values, true), ...sides(info.lens, info.look || oneLine, false)];
      return { placement: 'below', tone: 'paper', rows };
    }
    case 'center':
    case 'overlay':
      return {
        placement: template === 'overlay' ? 'over' : 'below',
        tone: template === 'overlay' ? 'light' : 'paper',
        rows: [
          ...text(join([info.camera, info.lens], ' · '), true),
          ...text(join([...exposure(info), info.look], ' · '), false),
          ...(template === 'center'
            ? own.flatMap(line => text(line, false))
            : text(oneLine, false)),
        ],
      };
    case 'bar': {
      const cells = [info.aperture, info.shutter, info.iso, info.focal].filter(Boolean);
      return {
        placement: 'below',
        tone: 'paper',
        rows: cells.length > 0 ? [{ kind: 'cells', cells }] : [],
      };
    }
    case 'stamp': {
      // Two columns that both sit on the bottom edge: what and when on the left, the exposure
      // read-out on the right. The shorter column is padded at the top, not the bottom.
      const left = [info.date, info.camera, info.lens].filter(Boolean);
      const right = [info.aperture, info.shutter, info.iso, oneLine].filter(Boolean);
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
    case 'film': {
      const edge = sides(
        (info.look || info.camera).toUpperCase(),
        join(exposure(info), '  ').toUpperCase(),
        false,
      );
      // The first row is printed on the lower strip and the second on the upper one, so the
      // user's line keeps the second place even when there is no shooting info to print.
      const upper = sides('', oneLine.toUpperCase(), false);
      const lower: CaptionRow[] =
        edge.length > 0 || upper.length === 0
          ? edge
          : [{ kind: 'sides', left: '', right: '', strong: false }];
      return { placement: 'strip', tone: 'amber', rows: [...lower, ...upper] };
    }
    case 'text': {
      const [first = '', second = ''] = own;
      return {
        placement: 'below',
        tone: 'paper',
        rows: [
          ...(first || hasImage ? [{ kind: 'mark' as const, text: first, image: hasImage }] : []),
          ...text(second, false),
        ],
      };
    }
  }
};

// Row heights on a 1080-wide canvas. A strong row plus a quiet one is the classic 74-high caption.
const STRONG_ROW = 34;
const QUIET_ROW = 28;
const ROW_GAP = 12;

/** Side of the square the user's image is fitted into, on a 1080-wide canvas. */
export const MARK_IMAGE = 64;

/**
 * Height of one caption row before text scaling.
 * @param row the row to measure
 * @returns its height on a 1080-wide canvas
 */
export const rowHeight = (row: CaptionRow) => {
  if (row.kind === 'mark') return row.image ? MARK_IMAGE : STRONG_ROW;
  return row.kind === 'cells' || row.strong ? STRONG_ROW : QUIET_ROW;
};

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
