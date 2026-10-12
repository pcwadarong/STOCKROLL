import { useEffect, useState } from 'react';

import { type Recipe, recipePhotoUrls } from '@/entities/recipe';

/**
 * Loads the example photos of several recipes at once, for screens that show recipes by picture.
 * The links are temporary and held in memory only.
 * @param recipes recipes to show
 * @returns a lookup from a recipe to its photo link, undefined while loading or when it has none
 */
export const useRecipePhotos = (recipes: readonly Recipe[]) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  // Paths as one string, so the effect reruns only when the set of photos changes.
  const paths = recipes.flatMap(recipe => (recipe.photoPath ? [recipe.photoPath] : [])).join('\n');

  useEffect(() => {
    let active = true;
    recipePhotoUrls(paths ? paths.split('\n') : []).then(
      next => active && setUrls(next),
      // A photo that cannot be shown falls back to the recipe's name; the list stays usable.
      () => active && setUrls({}),
    );
    return () => {
      active = false;
    };
  }, [paths]);

  return (recipe: Pick<Recipe, 'photoPath'>) =>
    recipe.photoPath ? urls[recipe.photoPath] : undefined;
};
