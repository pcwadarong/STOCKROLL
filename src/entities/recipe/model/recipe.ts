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
  /** Starred by the user. Independent of `state`: a favorite can be in the camera or archived. */
  isFavorite: boolean;
  /**
   * Storage path of the example photo, when one is attached. Written only by the photo API —
   * see `recipeFields`.
   */
  photoPath?: string | null;
};

/**
 * The part of a recipe that forms and toggles may save. The photo path is left out on purpose:
 * a screen holding a recipe loaded before a photo was attached would otherwise write its stale
 * `null` back and detach the photo while the file stays in Storage.
 * @param recipe recipe as loaded
 * @returns the recipe without `photoPath`
 */
export const recipeFields = ({ photoPath: _photoPath, ...fields }: Recipe) => fields;

/** Settings are append-only: changing them adds a version so past shots keep pointing at what was used. */
export type RecipeVersion = {
  id: string;
  recipeId: string;
  version: number;
  settings: RecipeSettings;
  sourceUrl: string | null;
};

export const RECIPE_STATES = [
  { value: 'active', label: 'In the camera' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'archived', label: 'Archived' },
] as const;

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
    options: RECIPE_STATES,
  },
  { key: 'note', label: 'Note', type: 'text' },
];

/** Recipe fields that can be edited after creation. The system is fixed once settings exist. */
export const DETAIL_FIELDS = RECIPE_FIELDS.filter(field => field.key !== 'system');

/**
 * Most versions one recipe may keep. Reaching it blocks new versions until the user deletes one
 * or branches into a new recipe — an old version is never dropped silently, because photos may
 * point at it.
 */
export const MAX_VERSIONS = 30;

/** How close to the cap the remaining count starts being shown, so the limit is no surprise. */
const LOW_SLOTS = 5;

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
 * Lists a recipe's versions, newest first.
 * @param versions all known versions, in any order
 * @param recipeId recipe to look up
 * @returns that recipe's versions sorted by version number, descending
 */
export const versionsOf = (versions: readonly RecipeVersion[], recipeId: string) =>
  versions.filter(version => version.recipeId === recipeId).sort((a, b) => b.version - a.version);

/**
 * Describes how full a recipe's version history is.
 * @param count number of versions the recipe has
 * @returns slots used and left, whether the cap is reached, and whether to show the remaining count
 */
export const versionSlots = (count: number) => {
  const left = Math.max(0, MAX_VERSIONS - count);
  return { used: count, left, full: left === 0, low: left > 0 && left <= LOW_SLOTS };
};

/**
 * Words the state of a recipe that is not loaded in the camera, for the line under its name.
 * @param recipe recipe to describe
 * @returns the state label, muted, or undefined for a recipe in the camera
 */
export const recipeNote = (recipe: Pick<Recipe, 'state'>) => {
  if (recipe.state === 'active') return undefined;
  const label = RECIPE_STATES.find(option => option.value === recipe.state)?.label;
  return label ? { label, tone: 'muted' as const } : undefined;
};

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
