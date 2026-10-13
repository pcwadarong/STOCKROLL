/** A face that text can be drawn in on a canvas. */
export type FontId = 'sans' | 'grotesk' | 'serif' | 'typewriter' | 'display' | 'digital';

export const FONTS = [
  { value: 'sans', label: 'System sans' },
  { value: 'grotesk', label: 'Barlow' },
  { value: 'serif', label: 'Serif' },
  { value: 'typewriter', label: 'Courier Prime' },
  { value: 'display', label: 'Anton' },
  { value: 'digital', label: 'Segment display' },
] as const satisfies readonly { value: FontId; label: string }[];

type FontFace = {
  /** CSS font-family value used when drawing. */
  family: string;
  /** Weights for the strong and the quiet rows. A face with one weight repeats it. */
  strong: number;
  quiet: number;
  /** Loads the font files. Absent for system fonts, which need no loading. */
  load?: () => Promise<unknown>;
  /** Family name to wait for after loading. */
  wait?: string;
};

const SYSTEM_SANS = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

// Bundled faces are imported only when picked, so the default look costs no extra download.
export const FONT_FACES: Record<FontId, FontFace> = {
  sans: { family: SYSTEM_SANS, strong: 600, quiet: 400 },
  serif: { family: 'ui-serif, Georgia, "Times New Roman", serif', strong: 700, quiet: 400 },
  grotesk: {
    family: `"Barlow", ${SYSTEM_SANS}`,
    strong: 600,
    quiet: 400,
    wait: 'Barlow',
    load: () =>
      Promise.all([
        import('@fontsource/barlow/latin-400.css'),
        import('@fontsource/barlow/latin-600.css'),
      ]),
  },
  typewriter: {
    family: '"Courier Prime", ui-monospace, Menlo, monospace',
    strong: 700,
    quiet: 400,
    wait: 'Courier Prime',
    load: () =>
      Promise.all([
        import('@fontsource/courier-prime/latin-400.css'),
        import('@fontsource/courier-prime/latin-700.css'),
      ]),
  },
  // Anton is already loaded for the app's own wordmark.
  display: { family: `"Anton", ${SYSTEM_SANS}`, strong: 400, quiet: 400, wait: 'Anton' },
  digital: {
    family: '"DSEG14 Classic", ui-monospace, Menlo, monospace',
    strong: 400,
    quiet: 400,
    wait: 'DSEG14 Classic',
    load: () => import('@fontsource/dseg14-classic/latin-400.css'),
  },
};

const ready = new Map<FontId, Promise<void>>();

/**
 * Makes a font usable on a canvas. A canvas does not wait for web fonts: text drawn before the
 * file arrives is silently set in the fallback face, so every draw and every export waits on this
 * first. Resolves even when loading fails (offline, blocked), leaving the fallback face.
 * @param font the font about to be drawn in
 * @returns a promise that settles once the font is ready or has failed to load
 */
export const ensureFont = (font: FontId) => {
  const known = ready.get(font);
  if (known) return known;
  const face = FONT_FACES[font];
  const loading = (async () => {
    try {
      await face.load?.();
      if (face.wait)
        await Promise.all(
          [...new Set([face.strong, face.quiet])].map(weight =>
            document.fonts.load(`${weight} 24px "${face.wait}"`),
          ),
        );
    } catch {
      // Fall back to the next family in the stack.
    }
  })();
  ready.set(font, loading);
  return loading;
};
