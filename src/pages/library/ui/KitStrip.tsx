import { Link } from 'react-router';

import { isSimulationSlot, type Kit, KIT_SLOTS, type KitSlot } from '@/entities/recipe';

import * as css from './RecipeGallery.css';

/**
 * What a filled slot shows. A custom setting names its recipe; a dial position holds a film
 * simulation and has no recipe to lead to.
 */
export type SlotContent = { name: string; recipeId?: string; photoUrl?: string };

type KitStripProps = {
  /** The recipe in each filled slot. */
  contents: Partial<Record<KitSlot, SlotContent>>;
  /** Slot being filled. Only used with `onSelect`. */
  selected?: KitSlot;
  /** Called when a slot is tapped. Without it, filled slots link to their recipe instead. */
  onSelect?: (slot: KitSlot) => void;
};

/**
 * A kit's slots in camera order, each with its recipe's picture and name. Read-only it links to
 * the recipes; with `onSelect` each slot is a button that chooses which slot to fill.
 * @param props slot contents and, when editing, the selected slot and the tap handler
 */
export const KitStrip = ({ contents, selected, onSelect }: KitStripProps) => (
  <ol className={css.strip}>
    {KIT_SLOTS.map(slot => {
      const content = contents[slot];
      const body = (
        <>
          <span className={content ? css.frame : css.emptyFrame}>
            {content?.photoUrl ? (
              <img className={css.image} src={content.photoUrl} alt="" loading="lazy" />
            ) : (
              <span className={css.placeholder}>
                {!content ? 'Empty' : content.recipeId ? 'No photo' : 'Film sim'}
              </span>
            )}
          </span>
          <span className={css.slotLabel}>{slot}</span>
          {content && <span className={css.slotName}>{content.name}</span>}
        </>
      );

      return (
        <li key={slot}>
          {onSelect ? (
            <button
              type="button"
              className={css.tile}
              aria-pressed={slot === selected}
              aria-label={`${slot}: ${content?.name ?? 'empty'}`}
              onClick={() => onSelect(slot)}
            >
              {body}
            </button>
          ) : content?.recipeId ? (
            <Link to={`/recipes/${content.recipeId}`} className={css.tile}>
              {body}
            </Link>
          ) : (
            <span className={css.tile}>{body}</span>
          )}
        </li>
      );
    })}
  </ol>
);

/**
 * Works out what each slot of a kit shows.
 * @param slots a kit's slots, already limited to recipes that exist
 * @param recipes every recipe, to look names up in
 * @param photoOf lookup from a recipe to its photo link
 * @returns the content per filled slot
 */
export const slotContents = <R extends { id: string; name: string }>(
  slots: Kit['slots'],
  recipes: readonly R[],
  photoOf: (recipe: R) => string | undefined,
) =>
  Object.fromEntries(
    Object.entries(slots).flatMap(([slot, id]) => {
      if (isSimulationSlot(slot as KitSlot)) return [[slot, { name: id }]];
      const recipe = recipes.find(item => item.id === id);
      return recipe
        ? [[slot, { recipeId: recipe.id, name: recipe.name, photoUrl: photoOf(recipe) }]]
        : [];
    }),
  ) as Partial<Record<KitSlot, SlotContent>>;
