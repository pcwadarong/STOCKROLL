import { useEffect, useRef, useState } from 'react';

import { useMark } from '@/entities/mark';
import {
  cardFileSizes,
  type CardStyle,
  MAX_CARD_PHOTOS,
  type Recipe,
  type RecipeSettings,
} from '@/entities/recipe';
import { devicePixelBudget } from '@/shared/lib/canvas-budget';
import { ensureFont } from '@/shared/lib/canvas-fonts';

import { decodeCardPhoto, drawShareCard, loadRecipePhoto, shareRecipeCard } from './share-recipe';

/**
 * A photo on the card. `example` marks the recipe's own example photo. A photo added from this
 * device keeps its file and full size, to be opened again at full size when the card is saved
 * as Original; only the reduced `bitmap` is held in memory.
 */
export type CardPhotoItem = {
  id: string;
  bitmap: ImageBitmap;
  example: boolean;
  file?: File;
  fullSize?: { width: number; height: number };
};

type Loaded = { path: string | null; failed: boolean };

/**
 * Keeps a preview of a recipe card drawn on a canvas, and the photos that go on it. The card
 * starts with the recipe's example photo; more can be added from this device, taken off or put
 * in another order. Added photos are held in memory only — they are not uploaded and are gone
 * when the screen is left. The preview redraws whenever the recipe, the version, the photos, the
 * card style or the user's own text changes; saving draws the same card on a canvas of its own.
 * @param recipe recipe on the card, undefined until it is known
 * @param settings settings of the version on the card
 * @param style the card's design, size, spacing, colors and place for the user's text
 * @returns the ref for the preview canvas, whether the card is still `loading`, whether the
 * example photo failed to load, the photos with `addPhotos` (resolves to how many files could
 * not be used), `removePhoto` and `movePhoto`, `fileSizes` (what each file size saves at, once
 * the preview is drawn) and `save` to share or download the card
 */
export const useRecipeCard = (
  recipe: Recipe | undefined,
  settings: RecipeSettings | undefined,
  style: CardStyle,
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mark, image } = useMark();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [photos, setPhotos] = useState<readonly CardPhotoItem[]>([]);
  // The layout the preview was last drawn with: the file sizes are worked out from it.
  const [drawn, setDrawn] = useState<ReturnType<typeof drawShareCard> | null>(null);
  // Every bitmap made here that is still open. A decoded photo is about 12MB, and a phone's
  // browser kills the tab without a word once memory runs out, so one taken off the card is
  // closed as soon as nothing can still be drawing it.
  const made = useRef<ImageBitmap[]>([]);
  const onCard = useRef(photos);
  const saves = useRef(0);
  const release = () => {
    // A save draws after an await, from the photos it started with.
    if (saves.current > 0) return;
    const kept = new Set(onCard.current.map(photo => photo.bitmap));
    made.current = made.current.filter(bitmap => kept.has(bitmap) || (bitmap.close(), false));
  };
  // After the change is on screen: the preview that was drawing the old photos has been called
  // off by then (its effect is cleaned up first).
  useEffect(() => {
    onCard.current = photos;
    release();
  }, [photos]);
  useEffect(
    () => () => {
      for (const bitmap of made.current) bitmap.close();
      made.current = [];
    },
    [],
  );

  const known = recipe !== undefined;
  const path = recipe?.photoPath ?? null;
  useEffect(() => {
    if (!known) return;
    let active = true;
    loadRecipePhoto(path).then(
      bitmap => {
        if (!active) return bitmap?.close();
        if (bitmap) made.current.push(bitmap);
        // Photos added while this was loading stay: the example photo goes in front of them.
        setPhotos(current => {
          const added = current.filter(photo => !photo.example);
          const example = bitmap ? [{ id: `example:${path}`, bitmap, example: true }] : [];
          return [...example, ...added].slice(0, MAX_CARD_PHOTOS);
        });
        setLoaded({ path, failed: false });
      },
      () => {
        if (!active) return;
        setPhotos(current => current.filter(photo => !photo.example));
        setLoaded({ path, failed: true });
      },
    );
    return () => {
      active = false;
    };
  }, [known, path]);

  const ready = loaded?.path === path && recipe !== undefined && settings !== undefined;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!ready || !canvas || !recipe || !settings) return;
    let active = true;
    const bitmaps = photos.map(photo => photo.bitmap);
    // A canvas draws in the fallback face when the font file has not arrived yet.
    void ensureFont(mark.font).then(() => {
      if (active)
        setDrawn(drawShareCard(canvas, recipe, settings, bitmaps, style, { mark, image }));
    });
    return () => {
      active = false;
    };
  }, [ready, recipe, settings, style, photos, mark, image]);

  const addPhotos = async (files: readonly File[]) => {
    const room = MAX_CARD_PHOTOS - photos.length;
    const decoded = await Promise.all(
      files.slice(0, room).map(file =>
        decodeCardPhoto(file).then(
          photo => ({ ...photo, file }),
          () => null,
        ),
      ),
    );
    const added = decoded.flatMap(photo =>
      photo ? [{ id: crypto.randomUUID(), example: false, ...photo }] : [],
    );
    made.current.push(...added.map(photo => photo.bitmap));
    setPhotos(current => [...current, ...added].slice(0, MAX_CARD_PHOTOS));
    return files.length - added.length;
  };

  const removePhoto = (id: string) =>
    setPhotos(current => current.filter(photo => photo.id !== id));

  const movePhoto = (id: string, by: -1 | 1) =>
    setPhotos(current => {
      const from = current.findIndex(photo => photo.id === id);
      const to = from + by;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to]!, next[from]!];
      return next;
    });

  const save = async () => {
    if (!ready || !recipe || !settings) throw new Error('The card is not ready');
    saves.current += 1;
    try {
      return await shareRecipeCard(recipe, settings, photos, style);
    } finally {
      saves.current -= 1;
      release();
    }
  };

  // Original asks the device how large it can draw only once it is chosen: asking means making a
  // canvas that large.
  const fileSizes =
    drawn && drawn.photos.length === photos.length
      ? cardFileSizes(
          drawn,
          photos.map(photo => ({
            shown: photo.bitmap,
            full: photo.fullSize ?? photo.bitmap,
            example: photo.example,
          })),
          style.detail === 'full' ? devicePixelBudget : undefined,
        )
      : null;

  return {
    canvasRef,
    fileSizes,
    loading: !ready,
    exampleFailed: loaded?.path === path && loaded.failed,
    photos,
    addPhotos,
    removePhoto,
    movePhoto,
    save,
  };
};
