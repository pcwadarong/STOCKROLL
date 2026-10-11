import type { ReactNode } from 'react';

import { labelTitle } from './label.css';
import * as css from './Panel.css';

type PanelProps = {
  /** Heading of the panel, set as a label above a rule. */
  title: string;
  /** Optional control shown at the right end of the heading row. */
  action?: ReactNode;
  children: ReactNode;
};

/**
 * Titled paper card: the standard container for a list, a form or a notice.
 * @param props title, optional heading action and the panel's content
 */
export const Panel = ({ title, action, children }: PanelProps) => (
  <section className={css.root}>
    <div className={css.header}>
      <h2 className={labelTitle}>{title}</h2>
      {action}
    </div>
    {children}
  </section>
);
