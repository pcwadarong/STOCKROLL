import { useState } from 'react';

import {
  type ParsedRecipeText,
  parseRecipeText,
  type PasteFlag,
  type RecipeSystem,
  SYSTEMS,
} from '@/entities/recipe';
import { Button } from '@/shared/ui/Button';
import { TextField, TextFieldTextarea } from 'seed-design/ui/text-field';

import * as css from './LibraryPage.css';

/**
 * Says in a few words what to check about a pasted value. Used both in the list under the paste
 * box and under the field itself, so the two never tell it differently.
 * @param flag what the reader flagged
 * @returns a short phrase naming the pasted text and what was made of it
 */
export const flagText = ({ kind, from, to }: PasteFlag) =>
  ({
    value: `“${from}” read as ${to}`,
    label: `Name was written “${from}”`,
    range: `${to} is outside ${from}`,
    number: `“${to}” may be ${from}`,
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
 * What needs a second look — a guessed misspelling, an unusual number, a setting given twice —
 * is listed apart in red; what was left out is listed last, quietly.
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

  const labelOf = (key: string) =>
    SYSTEMS[system].fields.find(field => field.key === key)?.label ?? key;
  const filled = result ? Object.keys(result.settings).length : 0;

  return (
    <>
      <TextField
        label="Paste a recipe"
        indicator="Optional"
        description={`Read as ${SYSTEMS[system].label} settings and filled into the fields below. On iPhone, press and hold text in a screenshot to copy it.`}
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
      {/* Announced, because the result appears below the button that caused it. */}
      <div role="status" className={css.pasteResult}>
        {result && (
          <p className={css.pasteCount}>{filled > 0 ? `Filled ${filled}` : 'Nothing recognized'}</p>
        )}
        {result && result.flags.length > 0 && (
          <section className={css.pasteGroup}>
            <h4 className={css.pasteCheck}>Check {result.flags.length}</h4>
            <dl className={css.pasteRows}>
              {result.flags.map(flag => (
                <div key={`${flag.key}:${flag.kind}`} className={css.pasteRow}>
                  <dt className={css.pasteField}>{labelOf(flag.key)}</dt>
                  <dd className={css.pasteDetail}>{flagText(flag)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
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
