import { type FocusEvent, type ReactNode, useId, useRef, useState } from 'react';

import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import { Button } from './Button';

import * as css from './SettingField.css';

const FOCUSABLE =
  '[role="slider"], input:not([type="hidden"]):not(:disabled), button:not(:disabled):not([aria-label^="Clear"])';

/** A short remark under a field. */
export type FieldNote = { text: string; tone: 'alert' | 'done' };

type SettingFieldProps = {
  label: string;
  /** The value as it reads, or undefined while nothing is set. Not shown while editing as text. */
  shown?: string;
  /** Whether anything is stored, so it can be cleared. */
  filled: boolean;
  /** Empties the setting back to "not set". */
  onClear: () => void;
  /** Remarks shown under the control, in order. */
  notes?: readonly FieldNote[];
  /** The control. Receives the id of the visible label, to name itself by. */
  children: (labelId: string) => ReactNode;
};

/**
 * One setting picked with a control rather than typed: its name, what it is set to (or "Not set"
 * — which is different from zero), a button that clears it, the control, and remarks under it.
 * @param props the setting's name, its value as it reads, the clear handler, notes and control
 */
export const SettingField = ({
  label,
  shown,
  filled,
  onClear,
  notes = [],
  children,
}: SettingFieldProps) => {
  const labelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const clear = () => {
    onClear();
    // Clear turns itself off, which would drop keyboard focus onto the page: hand it to the
    // control instead.
    requestAnimationFrame(() =>
      rootRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true }),
    );
  };
  return (
    <div ref={rootRef} role="group" aria-labelledby={labelId} className={css.root}>
      <div className={css.head}>
        <span id={labelId} className={css.label}>
          {label}
        </span>
        {shown !== undefined && (
          <span className={filled ? css.value : css.unset}>{filled ? shown : 'Not set'}</span>
        )}
        <Button
          variant="plain"
          className={css.clear}
          disabled={!filled}
          aria-label={`Clear ${label}`}
          onClick={clear}
        >
          Clear
        </Button>
      </div>
      {children(labelId)}
      {notes.map(note => (
        <p key={note.text} className={css.note[note.tone]}>
          {note.text}
        </p>
      ))}
    </div>
  );
};

/**
 * Keeps a control in its text form while the text is being edited, and while the stored value is
 * one the control cannot show. Without the first, typing a value the control can show would swap
 * the input out from under the caret.
 * @param fits whether the control can show the stored value
 * @returns whether to show text, and focus handlers for the element around the text inputs
 */
export const useTextFallback = (fits: boolean) => {
  const [editing, setEditing] = useState(false);
  return {
    asText: !fits || editing,
    focusProps: {
      onFocus: () => setEditing(true),
      // Moving between two inputs of the same setting is still editing it.
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setEditing(false);
      },
    },
  };
};

type TextFallbackProps = {
  /** Id of the label that names the input. */
  labelledBy: string;
  value: string;
  onChange: (value: string) => void;
  /** What the control takes, for the line under the input. */
  takes: string;
  placeholder?: string;
};

/**
 * The text input a control falls back to for a value it cannot show, so the value is kept as
 * written and can still be corrected.
 * @param props the label id, the text, the change handler and what the control would take
 */
export const TextFallback = ({
  labelledBy,
  value,
  onChange,
  takes,
  placeholder,
}: TextFallbackProps) => (
  <TextField
    value={value}
    description={`Kept as written. ${takes}`}
    onValueChange={({ value: next }) => onChange(next)}
  >
    <TextFieldInput aria-labelledby={labelledBy} placeholder={placeholder} />
  </TextField>
);
