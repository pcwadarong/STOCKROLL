import { createCollection, type ListOrder } from '@/shared/api/collection';

import { FUJI_SIMULATIONS, type RecipeSystem } from './systems';

/** Custom settings: each holds a whole recipe. */
export const RECIPE_SLOTS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'] as const;

/**
 * Positions of the film simulation dial on bodies such as the X-T50. The camera stores a film
 * simulation there and nothing else, so a roll does too.
 */
export const SIMULATION_SLOTS = ['FS1', 'FS2', 'FS3'] as const;

/** Every place a roll can fill, in camera order. A body without one simply leaves it empty. */
export const ROLL_SLOTS = [...RECIPE_SLOTS, ...SIMULATION_SLOTS] as const;

export type RollSlot = (typeof ROLL_SLOTS)[number];

/** Rolls arrange Fujifilm recipes: the slots above are that system's. */
export const ROLL_SYSTEM: RecipeSystem = 'fujifilm';

/**
 * A named set of recipes laid out over the camera's slots — what to load for a trip or a season.
 * It is a plan kept in the app: saving a roll changes nothing in the camera and nothing in the
 * recipes it points at.
 */
export type Roll = {
  id: string;
  name: string;
  /**
   * What each slot holds: a recipe id in C1–C7, a film simulation name in FS1–FS3. A slot that is
   * absent is empty.
   */
  slots: Partial<Record<RollSlot, string>>;
  /** What the set is for, in the user's words. */
  note: string | null;
};

// The table keeps the name it was created with: rolls were first called kits.
export const rollCollection = createCollection<Roll>('recipe_kits');

/**
 * Names a roll started as a copy of another, so the two can be told apart in the list.
 * @param name the original roll's name
 * @returns the name the copy starts with
 */
export const copyName = (name: string) => `${name} (copy)`;

/** Order of the roll list: as they were made. */
export const ROLL_ORDER: readonly ListOrder[] = [{ column: 'createdAt' }];

/**
 * Tells whether a slot holds a film simulation rather than a recipe.
 * @param slot slot to check
 * @returns true for FS1–FS3
 */
export const isSimulationSlot = (slot: RollSlot): slot is (typeof SIMULATION_SLOTS)[number] =>
  (SIMULATION_SLOTS as readonly string[]).includes(slot);

/**
 * Finds the slot a recipe sits in.
 * @param slots a roll's slots
 * @param recipeId recipe to look for
 * @returns the slot holding it, or undefined when the roll does not use it
 */
export const slotOfRecipe = (slots: Roll['slots'], recipeId: string) =>
  RECIPE_SLOTS.find(slot => slots[slot] === recipeId);

// Only C1–C7 are searched: a film simulation may sit on more than one dial position.
const clearRecipe = (slots: Roll['slots'], recipeId: string): Roll['slots'] =>
  Object.fromEntries(
    Object.entries(slots).filter(
      ([slot, id]) => isSimulationSlot(slot as RollSlot) || id !== recipeId,
    ),
  );

/**
 * Fills a slot. A recipe sits in one custom setting at a time, so it leaves the one it was in;
 * a film simulation can repeat across dial positions.
 * @param slots a roll's slots
 * @param slot slot to fill
 * @param value recipe id for C1–C7, film simulation name for FS1–FS3
 * @returns new slots; the input is not changed
 */
export const assignSlot = (slots: Roll['slots'], slot: RollSlot, value: string): Roll['slots'] => ({
  ...(isSimulationSlot(slot) ? slots : clearRecipe(slots, value)),
  [slot]: value,
});

/**
 * Empties one slot.
 * @param slots a roll's slots
 * @param slot slot to empty
 * @returns new slots without it
 */
export const clearSlot = (slots: Roll['slots'], slot: RollSlot): Roll['slots'] =>
  Object.fromEntries(Object.entries(slots).filter(([key]) => key !== slot));

/**
 * Picks the slot to offer next: the first empty one after the given slot, wrapping around.
 * @param slots a roll's slots
 * @param after slot that was just filled
 * @returns the next empty slot, or the same slot when every slot is taken
 */
export const nextEmptySlot = (slots: Roll['slots'], after: RollSlot): RollSlot => {
  const start = ROLL_SLOTS.indexOf(after);
  const order = [...ROLL_SLOTS.slice(start + 1), ...ROLL_SLOTS.slice(0, start)];
  return order.find(slot => !slots[slot]) ?? after;
};

/**
 * Drops slots that point at recipes which no longer exist, film simulations the app does not
 * list, and anything that is not a slot.
 * A deleted recipe must read as an empty slot, not as a slot that is taken by nothing.
 * @param slots slots as stored
 * @param recipeIds ids of the recipes that exist
 * @returns the slots that still point at a recipe
 */
export const liveSlots = (
  slots: Readonly<Record<string, unknown>> | null | undefined,
  recipeIds: ReadonlySet<string>,
): Roll['slots'] =>
  Object.fromEntries(
    ROLL_SLOTS.flatMap(slot => {
      const value = slots?.[slot];
      if (typeof value !== 'string') return [];
      const known = isSimulationSlot(slot)
        ? (FUJI_SIMULATIONS as readonly string[]).includes(value)
        : recipeIds.has(value);
      return known ? [[slot, value]] : [];
    }),
  );

/**
 * Lists the recipes a roll's custom settings point at, so a screen can read just those. The dial
 * positions are left out: they hold film simulation names, not recipes.
 * @param slots slots as stored
 * @returns the recipe ids in C1–C7, existing or not
 */
export const recipeIdsOf = (slots: Readonly<Record<string, unknown>> | null | undefined) =>
  RECIPE_SLOTS.flatMap(slot => {
    const value = slots?.[slot];
    return typeof value === 'string' ? [value] : [];
  });

/**
 * Counts the filled slots, for the "4 / 10" beside a roll's name.
 * @param slots a roll's slots
 * @returns how many slots hold a recipe
 */
export const filledSlots = (slots: Roll['slots']) => ROLL_SLOTS.filter(slot => slots[slot]).length;
