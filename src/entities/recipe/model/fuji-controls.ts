import { formatSigned, onScale, readScale, type Scale } from '@/shared/lib/field-value';

import { FUJI_RANGES, FUJI_WHITE_BALANCES } from './systems';

/**
 * White balance settings that are neither a preset nor a color temperature: measured ones. The
 * X-T50 manual lists Custom 1–3. Pasted text never fills these in; they are only picked.
 */
export const FUJI_CUSTOM_WHITE_BALANCES = ['Custom 1', 'Custom 2', 'Custom 3'] as const;

/**
 * Every white balance the picker lists by name, in the X-T50 menu's order (White Priority comes
 * before Auto there). The color temperature follows the custom settings in that menu.
 */
export const FUJI_WHITE_BALANCE_CHOICES: readonly string[] = [
  'Auto White Priority',
  'Auto',
  'Auto Ambience Priority',
  ...FUJI_CUSTOM_WHITE_BALANCES,
  ...FUJI_WHITE_BALANCES.slice(3),
];

/** Color temperatures the X-T50 offers: 2500 to 10000 K in steps of 10 K (manual). */
export const KELVIN: Scale = { min: 2500, max: 10000, step: 10 };

/** The R and B steps of the white balance shift grid. */
export const WB_SHIFT: Scale = FUJI_RANGES.wbShiftR!;

const KELVIN_TEXT = /^(\d+)\s*k$/i;

/**
 * What a stored white balance means to the picker: a listed setting, a color temperature, or text
 * it cannot show (kept as written).
 */
export type WhiteBalanceReading =
  | { kind: 'empty' }
  | { kind: 'preset'; value: string }
  | { kind: 'kelvin'; kelvin: number; usual: boolean }
  | { kind: 'other' };

/**
 * Reads a stored white balance. "5600K", "5600 K" and "5600k" are all color temperatures; the
 * number is shown and the text is left as it is until the number is edited.
 * @param text stored value
 * @returns what kind of white balance it is
 */
export const readWhiteBalance = (text: string | undefined): WhiteBalanceReading => {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return { kind: 'empty' };
  if (FUJI_WHITE_BALANCE_CHOICES.includes(trimmed)) return { kind: 'preset', value: trimmed };
  const kelvin = trimmed.match(KELVIN_TEXT);
  if (kelvin) {
    const value = Number(kelvin[1]);
    return { kind: 'kelvin', kelvin: value, usual: onScale(value, KELVIN) };
  }
  return { kind: 'other' };
};

/**
 * Writes a color temperature typed as digits the way white balance stores it.
 * @param digits what was typed in the Kelvin box
 * @returns "5600K", or empty when nothing was typed
 */
export const kelvinText = (digits: string) => {
  const number = digits.replace(/\D/g, '');
  return number ? `${Number(number)}K` : '';
};

/** A point on the shift grid. `r` grows to the right, `b` grows upward, as on the camera. */
export type Shift = { r: number; b: number };

/**
 * Reads the stored R and B shift as a point on the grid. A shift with only one of the two set
 * still shows; the other counts as 0 for where the point sits.
 * @param r stored red shift
 * @param b stored blue shift
 * @returns the point, `empty` when neither is set, or `other` when either cannot be shown
 */
export const readShift = (r: string | undefined, b: string | undefined) => {
  const red = readScale(r, WB_SHIFT);
  const blue = readScale(b, WB_SHIFT);
  if (red.kind === 'other' || blue.kind === 'other') return { kind: 'other' } as const;
  if (red.kind === 'empty' && blue.kind === 'empty') return { kind: 'empty' } as const;
  return {
    kind: 'value',
    value: {
      r: red.kind === 'value' ? red.value : 0,
      b: blue.kind === 'value' ? blue.value : 0,
    },
  } as const;
};

const clampStep = (value: number) =>
  Math.min(WB_SHIFT.max, Math.max(WB_SHIFT.min, Math.round(value)));

/**
 * Finds the grid point under a pointer.
 * @param x pointer position across the grid, 0 at the left edge and 1 at the right
 * @param y pointer position down the grid, 0 at the top and 1 at the bottom
 * @returns the nearest point, kept within the grid
 */
export const shiftAt = (x: number, y: number): Shift => {
  const span = WB_SHIFT.max - WB_SHIFT.min;
  return {
    r: clampStep(WB_SHIFT.min + x * span),
    b: clampStep(WB_SHIFT.max - y * span),
  };
};

/**
 * Places a grid point for drawing.
 * @param shift the point
 * @returns its position as fractions of the grid's width (from the left) and height (from the top)
 */
export const shiftPosition = ({ r, b }: Shift) => {
  const span = WB_SHIFT.max - WB_SHIFT.min;
  return { x: (r - WB_SHIFT.min) / span, y: (WB_SHIFT.max - b) / span };
};

/**
 * Moves a grid point one step with an arrow key: left and right change red, up and down change
 * blue. The point stops at the edge.
 * @param shift the point
 * @param key the key pressed
 * @returns the moved point, or undefined for a key that does not move it
 */
export const stepShift = (shift: Shift, key: string): Shift | undefined => {
  const moves: Record<string, Shift> = {
    ArrowRight: { r: 1, b: 0 },
    ArrowLeft: { r: -1, b: 0 },
    ArrowUp: { r: 0, b: 1 },
    ArrowDown: { r: 0, b: -1 },
  };
  const move = moves[key];
  return move && { r: clampStep(shift.r + move.r), b: clampStep(shift.b + move.b) };
};

/**
 * Works out what to store when a point is picked on the grid. An axis that was set and did not
 * move keeps its text exactly as stored ("3" stays "3"); one that moved, or was not set, is
 * written signed.
 * @param stored the stored `wbShiftR` and `wbShiftB` text
 * @param next the picked point
 * @returns only the fields to change
 */
export const shiftChanges = (
  stored: { wbShiftR?: string; wbShiftB?: string },
  next: Shift,
): Partial<Record<'wbShiftR' | 'wbShiftB', string>> =>
  Object.fromEntries(
    (
      [
        ['wbShiftR', next.r],
        ['wbShiftB', next.b],
      ] as const
    ).flatMap(([key, value]) => {
      const now = readScale(stored[key], WB_SHIFT);
      return now.kind === 'value' && now.value === value ? [] : [[key, formatSigned(value)]];
    }),
  );

const spoken = (value: number) => (value < 0 ? `−${-value}` : formatSigned(value));

/**
 * Says a grid point the way a screen reader should announce it.
 * @param shift the point
 * @returns text such as "Red +3, Blue −2"
 */
export const shiftLabel = ({ r, b }: Shift) => `Red ${spoken(r)}, Blue ${spoken(b)}`;
