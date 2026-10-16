import { type KeyboardEvent, type PointerEvent, useId, useState } from 'react';

import {
  FUJI_WHITE_BALANCE_CHOICES,
  KELVIN,
  kelvinText,
  readShift,
  readWhiteBalance,
  SHIFT_CELLS,
  shiftAt,
  shiftChanges,
  shiftLabel,
  shiftPosition,
  stepShift,
  SYSTEMS,
  WB_SHIFT,
} from '@/entities/recipe';
import { formatSigned, readOption, scaleText } from '@/shared/lib/field-value';
import type { RecordValues } from '@/shared/lib/record-field';
import { Segments } from '@/shared/ui/Options';
import { PickField } from '@/shared/ui/PickField';
import type { FieldControl, FieldControlProps } from '@/shared/ui/RecordForm';
import { SettingField, TextFallback, useTextFallback } from '@/shared/ui/SettingField';
import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import * as css from './FujiControls.css';

const textOf = (values: RecordValues, key: string) => {
  const value = values[key];
  return value === null || value === undefined ? '' : String(value);
};

const optionsOf = (key: string) =>
  SYSTEMS.fujifilm.fields.find(field => field.key === key)?.options ?? [];

type RowProps = {
  label: string;
  /** Names the row for assistive technology, with the setting it belongs to. */
  fullLabel: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

/** One line of a two-line setting: a short name, then segments, or text for a value they lack. */
const SegmentRow = ({ label, fullLabel, value, options, onChange, disabled }: RowProps) => {
  const reading = readOption(
    value,
    options.map(option => option.value),
  );
  const { asText, focusProps } = useTextFallback(reading.kind !== 'other');
  const rowId = useId();
  return (
    <div className={css.row}>
      <span id={rowId} className={css.rowLabel}>
        {label}
      </span>
      {asText ? (
        <div {...focusProps}>
          <TextFallback
            labelledBy={rowId}
            value={value}
            onChange={onChange}
            takes={`The buttons offer ${options.map(option => option.label).join(', ')}.`}
          />
        </div>
      ) : (
        <Segments
          label={fullLabel}
          value={reading.kind === 'value' ? reading.value : ''}
          options={options}
          onChange={onChange}
          disabled={disabled}
        />
      )}
    </div>
  );
};

/** Grain strength and size, as the camera shows them: two lines under one name. */
const FujiGrain = ({ values, onChange, notes }: FieldControlProps) => {
  const strength = textOf(values, 'grainStrength');
  const size = textOf(values, 'grainSize');
  const filled = Boolean(strength.trim() || size.trim());
  return (
    <SettingField
      label="Grain effect"
      shown={[strength.trim(), size.trim()].filter(Boolean).join(', ')}
      filled={filled}
      onClear={() => {
        onChange('grainStrength', '');
        onChange('grainSize', '');
      }}
      notes={notes}
    >
      {() => (
        <div className={css.rows}>
          <SegmentRow
            label="Strength"
            fullLabel="Grain effect strength"
            value={strength}
            options={optionsOf('grainStrength')}
            onChange={value => onChange('grainStrength', value)}
          />
          {/* With grain off the size does nothing, but it is kept for when grain is turned on. */}
          <SegmentRow
            label="Size"
            fullLabel="Grain effect size"
            value={size}
            options={optionsOf('grainSize')}
            onChange={value => onChange('grainSize', value)}
            disabled={strength.trim() === 'Off'}
          />
        </div>
      )}
    </SettingField>
  );
};

// The picker's entry for a color temperature. Never stored: the temperature itself is.
const KELVIN_CHOICE = 'kelvin';
const WHITE_BALANCE_OPTIONS = FUJI_WHITE_BALANCE_CHOICES.flatMap(value => [
  { value, label: value },
  ...(value === 'Custom 3' ? [{ value: KELVIN_CHOICE, label: 'Color temperature (K)' }] : []),
]);

/** White balance: a setting from the camera's list, or a color temperature typed in kelvin. */
const FujiWhiteBalance = ({ values, onChange, notes }: FieldControlProps) => {
  const value = textOf(values, 'whiteBalance');
  const reading = readWhiteBalance(value);
  // Picked "Color temperature" but no number typed yet: nothing to store, but the box stays.
  const [typingKelvin, setTypingKelvin] = useState(false);
  const { asText, focusProps } = useTextFallback(reading.kind !== 'other');
  const set = (next: string) => onChange('whiteBalance', next);
  const kelvin = reading.kind === 'kelvin' || (reading.kind === 'empty' && typingKelvin);

  return (
    <SettingField
      label="White balance"
      shown={asText ? undefined : value.trim()}
      filled={reading.kind !== 'empty'}
      onClear={() => {
        setTypingKelvin(false);
        set('');
      }}
      notes={notes}
    >
      {labelId =>
        asText ? (
          <div {...focusProps}>
            <TextFallback
              labelledBy={labelId}
              value={value}
              onChange={set}
              takes="The list offers the camera's settings or a temperature in K."
            />
          </div>
        ) : (
          <div className={css.rows}>
            <PickField
              label="White balance setting"
              hideLabel
              value={kelvin ? KELVIN_CHOICE : reading.kind === 'preset' ? reading.value : ''}
              options={WHITE_BALANCE_OPTIONS}
              onChange={next => {
                setTypingKelvin(next === KELVIN_CHOICE);
                if (next === KELVIN_CHOICE) {
                  if (reading.kind !== 'kelvin') set('');
                } else set(next);
              }}
            />
            {kelvin && (
              <TextField
                value={reading.kind === 'kelvin' ? String(reading.kelvin) : ''}
                suffix="K"
                invalid={reading.kind === 'kelvin' && !reading.usual}
                description={`${KELVIN.min} to ${KELVIN.max} K, in steps of ${KELVIN.step}.`}
                onValueChange={({ value: digits }) => {
                  setTypingKelvin(true);
                  set(kelvinText(digits));
                }}
              >
                <TextFieldInput aria-label="Color temperature in kelvin" inputMode="numeric" />
              </TextField>
            )}
          </div>
        )
      }
    </SettingField>
  );
};

/**
 * White balance shift as the camera shows it: one grid, red across (more to the right) and blue
 * up (more toward the top). Tap or drag to place the point; arrow keys move it a step.
 */
const FujiWbShift = ({ values, onChange, notes }: FieldControlProps) => {
  const r = textOf(values, 'wbShiftR');
  const b = textOf(values, 'wbShiftB');
  const reading = readShift(r, b);
  const { asText, focusProps } = useTextFallback(reading.kind !== 'other');
  const point = reading.kind === 'value' ? reading.value : undefined;
  const filled = Boolean(r.trim() || b.trim());

  const pick = (next: { r: number; b: number }) => {
    for (const [key, value] of Object.entries(shiftChanges({ wbShiftR: r, wbShiftB: b }, next)))
      onChange(key, value);
  };
  const pickAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    pick(shiftAt((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height));
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = stepShift(point ?? { r: 0, b: 0 }, event.key);
    if (!next) return;
    event.preventDefault();
    pick(next);
  };

  const part = (axis: string, text: string) =>
    reading.kind === 'value' && text.trim()
      ? `${axis} ${formatSigned(Number(text))}`
      : `${axis} not set`;
  const at = point && shiftPosition(point);

  return (
    <SettingField
      label="WB shift"
      shown={asText ? undefined : `${part('R', r)} · ${part('B', b)}`}
      filled={filled}
      onClear={() => {
        onChange('wbShiftR', '');
        onChange('wbShiftB', '');
      }}
      notes={notes}
    >
      {labelId =>
        asText ? (
          <div className={css.rows} {...focusProps}>
            {(
              [
                ['wbShiftR', 'R', r],
                ['wbShiftB', 'B', b],
              ] as const
            ).map(([key, axis, text]) => (
              <div key={key} className={css.row}>
                <span id={`${labelId}-${axis}`} className={css.rowLabel}>
                  {axis}
                </span>
                <TextFallback
                  labelledBy={`${labelId}-${axis}`}
                  value={text}
                  onChange={value => onChange(key, value)}
                  takes={`The grid takes ${scaleText(WB_SHIFT)} in whole steps.`}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={css.gridFrame}>
            <span className={css.axisTop} aria-hidden>
              B+
            </span>
            <span className={css.axisLeft} aria-hidden>
              R−
            </span>
            <div
              role="slider"
              tabIndex={0}
              aria-labelledby={labelId}
              aria-valuemin={WB_SHIFT.min}
              aria-valuemax={WB_SHIFT.max}
              aria-valuenow={point?.r}
              aria-valuetext={point ? shiftLabel(point) : 'Not set'}
              aria-describedby={`${labelId}-keys`}
              className={css.grid}
              // One dot per cell, at the cell's centre, where `shiftPosition` puts the point.
              style={{ backgroundSize: `calc(100% / ${SHIFT_CELLS}) calc(100% / ${SHIFT_CELLS})` }}
              onPointerDown={event => {
                event.currentTarget.setPointerCapture(event.pointerId);
                pickAt(event);
              }}
              onPointerMove={event => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) pickAt(event);
              }}
              onKeyDown={keyDown}
            >
              {at && (
                <span
                  className={css.marker}
                  style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
                />
              )}
            </div>
            <span className={css.axisRight} aria-hidden>
              R+
            </span>
            <span className={css.axisBottom} aria-hidden>
              B−
            </span>
            <p id={`${labelId}-keys`} className={css.keys}>
              Left and right change red, up and down change blue.
            </p>
          </div>
        )
      }
    </SettingField>
  );
};

/**
 * Fujifilm settings the camera shows as one item though the recipe stores them as separate
 * fields or as one field with two forms, for `RecordForm`'s `controls`.
 */
export const FUJI_CONTROLS: readonly FieldControl[] = [
  { keys: ['grainStrength', 'grainSize'], render: props => <FujiGrain {...props} /> },
  { keys: ['whiteBalance'], render: props => <FujiWhiteBalance {...props} /> },
  { keys: ['wbShiftR', 'wbShiftB'], render: props => <FujiWbShift {...props} /> },
];
