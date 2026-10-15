import type { Scale } from './field-value';

/** Describes one editable field of a record so forms can be generated from data. */
export type RecordField = {
  key: string;
  label: string;
  /**
   * `select` and `segmented` need `options`; `segmented` shows them side by side, for a few
   * short ones. `scale` needs `scale` and is a slider. Both still store text, and a stored value
   * they cannot show is kept and edited as text. `number` stores a number or null. `multiline`
   * is text that may run over several lines, such as a note.
   */
  type: 'text' | 'multiline' | 'number' | 'select' | 'segmented' | 'scale';
  options?: readonly { value: string; label: string }[];
  scale?: Scale;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  /** Heading this field is listed under. Consecutive fields with the same group form a section. */
  group?: string;
};

/**
 * The free-text note every kind of record carries: one definition, so each form asks for it the
 * same way and screens can tell it apart from the one-line facts.
 */
export const NOTE_FIELD: RecordField = { key: 'note', label: 'Note', type: 'multiline' };

export type RecordValues = Record<string, string | number | boolean | null | undefined>;

/**
 * Turns raw form values into values safe to store: trims text, converts blanks to null and
 * numeric fields to numbers. Nothing is filled in for fields left empty.
 * @param fields field definitions
 * @param values raw values from the form
 * @returns normalized values, limited to the defined fields
 */
export const normalizeRecord = (fields: readonly RecordField[], values: RecordValues) =>
  Object.fromEntries(
    fields.map(({ key, type }) => {
      const raw = values[key];
      const text = typeof raw === 'string' ? raw.trim() : raw;
      if (text === '' || text === undefined || text === null) return [key, null];
      if (type === 'number') {
        const parsed = Number(text);
        return [key, Number.isFinite(parsed) ? parsed : null];
      }
      return [key, text];
    }),
  ) as RecordValues;

/**
 * Lists the labels of required fields that are still empty.
 * @param fields field definitions
 * @param values normalized values
 * @returns labels of missing required fields
 */
export const missingRequired = (fields: readonly RecordField[], values: RecordValues) =>
  fields.filter(field => field.required && values[field.key] === null).map(field => field.label);
