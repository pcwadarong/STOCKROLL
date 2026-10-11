import { recipeCollection, recipeVersionCollection } from '@/entities/recipe';
import { useCollection } from '@/shared/lib/use-collection';

/**
 * Loads recipes together with their versions, which every recipe screen needs side by side.
 * @returns both lists, whether both have loaded, and a reload for after a change
 */
export const useRecipeLibrary = () => {
  const recipes = useCollection(recipeCollection);
  const versions = useCollection(recipeVersionCollection);
  return {
    recipes: recipes.items,
    versions: versions.items,
    ready: recipes.status === 'ready' && versions.status === 'ready',
    failed: recipes.status === 'error' || versions.status === 'error',
    saveRecipe: recipes.save,
    removeRecipe: recipes.remove,
    reload: () => Promise.all([recipes.reload(), versions.reload()]),
  };
};
