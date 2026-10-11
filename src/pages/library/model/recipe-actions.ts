import {
  hasSettings,
  MAX_VERSIONS,
  type Recipe,
  recipeCollection,
  type RecipeSettings,
  type RecipeVersion,
  recipeVersionCollection,
  versionsOf,
} from '@/entities/recipe';

export type RecipeDetails = Pick<Recipe, 'name' | 'state' | 'note'>;

/**
 * Creates a recipe and, when settings were entered, its first version.
 * The two inserts are not one transaction: if the version fails, the recipe is removed again so
 * a retry does not leave a second recipe behind.
 * @param details name, system, state and note
 * @param settings settings for version 1; an empty object creates a recipe with no version yet
 * @returns the created recipe
 */
export const createRecipe = async (
  details: RecipeDetails & Pick<Recipe, 'system'>,
  settings: RecipeSettings,
) => {
  const recipe = await recipeCollection.save({
    ...details,
    baseSimulation: settings.simulation ?? null,
    isFavorite: false,
  });
  // A recipe known only by name gets no version: "no settings yet" and "v1" are different.
  if (!hasSettings(settings)) return recipe;
  try {
    await recipeVersionCollection.save({
      recipeId: recipe.id,
      version: 1,
      settings,
      sourceUrl: null,
    });
  } catch (cause) {
    await recipeCollection.remove(recipe.id).catch(() => undefined);
    throw cause;
  }
  return recipe;
};

/** Keeps the recipe's list label in step with the settings of its newest version. */
const syncBaseSimulation = (recipe: Recipe, settings: RecipeSettings) =>
  recipe.baseSimulation === (settings.simulation ?? null)
    ? Promise.resolve(recipe)
    : recipeCollection.save({ ...recipe, baseSimulation: settings.simulation ?? null });

/**
 * Fixes a mistake in an existing version, in place. The version keeps its number, and anything
 * linked to it shows the corrected values.
 * @param recipe recipe the version belongs to
 * @param version version to overwrite
 * @param settings corrected settings
 * @param isLatest whether this is the newest version, which drives the recipe's list label
 */
export const correctVersion = async (
  recipe: Recipe,
  version: RecipeVersion,
  settings: RecipeSettings,
  isLatest: boolean,
) => {
  await recipeVersionCollection.save({ ...version, settings });
  if (isLatest) await syncBaseSimulation(recipe, settings);
};

/**
 * Adds the next version of a recipe, leaving every earlier version as it is.
 * @param recipe recipe to add to
 * @param versions every known version (of any recipe)
 * @param settings settings of the new version
 * @returns the saved version
 * @throws when the recipe already holds the maximum number of versions — callers check
 *   `versionSlots` first and never offer this action when full
 */
export const addVersion = async (
  recipe: Recipe,
  versions: readonly RecipeVersion[],
  settings: RecipeSettings,
) => {
  const own = versionsOf(versions, recipe.id);
  if (own.length >= MAX_VERSIONS) throw new Error('This recipe has no version slots left');
  const saved = await recipeVersionCollection.save({
    recipeId: recipe.id,
    version: (own[0]?.version ?? 0) + 1,
    settings,
    sourceUrl: own[0]?.sourceUrl ?? null,
  });
  await syncBaseSimulation(recipe, settings);
  return saved;
};

/**
 * Deletes one version. When it was the newest, the recipe's list label falls back to the
 * version that is newest afterwards.
 * @param recipe recipe the version belongs to
 * @param versions every known version (of any recipe)
 * @param version version to delete
 */
export const removeVersion = async (
  recipe: Recipe,
  versions: readonly RecipeVersion[],
  version: RecipeVersion,
) => {
  await recipeVersionCollection.remove(version.id);
  const remaining = versionsOf(versions, recipe.id).filter(item => item.id !== version.id);
  await syncBaseSimulation(recipe, remaining[0]?.settings ?? {});
};
