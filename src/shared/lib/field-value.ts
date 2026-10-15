/** The numbers a slider offers: from `min` to `max` in steps of `step`, counted from zero. */
export type Scale = { min: number; max: number; step: number };

/**
 * What a stored text value means to a control. `empty` is "not set", which is not the same as
 * zero. `other` is text the control cannot show — it is kept as written and edited as text.
 */
export type ValueReading<T> = { kind: 'empty' } | { kind: 'value'; value: T } | { kind: 'other' };

const PLAIN_NUMBER = /^[+-]?\d+(\.\d+)?$/;

/**
 * Tells whether text is a number and nothing else: "+1", "-1.5" and "1.0" are; "+ 1", "-1,5",
 * "5600K" and "1/3" are not.
 * @param text text to check
 * @returns true for a plain number
 */
export const isPlainNumber = (text: string) => PLAIN_NUMBER.test(text);

/**
 * Tells whether a number is one of the stops of a scale.
 * @param value number to check
 * @param scale the scale's range and step
 * @returns true when the value is within range and on a step
 */
export const onScale = (value: number, { min, max, step }: Scale) =>
  value >= min && value <= max && Math.abs(value / step - Math.round(value / step)) < 1e-9;

/**
 * Writes a number the way camera menus show a setting that runs either side of zero: positive
 * values carry a plus sign, zero carries none.
 * @param value number to write
 * @returns "+1.5", "0" or "-2"
 */
export const formatSigned = (value: number) => (value > 0 ? `+${value}` : String(value || 0));

/**
 * Writes a number for a scale: signed when the scale runs either side of zero, plain otherwise.
 * @param value number to write
 * @param scale the scale it belongs to
 * @returns the number as text
 */
export const formatScaleValue = (value: number, scale: Scale) =>
  scale.min < 0 ? formatSigned(value) : String(value);

/**
 * Describes a scale's range for a hint or a remark.
 * @param scale the scale
 * @returns text such as "-2 to +4"
 */
export const scaleText = (scale: Scale) =>
  `${formatScaleValue(scale.min, scale)} to ${formatScaleValue(scale.max, scale)}`;

/**
 * Reads stored text as a stop on a scale. Text with or without a sign or trailing zeros ("1",
 * "+1", "1.0") reads as the same stop. Anything else — out of range, off a step, words — is
 * `other`, so the control can leave it exactly as written.
 * @param text stored value
 * @param scale the scale the control offers
 * @returns what the text means to the control
 */
export const readScale = (text: string | undefined, scale: Scale): ValueReading<number> => {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return { kind: 'empty' };
  if (!isPlainNumber(trimmed)) return { kind: 'other' };
  const value = Number(trimmed);
  return onScale(value, scale) ? { kind: 'value', value } : { kind: 'other' };
};

/**
 * Reads stored text as one of a fixed list of values. Only an exact match counts: "weak" is not
 * "Weak", so a value the control did not write is never quietly rewritten.
 * @param text stored value
 * @param options the values the control offers
 * @returns what the text means to the control
 */
export const readOption = (
  text: string | undefined,
  options: readonly string[],
): ValueReading<string> => {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return { kind: 'empty' };
  return options.includes(trimmed) ? { kind: 'value', value: trimmed } : { kind: 'other' };
};
