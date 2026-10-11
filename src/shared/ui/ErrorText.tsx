import * as css from './ErrorText.css';

/**
 * Inline error message: plain colored text announced to screen readers, with no filled box.
 * @param props the message to show
 */
export const ErrorText = ({ children }: { children: string }) => (
  <p role="alert" className={css.root}>
    {children}
  </p>
);
