import { describe, expect, it } from 'vitest';

import { editorStatusText, openErrorText, saveSummaryText, savingProgressText } from './batch-text';

describe('savingProgressText', () => {
  it('when the third of twelve photos is being saved, it must read "Saving 3 of 12…"', () => {
    expect(savingProgressText({ current: 3, total: 12 })).toBe('Saving 3 of 12…');
  });
});

describe('saveSummaryText', () => {
  it('when every photo was saved, it must say all of them were', () => {
    expect(saveSummaryText({ saved: 12, total: 12, failed: [], stopped: false })).toBe(
      'Saved all 12 photos.',
    );
  });

  it('when the batch is a single photo, it must use the singular', () => {
    expect(saveSummaryText({ saved: 1, total: 1, failed: [], stopped: false })).toBe(
      'Saved 1 photo.',
    );
  });

  it('when some photos failed, it must count only the saved ones and name the failures', () => {
    expect(saveSummaryText({ saved: 2, total: 3, failed: ['b.jpg'], stopped: false })).toBe(
      'Saved 2 of 3 photos. Could not save: b.jpg.',
    );
  });

  it('when the user stopped the run, it must say so and count what was saved before', () => {
    expect(saveSummaryText({ saved: 5, total: 12, failed: [], stopped: true })).toBe(
      'Stopped. Saved 5 of 12 photos.',
    );
  });

  it('when more than three photos failed, it must name three and count the rest', () => {
    const failed = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'];
    expect(saveSummaryText({ saved: 0, total: 5, failed, stopped: false })).toBe(
      'Saved 0 of 5 photos. Could not save: a.jpg, b.jpg, c.jpg and 2 more.',
    );
  });
});

describe('openErrorText', () => {
  it('when every file opened, it must return no message', () => {
    expect(openErrorText([])).toBe('');
  });

  it('when one file failed, it must name it and say which formats work', () => {
    expect(openErrorText(['notes.pdf'])).toBe(
      "notes.pdf can't be opened. Use a photo exported as JPEG, PNG or WebP.",
    );
  });

  it('when several files failed, it must count and name them', () => {
    expect(openErrorText(['a.pdf', 'b.heic'])).toBe(
      "2 files can't be opened: a.pdf, b.heic. Use photos exported as JPEG, PNG or WebP.",
    );
  });
});

describe('editorStatusText', () => {
  const idle = { saving: null, reading: 0, loading: false, message: '' };

  it('when nothing is happening, it must show the last result message', () => {
    expect(editorStatusText({ ...idle, message: 'Saved all 3 photos.' })).toBe(
      'Saved all 3 photos.',
    );
  });

  it('when files are still being read, it must show how many are left instead of an old result', () => {
    expect(editorStatusText({ ...idle, reading: 4, message: 'Saved all 3 photos.' })).toBe(
      'Reading 4 photos…',
    );
  });

  it('when the current photo is decoding, it must say the photo is loading', () => {
    expect(editorStatusText({ ...idle, loading: true })).toBe('Loading photo…');
  });

  it('when a save is running, it must show the save progress above everything else', () => {
    expect(
      editorStatusText({
        saving: { current: 3, total: 12 },
        reading: 2,
        loading: true,
        message: 'old',
      }),
    ).toBe('Saving 3 of 12…');
  });
});
