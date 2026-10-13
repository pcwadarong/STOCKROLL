import { labelText } from './label.css';
import * as css from './NoteText.css';

/**
 * A record's note, shown whole under a small label with its line breaks kept.
 * @param props `children` is the note as the user wrote it
 */
export const NoteText = ({ children }: { children: string }) => (
  <p className={css.root}>
    <span className={`${labelText} ${css.label}`}>Note</span>
    {children}
  </p>
);
