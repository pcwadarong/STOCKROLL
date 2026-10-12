import { useState } from 'react';

import {
  type ParsedRecipeText,
  parseRecipeText,
  type RecipeSettings,
  type RecipeSystem,
  SYSTEMS,
} from '@/entities/recipe';
import { Button } from '@/shared/ui/Button';
import { TextField, TextFieldTextarea } from 'seed-design/ui/text-field';

import * as css from './LibraryPage.css';

type PasteSettingsProps = {
  /** System whose fields the text is read into. */
  system: RecipeSystem;
  /** Receives the settings found in the text. Fields the text does not mention are not included. */
  onFill: (settings: RecipeSettings) => void;
};

/**
 * Lets a recipe be pasted as text and sorted into the form's fields. The text is read on the
 * device; nothing is saved until the form itself is saved, so every value can be checked first.
 * @param props the camera system and the handler that receives the settings found
 */
export const PasteSettings = ({ system, onFill }: PasteSettingsProps) => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParsedRecipeText | null>(null);

  const fill = () => {
    const parsed = parseRecipeText(system, text);
    setResult(parsed);
    onFill(parsed.settings);
  };

  const filled = result
    ? SYSTEMS[system].fields.filter(field => field.key in result.settings).map(field => field.label)
    : [];

  return (
    <>
      <TextField
        label="Paste a recipe"
        indicator="Optional"
        description="Paste the settings as text and they are sorted into the fields below. On iPhone, press and hold the text in a screenshot to copy it."
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
      <div role="status">
        {result && (
          <p className={css.note}>
            {filled.length > 0
              ? `Filled in ${filled.length}: ${filled.join(', ')}. Check them before saving.`
              : 'No setting was recognized in this text.'}
            {result.unread.length > 0 && ` Not used: ${result.unread.join(' / ')}`}
          </p>
        )}
      </div>
    </>
  );
};
