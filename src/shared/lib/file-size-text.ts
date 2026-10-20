type Size = { width: number; height: number };

const dimensions = ({ width, height }: Size) => `${width}×${height}`;

/**
 * Words what the chosen file size will save at, for the line under the choice. When Original is
 * smaller than the photos ask for, it says by how much and why, with the way to get the full
 * size: a size that shrinks without a word is no use to someone with a size to meet.
 * @param sizes the choice (`optimized` is For posting), the sizes each choice saves at, the size
 *   Original would have on a device without a limit, and whether a reduced example photo sets
 *   the card's size
 * @param words what Original keeps when nothing holds it back, and a sentence to add to it
 * @returns one line of text
 */
export const fileSizeText = (
  sizes: {
    detail: 'optimized' | 'full';
    posting: Size;
    original: Size;
    wanted: Size;
    byExample?: boolean;
  },
  words: { own: string; after?: string },
) => {
  const { detail, posting, original, wanted, byExample } = sizes;
  if (detail === 'optimized') return `${dimensions(posting)} · Smaller file, for posting.`;
  if (original.width * original.height < wanted.width * wanted.height)
    return `Saved at ${dimensions(original)}, not ${dimensions(wanted)}: this browser can't draw larger. Save on a computer for the full size.`;
  const after = words.after ? ` ${words.after}` : '';
  if (byExample)
    return `${dimensions(original)} · The example photo is kept small, so the card can't be sharper. Add the original photo for more.${after}`;
  return `${dimensions(original)} · ${words.own}${after}`;
};
