/**
 * The canvas size every browser this app targets is believed to draw. Mobile Safari refuses
 * canvases above 16,777,216 pixels (4096²) and fails silently; this stays a little under. It is
 * the starting point where the device cannot be asked, such as in tests.
 */
export const SAFE_CANVAS_PIXELS = 16_000_000;

/** A pixel budget for a canvas of a given shape: the most pixels it may have. */
export type PixelBudget = (width: number, height: number) => number;

/** The budget that assumes nothing about the device. */
export const safePixelBudget: PixelBudget = () => SAFE_CANVAS_PIXELS;

// Common limits above the safe size, smallest first: mobile Safari stops at 4096², desktop
// browsers somewhere between tens and hundreds of millions.
const STEPS = [
  16_777_216, 20_000_000, 25_000_000, 32_000_000, 40_000_000, 50_000_000, 64_000_000, 80_000_000,
  100_000_000, 134_217_728, 268_435_456,
];

/**
 * Lists the canvas sizes to try for a drawing that wants `wanted` pixels, smallest first: the
 * common limits between what is known to draw and what is known not to, the wanted size itself,
 * and the next common limit past it. Trying stops at the first that fails, so a phone never makes a canvas far past its
 * limit to find out.
 * @param wanted pixels the drawing would have at its own resolution
 * @param known the largest size known to draw and the smallest known not to
 * @returns pixel counts to try, in order, each below `known.bad`
 */
export const probeSteps = (wanted: number, known: { good: number; bad: number }) => {
  if (wanted <= known.good) return [];
  const limit = Math.min(wanted, known.bad);
  const between = STEPS.filter(step => step > known.good && step < limit);
  if (wanted >= known.bad) return between;
  // One common limit past the wanted size too, so a caption that adds a line or two does not
  // send the next drawing back to ask.
  const headroom = STEPS.find(step => step > wanted && step < known.bad);
  return headroom ? [...between, wanted, headroom] : [...between, wanted];
};

/**
 * Gives a canvas size the pixel count `pixels`, keeping the shape of `width` × `height`.
 * @param width wanted width
 * @param height wanted height
 * @param pixels pixel count to fit
 * @returns the scaled size, never larger than the wanted one
 */
export const sizeForPixels = (width: number, height: number, pixels: number) => {
  const factor = Math.min(1, Math.sqrt(pixels / (width * height)));
  return { width: Math.floor(width * factor), height: Math.floor(height * factor) };
};

/**
 * Tells whether this browser can draw on a canvas of the given size, by drawing its far corner
 * and reading it back — a canvas past the limit is made without complaint and stays blank.
 */
const canDraw = (width: number, height: number) => {
  const big = document.createElement('canvas');
  const dot = document.createElement('canvas');
  let fits = false;
  try {
    big.width = width;
    big.height = height;
    const context = big.getContext('2d');
    if (context) {
      context.fillStyle = 'rgb(0 0 0)';
      context.fillRect(width - 1, height - 1, 1, 1);
      dot.width = 1;
      dot.height = 1;
      const read = dot.getContext('2d', { willReadFrequently: true });
      read?.drawImage(big, width - 1, height - 1, 1, 1, 0, 0, 1, 1);
      fits = (read?.getImageData(0, 0, 1, 1).data[3] ?? 0) > 0;
    }
  } catch {
    fits = false;
  } finally {
    // Safari keeps a canvas's memory until it is sized down, not when it is dropped.
    big.width = 0;
    big.height = 0;
    dot.width = 0;
    dot.height = 0;
  }
  return fits;
};

// What has been learned about this browser, by area: the largest canvas known to draw and the
// smallest known not to. Area, not exact size: a caption that adds a few rows does not ask again.
// Everything up to the safe size is taken to draw without asking.
const known = { good: SAFE_CANVAS_PIXELS, bad: Infinity };

/**
 * The most pixels this device can draw, from what is already known, without trying anything:
 * for use while rendering. Until a size above the safe one is tried, it allows the safe size.
 * @param width width the drawing wants
 * @param height height the drawing wants
 * @returns pixel count to keep the canvas within
 */
export const knownPixelBudget: PixelBudget = (width, height) =>
  Math.min(width * height, known.good);

/**
 * Tells whether `knownPixelBudget` already gives the device's answer for this size, or whether
 * `devicePixelBudget` still has to try.
 * @param width width the drawing wants
 * @param height height the drawing wants
 * @returns true when nothing is left to try
 */
export const pixelBudgetKnown = (width: number, height: number) =>
  probeSteps(width * height, known).length === 0;

/**
 * The most pixels this device can draw for a canvas of this size: the wanted size when it draws,
 * otherwise the largest common limit that does. Sizes are tried smallest first and trying stops
 * at the first failure, so a phone does not make a canvas far past its limit; what is learned is
 * kept for the rest of the visit. Call it outside rendering — trying makes a canvas that large.
 * @param width width the drawing wants
 * @param height height the drawing wants
 * @returns pixel count to keep the canvas within
 */
export const devicePixelBudget: PixelBudget = (width, height) => {
  for (const pixels of probeSteps(width * height, known)) {
    // The step past the wanted size is larger than the drawing: tried at its own size, not capped
    // to the drawing's, or a size never made would be taken as drawable.
    const by = Math.sqrt(pixels / (width * height));
    if (!canDraw(Math.floor(width * by), Math.floor(height * by))) {
      known.bad = pixels;
      break;
    }
    known.good = pixels;
  }
  return knownPixelBudget(width, height);
};
