import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectRoot,
  SelectTrigger,
} from 'seed-design/ui/select';

export type PickOption = { value: string; label: string };

type PickFieldProps = {
  label: string;
  /** Selected option value. An empty string means nothing is selected. */
  value: string;
  options: readonly PickOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  indicator?: string;
};

/**
 * Labeled dropdown for choosing one option.
 * @param props label, current value, options and change handler
 */
export const PickField = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  description,
  indicator,
}: PickFieldProps) => (
  <SelectRoot
    label={label}
    indicator={indicator}
    description={description}
    value={value ? [value] : []}
    onValueChange={([next]) => onChange(next ?? '')}
  >
    <SelectTrigger placeholder={placeholder} />
    <SelectContent>
      <SelectGroup>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value} label={option.label} />
        ))}
      </SelectGroup>
    </SelectContent>
  </SelectRoot>
);
