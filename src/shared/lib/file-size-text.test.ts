import { describe, expect, it } from 'vitest';

import { fileSizeText } from './file-size-text';

const POSTING = { width: 1080, height: 1350 };
const FULL = { width: 7728, height: 9660 };
const WORDS = { own: "The photo's own size." };

describe('fileSizeText', () => {
  it('when For posting is chosen, it must give its size and what it is for', () => {
    expect(
      fileSizeText({ detail: 'optimized', posting: POSTING, original: FULL, wanted: FULL }, WORDS),
    ).toBe('1080×1350 · Smaller file, for posting.');
  });

  it('when Original keeps the full size, it must give that size without a warning', () => {
    expect(
      fileSizeText({ detail: 'full', posting: POSTING, original: FULL, wanted: FULL }, WORDS),
    ).toBe("7728×9660 · The photo's own size.");
  });

  it('when the browser holds Original back, it must give both sizes, the reason and the way out', () => {
    const text = fileSizeText(
      { detail: 'full', posting: POSTING, original: { width: 3578, height: 4472 }, wanted: FULL },
      WORDS,
    );
    expect(text).toContain('3578×4472');
    expect(text).toContain('not 7728×9660');
    expect(text).toContain("this browser can't draw larger");
    expect(text).toContain('Save on a computer');
  });

  it('when the example photo sets the card size, it must say so and how to get more', () => {
    const text = fileSizeText(
      {
        detail: 'full',
        posting: POSTING,
        original: { width: 1361, height: 1701 },
        wanted: { width: 1361, height: 1701 },
        byExample: true,
      },
      { own: 'The photos at their own detail.', after: 'The preview stays the same.' },
    );
    expect(text).toBe(
      "1361×1701 · The example photo is kept small, so the card can't be sharper. Add the original photo for more. The preview stays the same.",
    );
  });
});
