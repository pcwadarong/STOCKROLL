import { useEffect, useRef } from 'react';

import { isSimulationSlot, type Strip, STRIP_SLOTS, type StripSlot } from '@/entities/recipe';

import * as css from './FilmStrip.css';

/**
 * What a filled slot shows. A custom setting names its recipe; a dial position holds a film
 * simulation and has no recipe to lead to.
 */
export type SlotContent = { name: string; recipeId?: string; photoUrl?: string };

/** CSS pixels kept clear beside the selected frame when the strip scrolls to it. */
const EDGE_ROOM = 8;

type FilmStripProps = {
  /** The recipe or film simulation in each filled slot. */
  contents: Partial<Record<StripSlot, SlotContent>>;
  /** Slot being filled. Only used with `onSelect`. */
  selected?: StripSlot;
  /** Called when a slot is tapped. Without it the strip is only read. */
  onSelect?: (slot: StripSlot) => void;
};

/**
 * A strip drawn as film: its ten slots in camera order on one line, each a frame with the
 * recipe's picture and the slot printed under it. The strip scrolls sideways inside itself when
 * the line is wider than the screen. With `onSelect` each frame is a button that chooses which
 * slot to fill.
 * @param props slot contents and, when editing, the selected slot and the tap handler
 */
export const FilmStrip = ({ contents, selected, onSelect }: FilmStripProps) => {
  const strip = useRef<HTMLOListElement>(null);

  // Filling a slot moves the selection on; bring the new one into view. The strip is scrolled
  // by hand rather than with `scrollIntoView`, which could move the page as well.
  useEffect(() => {
    const list = strip.current;
    const frame = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !frame) return;
    // A little of the neighbouring frame stays in view, so the selection's outline is not cut.
    const left = frame.offsetLeft - EDGE_ROOM;
    const right = frame.offsetLeft + frame.offsetWidth + EDGE_ROOM;
    if (left < list.scrollLeft) list.scrollLeft = left;
    else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth;
  }, [selected]);

  return (
    <ol ref={strip} className={css.strip}>
      {STRIP_SLOTS.map(slot => {
        const content = contents[slot];
        // A film simulation has no picture, so its name takes the frame.
        const inFrame = content?.recipeId ? 'No photo' : content?.name;
        const body = (
          <>
            <span className={content ? css.frame : css.emptyFrame}>
              {content?.photoUrl ? (
                <img className={css.image} src={content.photoUrl} alt="" loading="lazy" />
              ) : (
                inFrame && <span className={css.frameText}>{inFrame}</span>
              )}
            </span>
            <span className={css.edge}>
              <span className={css.slotLabel}>{slot}</span>
              {content?.recipeId && <span className={css.slotName}>{content.name}</span>}
            </span>
          </>
        );

        return (
          <li key={slot} className={css.slot}>
            {onSelect ? (
              <button
                type="button"
                className={css.cell}
                aria-pressed={slot === selected}
                aria-label={`${slot}: ${content?.name ?? 'empty'}`}
                onClick={() => onSelect(slot)}
              >
                {body}
              </button>
            ) : (
              <span className={css.cell}>{body}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
};

/**
 * Works out what each slot of a strip shows.
 * @param slots a strip's slots, already limited to recipes that exist
 * @param recipes every recipe, to look names up in
 * @param photoOf lookup from a recipe to its photo link
 * @returns the content per filled slot
 */
export const slotContents = <R extends { id: string; name: string }>(
  slots: Strip['slots'],
  recipes: readonly R[],
  photoOf: (recipe: R) => string | undefined,
) =>
  Object.fromEntries(
    Object.entries(slots).flatMap(([slot, id]) => {
      if (isSimulationSlot(slot as StripSlot)) return [[slot, { name: id }]];
      const recipe = recipes.find(item => item.id === id);
      return recipe
        ? [[slot, { recipeId: recipe.id, name: recipe.name, photoUrl: photoOf(recipe) }]]
        : [];
    }),
  ) as Partial<Record<StripSlot, SlotContent>>;
