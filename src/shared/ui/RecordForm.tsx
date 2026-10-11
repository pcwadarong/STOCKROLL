import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import type { RecordField, RecordValues } from '../lib/record-field';

import { PickField } from './PickField';

import * as css from './RecordForm.css';

type RecordFormProps = {
  fields: readonly RecordField[];
  values: RecordValues;
  onChange: (key: string, value: string) => void;
};

/**
 * Renders one input per field definition. Holds no state of its own.
 * @param props field definitions, current values and a change handler
 */
export const RecordForm = ({ fields, values, onChange }: RecordFormProps) => (
  <div className={css.root}>
    {fields.map(field => {
      const value = values[field.key];
      const text = value === null || value === undefined ? '' : String(value);

      if (field.type === 'select')
        return (
          <PickField
            key={field.key}
            label={field.label}
            indicator={field.required ? undefined : 'Optional'}
            description={field.hint}
            value={text}
            options={field.options ?? []}
            onChange={next => onChange(field.key, next)}
          />
        );

      return (
        <TextField
          key={field.key}
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
    })}
  </div>
);
