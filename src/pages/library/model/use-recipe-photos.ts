import { useEffect, useRef, useState } from 'react';

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

  // Links already made. A list that grows asks for the new photos only, so the pictures on
  // screen keep their link and are not loaded again.
  const known = useRef<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const missing = (paths ? paths.split('\n') : []).filter(path => !known.current[path]);
    if (missing.length === 0) return;
    recipePhotoUrls(missing).then(
      next => {
        known.current = { ...known.current, ...next };
        if (active) setUrls(known.current);
      },
      // A photo that cannot be shown falls back to the recipe's name; the list stays usable.
      () => {},
    );
    return () => {
      active = false;
    };
  }, [paths]);

  return (recipe: Pick<Recipe, 'photoPath'>) =>
    recipe.photoPath ? urls[recipe.photoPath] : undefined;
};
