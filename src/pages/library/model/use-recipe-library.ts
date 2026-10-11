import {
  deleteRecipe,
  type Recipe,
  recipeCollection,
  recipeFields,
  recipeVersionCollection,
} from '@/entities/recipe';
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
    /** Saves a recipe's own fields. The photo path is never part of this write. */
    saveRecipe: (recipe: Recipe) => recipes.save(recipeFields(recipe)),
    /** Deletes a recipe together with its example photo, then refreshes the list. */
    removeRecipe: (id: string) => deleteRecipe(id).then(() => recipes.reload()),
    reload: () => Promise.all([recipes.reload(), versions.reload()]),
  };
};
