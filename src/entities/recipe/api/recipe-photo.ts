import { supabase } from '@/shared/api/supabase';
import { resizeImage } from '@/shared/lib/resize-image';

import { type Recipe, recipeCollection } from '../model/recipe';

const BUCKET = 'recipe-photos';
/** Same as the bucket's `file_size_limit` in the migration. Storage refuses anything larger. */
const MAX_BYTES = 1024 * 1024;
/** Tried when the default quality leaves a very detailed photo above the bucket limit. */
const FALLBACK_QUALITY = 0.6;
const SIGNED_URL_SECONDS = 60 * 60;

const requireSession = async (action: string) => {
  if (!supabase) throw new Error('Recipe photos need sign-in, which is not set up in this build');
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error(`Sign in to ${action}`);
  return { client: supabase, userId: data.session.user.id };
};

/**
 * Builds the Storage path of a recipe's example photo. One fixed path per recipe is what makes
 * "one photo per recipe" hold: a second upload replaces the first instead of adding a file.
 * The first segment must be the owner's user id — the bucket policies check exactly that.
 * @param userId id of the signed-in user who owns the recipe
 * @param recipeId recipe the photo belongs to
 * @returns object path inside the `recipe-photos` bucket
 */
export const recipePhotoPath = (userId: string, recipeId: string) => `${userId}/${recipeId}.jpg`;

const prepare = async (file: Blob) => {
  const photo = await resizeImage(file);
  if (photo.size <= MAX_BYTES) return photo;
  const smaller = await resizeImage(file, { quality: FALLBACK_QUALITY });
  if (smaller.size <= MAX_BYTES) return smaller;
  throw new Error('This photo is too large to store even after resizing. Try another one.');
};

/**
 * Attaches an example photo to a recipe, replacing the one it had.
 *
 * This is the only place an image leaves the device, and only because the user chose a file for
 * it. The original is never sent: it is shrunk and re-encoded first (`resizeImage`), which drops
 * all metadata including GPS.
 *
 * `photoPath` is written here and by `removeRecipePhoto` only. Leave it out of what a form passes
 * to `recipeCollection.save`: saving a stale copy that still says `photoPath: null` would detach
 * the photo and leave the file behind.
 * @param recipeId an already saved recipe owned by the signed-in user
 * @param file image the user picked
 * @returns the stored object path, also written to the recipe's `photoPath`
 * @throws when signed out, Supabase is not configured, the recipe does not exist or a request fails
 */
export const uploadRecipePhoto = async (recipeId: string, file: Blob) => {
  const { client, userId } = await requireSession('attach a photo');

  // Read before uploading: an unknown or foreign recipe id must not leave an orphan file behind.
  const current = await client
    .from('recipes')
    .select('photo_path')
    .eq('id', recipeId)
    .maybeSingle();
  if (current.error) throw new Error(current.error.message);
  if (!current.data) throw new Error('Save the recipe before attaching a photo');

  const path = recipePhotoPath(userId, recipeId);
  const photo = await prepare(file);
  const storage = client.storage.from(BUCKET);
  const upload = await storage.upload(path, photo, { upsert: true, contentType: 'image/jpeg' });
  if (upload.error) throw new Error(upload.error.message);

  // Replacing a photo keeps the same path, so the row is already right. Skipping the write also
  // means a failure below can only happen on a first attach, where removing the file is safe.
  if (current.data.photo_path === path) return path;

  // The upload and the row update are not one transaction. `single()` turns "no row updated"
  // (recipe deleted meanwhile) into an error too.
  const update = await client
    .from('recipes')
    .update({ photo_path: path })
    .eq('id', recipeId)
    .select('id')
    .single();
  if (update.error) {
    await storage.remove([path]);
    throw new Error(update.error.message);
  }
  return path;
};

const detach = async (recipeId: string, path: string) => {
  const { client } = await requireSession('remove a photo');
  // Row first: if the second step fails, the recipe shows no photo rather than a broken one.
  const update = await client.from('recipes').update({ photo_path: null }).eq('id', recipeId);
  if (update.error) throw new Error(update.error.message);
  const removal = await client.storage.from(BUCKET).remove([path]);
  if (removal.error) throw new Error(removal.error.message);
};

/**
 * Removes a recipe's example photo: clears `photoPath`, then deletes the file from Storage.
 * Does nothing when the recipe has no photo. If the file removal fails the call rejects and can
 * be repeated with the same recipe object.
 * @param recipe recipe whose photo should go; only `id` and `photoPath` are read
 * @throws when signed out, Supabase is not configured or a request fails
 */
export const removeRecipePhoto = async (recipe: Pick<Recipe, 'id' | 'photoPath'>) => {
  if (recipe.photoPath) await detach(recipe.id, recipe.photoPath);
};

/**
 * Deletes a recipe for good, together with its example photo.
 *
 * Use this instead of `recipeCollection.remove`: deleting the row does not delete the file, and
 * a file without a row can no longer be found or removed from the app. The photo is removed at
 * the recipe's fixed path whether or not the caller's copy of the recipe knows about it.
 * @param recipeId recipe to delete
 * @throws when signed out, Supabase is not configured or a request fails. The recipe is kept when
 * its photo could not be removed
 */
export const deleteRecipe = async (recipeId: string) => {
  const { userId } = await requireSession('delete records');
  await detach(recipeId, recipePhotoPath(userId, recipeId));
  await recipeCollection.remove(recipeId);
};

/**
 * Creates a temporary link to a recipe's example photo. The bucket is private, so there is no
 * permanent URL; the link stops working after an hour and must not be stored.
 * @param path the recipe's `photoPath`
 * @returns a signed URL, or null when the recipe has no photo, the user is signed out or Supabase
 * is not configured
 * @throws when the link cannot be created, for example because the file is missing
 */
export const recipePhotoUrl = async (path: string | null | undefined) => {
  if (!path || !supabase) return null;
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw new Error(error.message);
  return data.signedUrl;
};

/**
 * Creates temporary links to several example photos in one request, for screens that show
 * recipes by picture. Like `recipePhotoUrl`, the links last an hour and must not be stored.
 * @param paths `photoPath` values of the recipes to show
 * @returns a signed URL per path; a path whose file is missing is left out. Empty when signed out
 * or Supabase is not configured
 * @throws when the request itself fails
 */
export const recipePhotoUrls = async (paths: readonly string[]) => {
  if (paths.length === 0 || !supabase) return {};
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls([...paths], SIGNED_URL_SECONDS);
  if (error) throw new Error(error.message);
  return Object.fromEntries(
    data.flatMap(item =>
      item.path && item.signedUrl && !item.error ? [[item.path, item.signedUrl]] : [],
    ),
  ) as Record<string, string>;
};
