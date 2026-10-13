import { Fragment } from 'react';

import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import type { RecordField, RecordValues } from '../lib/record-field';

import { PickField } from './PickField';

import { labelTitle } from './label.css';
import * as css from './RecordForm.css';

/** A short remark under a field. */
export type FieldNote = { text: string; tone: 'alert' | 'done' };

type RecordFormProps = {
  fields: readonly RecordField[];
  values: RecordValues;
  onChange: (key: string, value: string) => void;
  /**
   * A remark per field key, shown under that field: `alert` in red for a value that needs a
   * second look before saving, `done` in green for one that was filled in for the user.
   */
  notes?: Readonly<Record<string, FieldNote>>;
};

/**
 * Renders one input per field definition, with a heading above each group of fields.
 * Holds no state of its own.
 * @param props field definitions, current values, a change handler and optional per-field notes
 */
export const RecordForm = ({ fields, values, onChange, notes }: RecordFormProps) => (
  <div className={css.root}>
    {fields.map((field, index) => {
      const value = values[field.key];
      const text = value === null || value === undefined ? '' : String(value);
      // A heading opens each run of fields that share a group.
      const startsGroup = field.group !== undefined && field.group !== fields[index - 1]?.group;

      const control =
        field.type === 'select' ? (
          <PickField
            label={field.label}
            indicator={field.required ? undefined : 'Optional'}
            description={field.hint}
            value={text}
            options={field.options ?? []}
            onChange={next => onChange(field.key, next)}
          />
        ) : (
          <TextField
            label={field.label}
            indicator={field.required ? undefined : 'Optional'}
            description={field.hint}
            value={text}
            onValueChange={({ value: next }) => onChange(field.key, next)}
          >
            <TextFieldInput
              placeholder={field.placeholder}
              inputMode={field.type === 'number' ? 'numeric' : undefined}
            />
          </TextField>
        );
      const note = notes?.[field.key];

      return (
        <Fragment key={field.key}>
          {startsGroup && <h4 className={`${labelTitle} ${css.heading}`}>{field.group}</h4>}
          {note ? (
            <div className={css.flagged}>
              {control}
              <p className={css.note[note.tone]}>{note.text}</p>
            </div>
          ) : (
            control
          )}
        </Fragment>
      );
    })}
  </div>
);
