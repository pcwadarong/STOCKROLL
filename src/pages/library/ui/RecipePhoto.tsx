import { useEffect, useRef, useState } from 'react';

import {
  type Recipe,
  recipePhotoUrl,
  removeRecipePhoto,
  uploadRecipePhoto,
} from '@/entities/recipe';
import { Button } from '@/shared/ui/Button';
import { ErrorText } from '@/shared/ui/ErrorText';
import { Panel } from '@/shared/ui/Panel';

import * as css from './LibraryPage.css';

type RecipePhotoProps = {
  recipe: Recipe;
  /** Called after the photo was added, replaced or removed, so the recipe is read again. */
  onChanged: () => Promise<unknown>;
};

/**
 * The one example photo a recipe can carry: shows it, and lets the owner add, replace or remove it.
 * This is the only place in the app where an image is uploaded, and only on this explicit action.
 * @param props the recipe and a callback to refresh it after a change
 */
export const RecipePhoto = ({ recipe, onChanged }: RecipePhotoProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Replacing keeps the same path, so the path alone cannot tell the effect to fetch a new URL.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    recipePhotoUrl(recipe.photoPath).then(
      next => active && setUrl(next),
      () => active && setUrl(null),
    );
    return () => {
      active = false;
    };
  }, [recipe.photoPath, revision]);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await onChanged();
      setRevision(value => value + 1);
    } catch {
      setError(failure);
    }
    setBusy(false);
  };

  return (
    <Panel title="Example photo">
      {recipe.photoPath && url ? (
        <img className={css.photo} src={url} alt={`Example shot with ${recipe.name}`} />
      ) : (
        <p className={css.note}>
          {recipe.photoPath
            ? 'Loading…'
            : 'Attach one photo that shows what this recipe looks like.'}
        </p>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      <input
        ref={inputRef}
        className={css.hiddenInput}
        type="file"
        accept="image/*"
        tabIndex={-1}
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file)
            void run(
              () => uploadRecipePhoto(recipe.id, file),
              'Could not upload the photo. Try again, or try a different image.',
            );
        }}
      />
      <div className={css.toolbar}>
        <Button size="small" loading={busy} onClick={() => inputRef.current?.click()}>
          {recipe.photoPath ? 'Replace photo' : 'Add photo'}
        </Button>
        {recipe.photoPath && !busy && (
          <Button
            variant="plain"
            onClick={() =>
              void run(() => removeRecipePhoto(recipe), 'Could not remove the photo. Try again.')
            }
          >
            Remove photo
          </Button>
        )}
      </div>
      <p className={css.note}>
        Shrunk and stripped of location data before upload. Only you can see it.
      </p>
    </Panel>
  );
};
