import { Fragment, type ReactNode } from 'react';

import { Slider } from 'seed-design/ui/slider';
import { TextField, TextFieldInput, TextFieldTextarea } from 'seed-design/ui/text-field';

import { formatScaleValue, readOption, readScale, type Scale, scaleText } from '../lib/field-value';
import type { RecordField, RecordValues } from '../lib/record-field';

import { Segments } from './Options';
import { PickField } from './PickField';
import { type FieldNote, SettingField, TextFallback, useTextFallback } from './SettingField';

import { labelTitle } from './label.css';
import * as css from './RecordForm.css';

export type { FieldNote } from './SettingField';

/** What a control drawn for several fields at once is given. */
export type FieldControlProps = {
  values: RecordValues;
  onChange: (key: string, value: string) => void;
  /** Remarks for the fields it draws, already named by field where it draws more than one. */
  notes: readonly FieldNote[];
};

/**
 * One control that stands in for several consecutive fields of the form, such as a grid that sets
 * two values. It is drawn where the first of its fields would be.
 */
export type FieldControl = {
  keys: readonly string[];
  render: (props: FieldControlProps) => ReactNode;
};

type RecordFormProps = {
  fields: readonly RecordField[];
  values: RecordValues;
  onChange: (key: string, value: string) => void;
  /**
   * A remark per field key, shown under that field: `alert` in red for a value that needs a
   * second look before saving, `done` in green for one that was filled in for the user.
   */
  notes?: Readonly<Record<string, FieldNote>>;
  /** Controls that draw several fields together, in place of the fields' own inputs. */
  controls?: readonly FieldControl[];
};

const textOf = (value: RecordValues[string]) =>
  value === null || value === undefined ? '' : String(value);

type PickedProps = {
  field: RecordField;
  value: string;
  onChange: (value: string) => void;
  notes: readonly FieldNote[];
};

/** A field picked from a few options side by side; other text stays text. */
const SegmentedField = ({ field, value, onChange, notes }: PickedProps) => {
  const options = field.options ?? [];
  const reading = readOption(
    value,
    options.map(option => option.value),
  );
  const { asText, focusProps } = useTextFallback(reading.kind !== 'other');
  return (
    <SettingField
      label={field.label}
      shown={asText ? undefined : value.trim()}
      filled={reading.kind !== 'empty'}
      onClear={() => onChange('')}
      notes={notes}
    >
      {labelId =>
        asText ? (
          <div {...focusProps}>
            <TextFallback
              labelledBy={labelId}
              value={value}
              onChange={onChange}
              takes={`The buttons offer ${options.map(option => option.label).join(', ')}.`}
            />
          </div>
        ) : (
          <Segments
            label={field.label}
            value={reading.kind === 'value' ? reading.value : ''}
            options={options}
            onChange={onChange}
          />
        )
      }
    </SettingField>
  );
};

type ScaleSliderProps = {
  label: string;
  scale: Scale;
  value: string;
  onChange: (value: string) => void;
};

/**
 * A slider over a scale that can also be "not set". Unset, the thumb rests faded at zero and the
 * filled track is hidden; a tap, a drag or an arrow key sets it.
 */
const ScaleSlider = ({ label, scale, value, onChange }: ScaleSliderProps) => {
  const reading = readScale(value, scale);
  const unset = reading.kind !== 'value';
  const rest = Math.min(scale.max, Math.max(scale.min, 0));
  const format = (number: number) => formatScaleValue(number, scale);
  const write = (number: number | undefined) => {
    if (number !== undefined) onChange(format(number));
  };
  const marks = [...new Set([scale.min, rest, scale.max])];
  return (
    <div
      data-unset={unset || undefined}
      // A tap on the faded thumb changes nothing, so the slider reports nothing; the tap itself
      // says the resting value was meant. A tap anywhere else on the track reports a change.
      onPointerUp={event => {
        if (unset && (event.target as Element).closest('[role="slider"]')) write(rest);
      }}
    >
      <Slider
        min={scale.min}
        max={scale.max}
        step={scale.step}
        values={[reading.kind === 'value' ? reading.value : rest]}
        onValuesChange={([next]) => write(next)}
        hideRange={unset}
        markers={marks.map(mark => ({ value: mark, label: format(mark) }))}
        getAriaLabel={() => label}
        getAriaValuetext={number => (unset ? 'Not set' : format(number))}
        getValueIndicatorLabel={({ value: number }) => format(number)}
      />
    </div>
  );
};

