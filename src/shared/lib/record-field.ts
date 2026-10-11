/** Describes one editable field of a record so forms can be generated from data. */
export type RecordField = {
  key: string;
  label: string;
  /** `select` needs `options`. `number` stores a number or null. */
  type: 'text' | 'number' | 'select';
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  hint?: string;
  /** Heading this field is listed under. Consecutive fields with the same group form a section. */
  group?: string;
};

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
