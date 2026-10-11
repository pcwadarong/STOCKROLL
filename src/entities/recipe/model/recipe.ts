import { createCollection } from '@/shared/api/collection';
import type { RecordField } from '@/shared/lib/record-field';

import { type RecipeSystem, SYSTEM_OPTIONS, SYSTEMS } from './systems';

/**
 * Camera settings of a recipe, keyed by the field keys of its system. Every value is kept as the
 * user typed it and stays absent when unknown — settings are never inferred from a recipe's name.
 */
export type RecipeSettings = Record<string, string>;

export type Recipe = {
  id: string;
  name: string;
  /** Camera family the settings belong to. Decides which fields the recipe has. */
  system: RecipeSystem;
  /** Look the recipe is built on. Mirrors `settings.simulation` of the latest version. */
  baseSimulation: string | null;
  state: 'candidate' | 'active' | 'archived';
  note: string | null;
};

/** Settings are append-only: changing them adds a version so past shots keep pointing at what was used. */
export type RecipeVersion = {
  id: string;
  recipeId: string;
  version: number;
  settings: RecipeSettings;
  sourceUrl: string | null;
};

export const RECIPE_FIELDS: readonly RecordField[] = [
  { key: 'name', label: 'Recipe name', type: 'text', required: true },
  {
    key: 'system',
    label: 'Camera system',
    type: 'select',
    required: true,
    options: SYSTEM_OPTIONS,
    hint: 'Decides which settings the recipe has',
  },
  {
    key: 'state',
    label: 'State',
    type: 'select',
    required: true,
    options: [
      { value: 'active', label: 'In the camera' },
      { value: 'candidate', label: 'Candidate' },
      { value: 'archived', label: 'Archived' },
    ],
  },
  { key: 'note', label: 'Note', type: 'text' },
];

export const recipeCollection = createCollection<Recipe>('recipes');
export const recipeVersionCollection = createCollection<RecipeVersion>('recipe_versions');

/**
 * Reads a recipe's system, treating records saved before systems existed as Fujifilm.
 * @param recipe recipe that may lack `system`
 * @returns its camera system
 */
export const systemOf = (recipe: { system?: RecipeSystem | null }): RecipeSystem =>
  recipe.system && recipe.system in SYSTEMS ? recipe.system : 'fujifilm';

/**
 * Picks the newest version of a recipe.
 * @param versions all known versions, in any order
 * @param recipeId recipe to look up
 * @returns the version with the highest number, or undefined when the recipe has none yet
 */
export const latestVersion = (versions: readonly RecipeVersion[], recipeId: string) =>
  versions
    .filter(version => version.recipeId === recipeId)
    .reduce<RecipeVersion | undefined>(
      (latest, version) => (!latest || version.version > latest.version ? version : latest),
      undefined,
    );

/**
 * Compares two settings objects, treating missing, null and blank values as the same.
 * @param a first settings
 * @param b second settings
 * @returns true when every setting holds the same value
 */
export const sameSettings = (a: RecipeSettings, b: RecipeSettings) =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].every(
    key => (a[key] ?? '').trim() === (b[key] ?? '').trim(),
  );

/**
 * Blank values for every setting of every system.
 * Systems reuse keys such as `simulation` and `sharpness`, so switching a recipe's system has to
 * wipe them all — otherwise a Fujifilm simulation would be saved as a Ricoh image control.
 * @returns an object mapping each known setting key to an empty string
 */
export const blankSettings = (): RecipeSettings =>
  Object.fromEntries(
    Object.values(SYSTEMS).flatMap(system => system.fields.map(({ key }) => [key, ''])),
  );

/**
 * Tells whether any setting was actually entered.
 * A recipe known only by name has no version at all, which is different from a version that
 * records settings.
 * @param settings settings to check
 * @returns true when at least one setting has a value
 */
export const hasSettings = (settings: RecipeSettings) =>
  Object.values(settings).some(value => value.trim() !== '');

/**
 * Keeps only the filled-in settings that belong to a system, so unknown settings are not stored
 * as empty strings and switching system does not carry stray fields over.
 * @param system camera system whose fields are allowed
 * @param values raw form values
 * @returns settings limited to that system's filled-in keys
 */
export const toSettings = (system: RecipeSystem, values: Record<string, unknown>): RecipeSettings =>
  Object.fromEntries(
    SYSTEMS[system].fields.flatMap(({ key }) => {
      const value = values[key];
      return typeof value === 'string' && value.trim() ? [[key, value.trim()]] : [];
    }),
  );
