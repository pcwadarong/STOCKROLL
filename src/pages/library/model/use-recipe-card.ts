import { useEffect, useRef, useState } from 'react';

import { useMark } from '@/entities/mark';
import {
  type CardStyle,
  MAX_CARD_PHOTOS,
  type Recipe,
  type RecipeSettings,
} from '@/entities/recipe';
import { ensureFont } from '@/shared/lib/canvas-fonts';

import { decodeCardPhoto, drawShareCard, loadRecipePhoto, shareRecipeCard } from './share-recipe';

/** A photo on the card. `example` marks the recipe's own example photo. */
export type CardPhotoItem = { id: string; bitmap: ImageBitmap; example: boolean };

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
 * not be used), `removePhoto` and `movePhoto`, and `save` to share or download the card
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
  // Every bitmap made here, so all of them can be released when the screen is left. One taken
  // off the card is not closed at once: a save that started before may still be drawing it.
  const made = useRef<ImageBitmap[]>([]);
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
        // The card of another recipe starts over from that recipe's own photo.
        setPhotos(bitmap ? [{ id: `example:${path}`, bitmap, example: true }] : []);
        setLoaded({ path, failed: false });
      },
      () => {
        if (!active) return;
        setPhotos([]);
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
      if (active) drawShareCard(canvas, recipe, settings, bitmaps, style, { mark, image });
    });
    return () => {
      active = false;
    };
  }, [ready, recipe, settings, style, photos, mark, image]);

  const addPhotos = async (files: readonly File[]) => {
    const room = MAX_CARD_PHOTOS - photos.length;
    const decoded = await Promise.all(
      files.slice(0, room).map(file => decodeCardPhoto(file).catch(() => null)),
    );
    const added = decoded.flatMap(bitmap =>
      bitmap ? [{ id: crypto.randomUUID(), bitmap, example: false }] : [],
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
    return shareRecipeCard(
      recipe,
      settings,
      photos.map(photo => photo.bitmap),
      style,
    );
  };

  return {
    canvasRef,
    loading: !ready,
    exampleFailed: loaded?.path === path && loaded.failed,
    photos,
    addPhotos,
    removePhoto,
    movePhoto,
    save,
  };
};
