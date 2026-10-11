import { Button } from './Button';

import * as css from './FilterChips.css';
import { labelText } from './label.css';

type FilterChipsProps<T extends string> = {
  /** What the chips narrow by. Shown before them when `showLabel` is set, always read aloud. */
  label: string;
  showLabel?: boolean;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * One row of toggle chips that narrows a list by a single fact. Exactly one chip is pressed.
 * @param props group label, options, the pressed value and its setter
 */
export const FilterChips = <T extends string>({
  label,
  showLabel = false,
  options,
  value,
  onChange,
}: FilterChipsProps<T>) => (
  <div className={css.group} role="group" aria-label={label}>
    {showLabel && (
      <span className={`${labelText} ${css.label}`} aria-hidden="true">
        {label}
      </span>
    )}
    {options.map(option => (
      <Button
        key={option.value}
        size="small"
        pressed={value === option.value}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </Button>
    ))}
  </div>
);
