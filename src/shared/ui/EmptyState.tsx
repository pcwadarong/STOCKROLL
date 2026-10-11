import type { ReactNode } from 'react';

import * as css from './EmptyState.css';

type EmptyStateProps = {
  /** Short statement of what is missing, set in the display face. */
  title: string;
  /** One or two sentences on what to do about it. */
  children: ReactNode;
  /** Optional button or buttons that resolve the empty state. */
  action?: ReactNode;
};

/**
 * Notice shown where content would be: what is missing, why, and what to do next.
 * @param props title, explanatory text and an optional action
 */
export const EmptyState = ({ title, children, action }: EmptyStateProps) => (
  // A status region: when this replaces or is replaced by content (loading → form, loading →
  // not found), screen readers announce the change.
  <div className={css.root} role="status">
    <p className={css.title}>{title}</p>
    <p className={css.body}>{children}</p>
    {action}
  </div>
);