/** A numeric field set with a slider; a value the slider does not have stays text. */
const ScaleField = ({ field, value, onChange, notes }: PickedProps) => {
  const scale = field.scale!;
  const reading = readScale(value, scale);
  const { asText, focusProps } = useTextFallback(reading.kind !== 'other');
  return (
    <SettingField
      label={field.label}
      shown={
        asText ? undefined : reading.kind === 'value' ? formatScaleValue(reading.value, scale) : ''
      }
      filled={reading.kind !== 'empty'}
      onClear={() => onChange('')}
      notes={notes}
    >
      {labelId =>
        asText ? (
          <div {...focusProps}>
            <TextFallback
              labelledBy={labelId}
              value={value}
              onChange={onChange}
              takes={`The slider takes ${scaleText(scale)} in steps of ${scale.step}.`}
            />
          </div>
        ) : (
          <ScaleSlider label={field.label} scale={scale} value={value} onChange={onChange} />
        )
      }
    </SettingField>
  );
};

/**
 * Renders one input per field definition, with a heading above each group of fields.
 * Holds no state of its own.
 * @param props field definitions, current values, a change handler, optional per-field notes and
 *   optional controls that draw several fields together
 */
export const RecordForm = ({ fields, values, onChange, notes, controls = [] }: RecordFormProps) => (
  <div className={css.root}>
    {fields.map((field, index) => {
      const text = textOf(values[field.key]);
      // A heading opens each run of fields that share a group.
      const startsGroup = field.group !== undefined && field.group !== fields[index - 1]?.group;
      const heading = startsGroup && (
        <h4 className={`${labelTitle} ${css.heading}`}>{field.group}</h4>
      );
      const note = notes?.[field.key];
      const change = (next: string) => onChange(field.key, next);

      const shared = controls.find(control => control.keys.includes(field.key));
      if (shared) {
        if (shared.keys[0] !== field.key)
          return heading && <Fragment key={field.key}>{heading}</Fragment>;
        // Where one control sets several fields, each remark says which field it is about.
        const named = shared.keys.flatMap(key => {
          const remark = notes?.[key];
          if (!remark) return [];
          const name = fields.find(item => item.key === key)?.label ?? key;
          return [shared.keys.length > 1 ? { ...remark, text: `${name}: ${remark.text}` } : remark];
        });
        return (
          <Fragment key={field.key}>
            {heading}
            {shared.render({ values, onChange, notes: named })}
          </Fragment>
        );
      }

      if (field.type === 'segmented' || field.type === 'scale') {
        const Picked = field.type === 'segmented' ? SegmentedField : ScaleField;
        return (
          <Fragment key={field.key}>
            {heading}
            <Picked field={field} value={text} onChange={change} notes={note ? [note] : []} />
          </Fragment>
        );
      }

      const control =
        field.type === 'select' ? (
          <PickField
            label={field.label}
            indicator={field.required ? undefined : 'Optional'}
            description={field.hint}
            value={text}
            options={field.options ?? []}
            onChange={change}
          />
        ) : (
          <TextField
            label={field.label}
            indicator={field.required ? undefined : 'Optional'}
            description={field.hint}
            value={text}
            onValueChange={({ value: next }) => change(next)}
          >
            {field.type === 'multiline' ? (
              <TextFieldTextarea placeholder={field.placeholder} autoresize />
            ) : (
              <TextFieldInput
                placeholder={field.placeholder}
                inputMode={field.type === 'number' ? 'numeric' : undefined}
              />
            )}
          </TextField>
        );

      return (
        <Fragment key={field.key}>
          {heading}
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
