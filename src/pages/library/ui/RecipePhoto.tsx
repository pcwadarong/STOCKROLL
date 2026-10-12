import { useEffect, useRef, useState } from 'react';

import {
  type Recipe,
  recipePhotoUrl,
  removeRecipePhoto,
  uploadRecipePhoto,
} from '@/entities/recipe';
import { Button } from '@/shared/ui/Button';
import { ErrorText } from '@/shared/ui/ErrorText';

import * as css from './LibraryPage.css';

type RecipePhotoProps = {
  recipe: Recipe;
  /** Called after the photo was added, replaced or removed, so the recipe is read again. */
  onChanged: () => Promise<unknown>;
};

/**
 * The one example photo a recipe can carry: shows it, and lets the owner add, replace or remove it.
 * Renders no container of its own, so it sits at the top of the recipe's sheet.
 * This is the only place in the app where an image is uploaded, and only on this explicit action.
 * @param props the recipe and a callback to refresh it after a change
 */
export const RecipePhoto = ({ recipe, onChanged }: RecipePhotoProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  // A link that could not be made is not the same as one still on its way.
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Replacing keeps the same path, so the path alone cannot tell the effect to fetch a new URL.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    recipePhotoUrl(recipe.photoPath).then(
      next => {
        if (!active) return;
        setUrl(next);
        setLoadFailed(false);
      },
      () => {
        if (!active) return;
        setUrl(null);
        setLoadFailed(true);
      },
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
    <>
      {recipe.photoPath && url && (
        <img className={css.photo} src={url} alt={`Example shot with ${recipe.name}`} />
      )}
      {recipe.photoPath && !url && (
        <p className={css.note} role="status">
          {loadFailed ? 'The photo could not be shown. Reload to try again.' : 'Loading the photo…'}
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
        <Button variant="plain" loading={busy} onClick={() => inputRef.current?.click()}>
          {recipe.photoPath ? 'Replace photo' : 'Add an example photo'}
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
        {/* Said where the choice is made: before a first photo is picked. */}
        {!recipe.photoPath && (
          <span className={css.note}>
            Shrunk and stripped of location data before upload. Only you can see it.
          </span>
        )}
      </div>
    </>
  );
};
