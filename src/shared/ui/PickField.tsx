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
  /** `medium` is the lower control used in dense panels and filter bars; forms use `large`. */
  size?: 'large' | 'medium';
  /**
   * Drops the label line: the placeholder names the control until something is picked, which
   * keeps a row of filters one line tall. The label still names it for assistive tech.
   */
  hideLabel?: boolean;
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
  size = 'large',
  hideLabel = false,
}: PickFieldProps) => {
  const items = (
    <SelectContent>
      <SelectGroup>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value} label={option.label} />
        ))}
      </SelectGroup>
    </SelectContent>
  );
  const select = {
    value: value ? [value] : [],
    onValueChange: ([next]: string[]) => onChange(next ?? ''),
  };

  if (hideLabel)
    return (
      <SelectRoot {...select}>
        <SelectTrigger placeholder={placeholder} size={size} aria-label={label} />
        {items}
      </SelectRoot>
    );

  return (
    <SelectRoot label={label} indicator={indicator} description={description} {...select}>
      <SelectTrigger placeholder={placeholder} size={size} />
      {items}
    </SelectRoot>
  );
};
