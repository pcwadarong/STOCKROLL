import { useState } from 'react';

import {
  type ParsedRecipeText,
  parseRecipeText,
  type PasteFlag,
  type RecipeSystem,
} from '@/entities/recipe';
import { Button } from '@/shared/ui/Button';
import { TextField, TextFieldTextarea } from 'seed-design/ui/text-field';

import * as css from './LibraryPage.css';

/**
 * Says in a few words what to check about a pasted value, for the remark under its field.
 * @param flag what the reader flagged
 * @returns a short phrase naming the pasted text and what was made of it
 */
export const flagText = ({ kind, from, to }: PasteFlag) =>
  ({
    value: `“${from}” read as ${to}`,
    label: `Name was written “${from}”`,
    repeat: `Also given as ${from}`,
  })[kind];

type PasteSettingsProps = {
  /** System whose fields the text is read into. */
  system: RecipeSystem;
  /**
   * How many times the form's settings were replaced wholesale. A result shown for an earlier
   * count describes fields that no longer hold what it says, so it is hidden.
   */
  wipes: number;
  /**
   * Receives what the text yielded: the settings found (fields it does not mention are not
   * included) and what to check among them.
   */
  onFill: (parsed: ParsedRecipeText) => void;
};

/**
 * Lets a recipe be pasted as text and sorted into the form's fields. The text is read on the
 * device; nothing is saved until the form itself is saved, so every value can be checked first.
 * What was filled, and what needs a second look, is marked under each field by the form; this
 * lists only the lines that could not be used.
 * @param props the camera system and the handler that receives what the text yielded
 */
export const PasteSettings = ({ system, wipes, onFill }: PasteSettingsProps) => {
  const [text, setText] = useState('');
  const [shown, setShown] = useState<{
    parsed: ParsedRecipeText;
    system: RecipeSystem;
    wipes: number;
  } | null>(null);
  // The pasted text stays for another try, but a result is only shown for the fields it filled:
  // switching system or copying from another recipe empties them.
  const result = shown?.system === system && shown.wipes === wipes ? shown.parsed : null;

  const fill = () => {
    const parsed = parseRecipeText(system, text);
    setShown({ parsed, system, wipes });
    onFill(parsed);
  };

  const filled = result ? Object.keys(result.settings).length : 0;

  return (
    <>
      <TextField
        label="Paste a recipe"
        indicator="Optional"
        value={text}
        onValueChange={({ value }) => setText(value)}
      >
        <TextFieldTextarea
          placeholder={'Classic Neg.\nWhite Balance: Auto, R+3 B-5\nHighlight: -1  Shadow: +1'}
        />
      </TextField>
      <div className={css.toolbar}>
        <Button size="small" disabled={!text.trim()} onClick={fill}>
          Fill in fields
        </Button>
      </div>
      {/* What was filled is marked under each field below. Only what could not be used is
          listed here, and announced, because it shows up nowhere else. */}
      <div role="status" className={css.pasteResult}>
        {result && filled === 0 && <p className={css.pasteCount}>Nothing filled in</p>}
        {result && result.unread.length > 0 && (
          <section className={css.pasteGroup}>
            <h4 className={css.pasteCount}>Not used {result.unread.length}</h4>
            <ul className={css.pasteUnread}>
              {result.unread.map((line, index) => (
                <li key={`${index}:${line}`}>{line}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
};
