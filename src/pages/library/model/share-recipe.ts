import { currentMark, drawMark, markLines, overlayArea } from '@/entities/mark';
import {
  drawRecipeCard,
  formatRecipeText,
  type Recipe,
  recipeLines,
  recipePhotoUrl,
  type RecipeSettings,
  systemOf,
  SYSTEMS,
} from '@/entities/recipe';
import { ensureFont } from '@/shared/lib/canvas-fonts';
import { canShareFiles, canvasToJpeg, downloadBlob } from '@/shared/lib/save-file';

const CARD_QUALITY = 0.92;

/**
 * Copies a recipe to the clipboard as plain text that can be pasted into a message — or back
 * into the paste box of a recipe form.
 * @param recipe recipe to copy
 * @param settings settings of the version on screen
 * @throws when the browser refuses clipboard access
 */
export const copyRecipeText = (recipe: Recipe, settings: RecipeSettings) =>
  navigator.clipboard.writeText(formatRecipeText(recipe.name, systemOf(recipe), settings));

// Fetched rather than set on an <img>: a cross-origin image drawn that way taints the canvas and
// it could no longer be encoded.
const loadPhoto = async (path: string | null | undefined) => {
  const url = await recipePhotoUrl(path);
  if (!url) return undefined;
  const response = await fetch(url);
  if (!response.ok) throw new Error('The example photo could not be loaded');
  return createImageBitmap(await response.blob());
};

/**
 * Renders a recipe as an image — its example photo, name and settings, with the user's own text
 * laid over it — and hands it to the share sheet where the browser has one, otherwise to the browser's downloads. The image is made
 * on the device; nothing is uploaded.
 * @param recipe recipe to render
 * @param settings settings of the version on screen
 * @param versionLabel version mark for the line under the name, such as "v3"
 * @returns `shared` when the share sheet took it, `downloaded` when it went to the browser's
 * downloads (which does not tell the page whether the file was written), `cancelled` when the
 * user closed the share sheet
 * @throws when the photo cannot be loaded or the image cannot be encoded
 */
export const shareRecipeCard = async (
  recipe: Recipe,
  settings: RecipeSettings,
  versionLabel: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> => {
  const system = systemOf(recipe);
  const { mark, image } = currentMark();
  // A canvas draws in the fallback face when the font file has not arrived yet.
  await ensureFont(mark.font);
  const photo = await loadPhoto(recipe.photoPath);
  try {
    const canvas = document.createElement('canvas');
    const layout = drawRecipeCard(
      canvas,
      {
        name: recipe.name,
        sub: `${SYSTEMS[system].label} · ${versionLabel}`,
        lines: recipeLines(system, settings),
      },
      photo,
    );
    const context = canvas.getContext('2d');
    if (context)
      drawMark(
        context,
        // A card has no template place for the text, and its photo carries no shooting date.
        overlayArea(mark.area, false) ?? 'image',
        { photo: layout.photo, whole: { x: 0, y: 0, width: layout.width, height: layout.height } },
        // The card is laid out 1080 wide, the width the mark's own dimensions are given for.
        1,
        mark,
        markLines(mark),
        image,
      );
    const blob = await canvasToJpeg(canvas, CARD_QUALITY);
    const filename = `${recipe.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'recipe'}.jpg`;

    if (!canShareFiles()) {
      void downloadBlob(blob, filename);
      return 'downloaded';
    }
    try {
      await navigator.share({ files: [new File([blob], filename, { type: 'image/jpeg' })] });
      return 'shared';
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return 'cancelled';
      // Safari refuses the share sheet when making the image outlasted the tap that asked for
      // it. The image is ready, so it goes to the downloads instead of being lost.
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') {
        void downloadBlob(blob, filename);
        return 'downloaded';
      }
      throw cause;
    }
  } finally {
    photo?.close();
  }
};
