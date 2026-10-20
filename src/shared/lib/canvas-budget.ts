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

// Sizes worth trying below what is wanted, largest first: where desktop browsers, phones and the
// Safari limit commonly sit. The last is the floor; nothing is tried below it.
const STEPS = [
  268_435_456,
  134_217_728,
  100_000_000,
  80_000_000,
  64_000_000,
  50_000_000,
  40_000_000,
  32_000_000,
  25_000_000,
  20_000_000,
  16_777_216,
  SAFE_CANVAS_PIXELS,
  12_000_000,
  8_000_000,
  4_000_000,
];

/**
 * Lists the canvas sizes to try for a drawing that wants `wanted` pixels: that size first, then
 * the common limits below it, largest first.
 * @param wanted pixels the drawing would have at its own resolution
 * @returns pixel counts to try, in order, never above `wanted`
 */
export const budgetSteps = (wanted: number) => {
  const below = STEPS.filter(step => step < wanted);
  return wanted <= STEPS.at(-1)! ? [wanted] : [wanted, ...below];
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

const drawable = new Map<string, boolean>();

/**
 * Tells whether this browser can draw on a canvas of the given size, by drawing its far corner
 * and reading it back — a canvas past the limit is made without complaint and stays blank.
 * Results are remembered: a batch of photos of one size asks once.
 */
const canDraw = (width: number, height: number) => {
  const key = `${width}x${height}`;
  const known = drawable.get(key);
  if (known !== undefined) return known;
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
  drawable.set(key, fits);
  return fits;
};

/**
 * The most pixels this device can draw for a canvas of this shape: the wanted size when it fits,
 * otherwise the largest common limit below it that does. Desktop browsers usually draw a camera's
 * full resolution; mobile Safari stops near 16.7 million pixels.
 * @param width width the drawing wants
 * @param height height the drawing wants
 * @returns pixel count to keep the canvas within
 */
export const devicePixelBudget: PixelBudget = (width, height) => {
  const steps = budgetSteps(width * height);
  const fits = steps.find(pixels => {
    const size = sizeForPixels(width, height, pixels);
    return canDraw(size.width, size.height);
  });
  return fits ?? steps.at(-1)!;
};
