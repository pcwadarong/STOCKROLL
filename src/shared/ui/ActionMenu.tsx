import { useNavigate } from 'react-router';

import {
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from 'seed-design/ui/menu';

import * as css from './ActionMenu.css';
import * as button from './Button.css';

/** One entry of an action menu. */
export type ActionMenuItem = {
  label: string;
  /** What it does, in a few words, shown under the label. */
  hint?: string;
  /** In-app path the entry leads to. Give either this or `onSelect`. */
  to?: string;
  onSelect?: () => void;
  /** Shown but not usable, with the hint saying why. */
  disabled?: boolean;
  /** `danger` sets the entry in red, for deleting. */
  tone?: 'danger';
  /** Marks the entry that is currently in effect, such as the version on screen. */
  current?: boolean;
};

type ActionMenuProps = {
  /** Text on the button that opens the menu. */
  label: string;
  /** Look of the button: `primary` red, `green`, or the outlined `secondary`. */
  variant?: 'primary' | 'green' | 'secondary';
  /** Small heading inside the menu, above the entries. */
  heading?: string;
  items: readonly ActionMenuItem[];
};

/**
 * A button that opens a list of actions, each with a line saying what it does. Use it where a
 * screen offers several things to do with one record: the choices stay one tap away without a
 * row of buttons.
 * @param props the button's label and look, an optional heading, and the entries
 */
export const ActionMenu = ({ label, variant = 'secondary', heading, items }: ActionMenuProps) => {
  const navigate = useNavigate();
  return (
    <MenuRoot placement="bottom-end">
      <MenuTrigger asChild>
        <button type="button" className={`${button.variant[variant]} ${button.size.small}`}>
          {label}
          <span className={css.caret} aria-hidden="true">
            ▾
          </span>
        </button>
      </MenuTrigger>
      <MenuContent>
        <MenuGroup>
          {heading && <MenuGroupLabel>{heading}</MenuGroupLabel>}
          {items.map(({ label: name, hint, to, onSelect, disabled, tone, current }) => (
            <MenuItem
              key={name}
              label={current ? `${name} ✓` : name}
              description={hint}
              disabled={disabled}
              tone={tone === 'danger' ? 'critical' : undefined}
              aria-current={current ? 'true' : undefined}
              onClick={() => (to ? void navigate(to) : onSelect?.())}
            />
          ))}
        </MenuGroup>
      </MenuContent>
    </MenuRoot>
  );
};
