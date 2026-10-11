import * as css from './PageHeader.css';

/**
 * Title block at the top of a screen: a display heading with an optional one-line lead.
 * @param props `title` is the screen's h1; `lead` says what the screen is for
 */
export const PageHeader = ({ title, lead }: { title: string; lead?: string }) => (
  <div className={css.root}>
    <h1 className={css.title}>{title}</h1>
    {lead && <p className={css.lead}>{lead}</p>}
  </div>
);
