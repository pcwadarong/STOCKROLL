import { HStack } from '@seed-design/react';

import { Chip } from 'seed-design/ui/chip';
import { SegmentedControl, SegmentedControlItem } from 'seed-design/ui/segmented-control';

type OptionsProps<T extends string | number> = {
  /** What is being chosen, for assistive technology. The visible name is the `Control` around it. */
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Shows the choice without letting it change, such as one that has no effect right now. */
  disabled?: boolean;
};

// SEED hands the picked value back as text; this finds the option it stands for.
const pick =
  <T extends string | number>(options: readonly { value: T }[], apply: (value: T) => void) =>
  (picked: string) => {
    const match = options.find(option => String(option.value) === picked);
    if (match) apply(match.value);
  };

/**
 * One choice out of a few, as a row of segments. For up to about four short options: more of
 * them overflow a narrow panel — use `Chips` there.
 * @param props what is chosen, the current value, the options and the change handler
 */
export const Segments = <T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: OptionsProps<T>) => (
  <SegmentedControl
    aria-label={label}
    disabled={disabled}
    value={String(value)}
    onValueChange={pick(options, onChange)}
  >
    {options.map(item => (
      <SegmentedControlItem key={item.value} value={String(item.value)}>
        {item.label}
      </SegmentedControlItem>
    ))}
  </SegmentedControl>
);

/**
 * One choice out of several, as chips that wrap onto as many lines as they need.
 * @param props what is chosen, the current value, the options and the change handler
 */
export const Chips = <T extends string | number>({
  label,
  value,
  options,
  onChange,
}: OptionsProps<T>) => (
  <Chip.RadioRoot aria-label={label} value={String(value)} onValueChange={pick(options, onChange)}>
    <HStack gap="x2" wrap>
      {options.map(item => (
        <Chip.RadioItem key={item.value} value={String(item.value)}>
          <Chip.Label>{item.label}</Chip.Label>
        </Chip.RadioItem>
      ))}
    </HStack>
  </Chip.RadioRoot>
);
