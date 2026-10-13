import { inkFor, OUTPUT_PRESETS } from '@/entities/frame';
import {
  currentMark,
  drawMark,
  inkOver,
  type Mark,
  markLines,
  markRoomBelow,
} from '@/entities/mark';
import {
  CARD_AUTO_RATIO,
  CARD_GAP_UNITS,
  CARD_PADDING_UNITS,
  cardOwnSpot,
  type CardStyle,
  drawRecipeCard,
  formatRecipeText,
  photoAtCorner,
  type Recipe,
  recipeLines,
  recipePhotoUrl,
  type RecipeSettings,
  systemOf,
  SYSTEMS,
} from '@/entities/recipe';
import { ensureFont } from '@/shared/lib/canvas-fonts';
import { fitWithin } from '@/shared/lib/resize-image';
import { canShareFiles, canvasToJpeg, downloadBlob } from '@/shared/lib/save-file';

const CARD_QUALITY = 0.92;
/** Long edge photos added on the card screen are kept at: enough for the largest card. */
const ADDED_PHOTO_EDGE = 2160;

/**
 * The sizes a recipe card can be made in: as tall as its content, or one of the frame editor's
 * fixed output sizes.
 */
export const CARD_OUTPUTS = [
  { id: CARD_AUTO_RATIO, label: 'Auto', hint: 'As tall as the settings need', size: undefined },
  ...OUTPUT_PRESETS.flatMap(preset =>
    preset.kind === 'fixed'
      ? [
          {
            id: preset.id as string,
            label: preset.label as string,
            hint: preset.hint as string,
            size: { width: preset.width as number, height: preset.height as number },
          },
        ]
      : [],
  ),
];

/**
 * Finds the output a card style asks for. A ratio this version does not know is read as `Auto`.
 * @param ratio the ratio id kept in the card style
 * @returns the matching output
 */
export const cardOutputOf = (ratio: string) =>
  CARD_OUTPUTS.find(output => output.id === ratio) ?? CARD_OUTPUTS[0]!;

/**
 * Copies a recipe to the clipboard as plain text that can be pasted into a message — or back
 * into the paste box of a recipe form.
 * @param recipe recipe to copy
 * @param settings settings of the version on screen
 * @throws when the browser refuses clipboard access
 */
export const copyRecipeText = (recipe: Recipe, settings: RecipeSettings) =>
  navigator.clipboard.writeText(formatRecipeText(recipe.name, systemOf(recipe), settings));

/**
 * Loads a recipe's example photo for drawing on a canvas. It is fetched rather than set on an
 * `<img>`: a cross-origin image drawn that way taints the canvas and it could no longer be
 * encoded. The caller closes the bitmap when it is done with it.
 * @param path storage path of the photo, if the recipe has one
 * @returns the decoded photo, or undefined when the recipe has none
 * @throws when the photo cannot be loaded
 */
export const loadRecipePhoto = async (path: string | null | undefined) => {
  const url = await recipePhotoUrl(path);
  if (!url) return undefined;
  const response = await fetch(url);
  if (!response.ok) throw new Error('The example photo could not be loaded');
  return createImageBitmap(await response.blob());
};

/**
 * Decodes a photo the user picked on the card screen, turned upright and no larger than a card
 * can show. It is held in memory for the card only and never uploaded. The caller closes the
 * bitmap when it is done with it.
 * @param file image file picked on this device
 * @returns the decoded photo
 * @throws when the file cannot be decoded
 */
export const decodeCardPhoto = async (file: Blob) => {
  const full = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const size = fitWithin(full, ADDED_PHOTO_EDGE);
  if (size.width === full.width) return full;
  try {
    return await createImageBitmap(full, {
      resizeWidth: size.width,
      resizeHeight: size.height,
      resizeQuality: 'high',
    });
  } finally {
    full.close();
  }
};

type OwnText = { mark: Mark; image: ImageBitmap | null };

type Box = { x: number; y: number; width: number; height: number };
const scaled = (box: Box, by: number): Box => ({
  x: box.x * by,
  y: box.y * by,
  width: box.width * by,
  height: box.height * by,
});

