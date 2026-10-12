import { Link } from 'react-router';

import * as css from './LibraryPage.css';

/** One thing that can be done from a detail screen. */
export type ActionItem = {
  label: string;
  /** What it does, in a few words, so the choice needs no separate explanation. */
  hint?: string;
  /** In-app path it leads to. Give either this or `onSelect`. */
  to?: string;
  onSelect?: () => void;
  /** Shown but not usable, with the hint saying why. */
  disabled?: boolean;
  /** `danger` sets the label in red, for deleting. */
  tone?: 'danger';
};

/**
 * A quiet list of actions: a label and a line of explanation per row, instead of a row of
 * buttons with a paragraph under them.
 * @param props the actions, in order
 */
export const ActionList = ({ items }: { items: readonly ActionItem[] }) => (
  <ul className={css.actionList}>
    {items.map(({ label, hint, to, onSelect, disabled, tone }) => {
      const body = (
        <>
          <span className={tone === 'danger' ? css.actionDanger : css.actionLabel}>{label}</span>
          {hint && <span className={css.actionHint}>{hint}</span>}
        </>
      );
      return (
        <li key={label}>
          {to && !disabled ? (
            <Link to={to} className={css.actionRow}>
              {body}
            </Link>
          ) : (
            <button type="button" className={css.actionRow} disabled={disabled} onClick={onSelect}>
              {body}
            </button>
          )}
        </li>
      );
    })}
  </ul>
);