/**
 * Draws a recipe as a card — its photos, name and settings — with the user's own text in the
 * place the card style gives it. The preview and the saved file both come from here, so they
 * cannot differ in anything but size. The caller makes sure the text's font is loaded
 * (`ensureFont`).
 * @param canvas canvas to draw on; its size is replaced
 * @param recipe recipe to render
 * @param settings settings of the version on the card
 * @param photos the photos on the card, in order
 * @param style the card's design, size, spacing, colors and place for the user's text
 * @param own the user's text settings and image
 * @param full draws at the detail the photos have instead of the working size. For saving: the
 * preview stays at the working size
 */
export const drawShareCard = (
  canvas: HTMLCanvasElement,
  recipe: Recipe,
  settings: RecipeSettings,
  photos: readonly ImageBitmap[],
  style: CardStyle,
  { mark, image }: OwnText,
  full = false,
) => {
  const system = systemOf(recipe);
  const spot = cardOwnSpot(style.ownPlace, style.design, photos.length > 0);
  // No photo here carries a shooting date the card could vouch for, so a date line prints nothing.
  const ownLines = markLines(mark);
  const layout = drawRecipeCard(
    canvas,
    { name: recipe.name, sub: SYSTEMS[system].label, lines: recipeLines(system, settings) },
    {
      photos,
      size: cardOutputOf(style.ratio).size,
      // Text under the content gets room of its own, so it never lands on the settings.
      footer:
        spot?.area === 'below' ? markRoomBelow(mark.size, ownLines.length, image !== null) : 0,
      padding: CARD_PADDING_UNITS[style.padding],
      gap: CARD_GAP_UNITS[style.gap],
      align: style.align,
      textFirst: style.textFirst,
      cover:
        style.design === 'cover'
          ? { place: style.textPlace, share: style.textSize / 100, dim: style.dim / 100 }
          : undefined,
      colors: {
        background: style.background,
        title: style.titleColor || undefined,
        text: style.textColor || undefined,
        fallback: inkFor(style.background).ink,
      },
      inkOver,
      full,
    },
  );
  const context = canvas.getContext('2d');
  if (!context || !spot) return;
  // The mark is placed in canvas pixels, so the card's boxes are scaled up to them.
  const { scale } = layout;
  // A corner of the photos means a corner of an actual photo: in a grid one cell is the text.
  const photo = spot.area === 'photo' ? photoAtCorner(layout, spot.position) : layout.photoArea;
  drawMark(
    context,
    spot.area === 'photo' ? 'photo' : 'image',
    {
      photo: photo && scaled(photo, scale),
      // Places below hang under the content; places at the edge ignore this.
      block: scaled(layout.block, scale),
      whole: { x: 0, y: 0, width: canvas.width, height: canvas.height },
    },
    // The card is laid out for a short edge of 1080, the size the mark's dimensions are given for.
    scale,
    { ...mark, position: spot.position },
    ownLines,
    image,
  );
};

/**
 * Renders a recipe card and hands it to the share sheet where the browser has one, otherwise to
 * the browser's downloads. It is drawn on a canvas of its own, apart from the preview, at the
 * file size the card style asks for. The image is made on the device; nothing is uploaded.
 * @param recipe recipe to render
 * @param settings settings of the version on the card
 * @param photos the photos on the card, already loaded, in order
 * @param style the card's design, size, spacing, colors and place for the user's text
 * @returns `shared` when the share sheet took it, `downloaded` when it went to the browser's
 * downloads (which does not tell the page whether the file was written), `cancelled` when the
 * user closed the share sheet
 * @throws when the image cannot be encoded
 */
export const shareRecipeCard = async (
  recipe: Recipe,
  settings: RecipeSettings,
  photos: readonly ImageBitmap[],
  style: CardStyle,
): Promise<'shared' | 'downloaded' | 'cancelled'> => {
  const own = currentMark();
  // A canvas draws in the fallback face when the font file has not arrived yet.
  await ensureFont(own.mark.font);
  const canvas = document.createElement('canvas');
  drawShareCard(canvas, recipe, settings, photos, style, own, style.detail === 'full');
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
};
