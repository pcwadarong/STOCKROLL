import { describe, expect, it } from 'vitest';

import {
  decodeErrorText,
  editorStatusText,
  openErrorText,
  previewStateOf,
  saveSummaryText,
  savingProgressText,
} from './batch-text';

describe('savingProgressText', () => {
  it('when the third of twelve photos is being saved, it must read "Saving 3 of 12…"', () => {
    expect(savingProgressText({ current: 3, total: 12 })).toBe('Saving 3 of 12…');
  });
});

describe('saveSummaryText', () => {
  it('when every photo was handed to the browser, it must say they were sent, not that they were saved', () => {
    const summary = saveSummaryText({ sent: 12, total: 12, failed: [], stopped: false });
    expect(summary).toBe("Sent 12 photos to your browser's downloads.");
    expect(summary).not.toMatch(/saved/i);
  });

  it('when the batch is a single photo, it must use the singular', () => {
    expect(saveSummaryText({ sent: 1, total: 1, failed: [], stopped: false })).toBe(
      "Sent 1 photo to your browser's downloads.",
    );
  });

  it('when some photos could not be exported, it must count only the sent ones and name the failures', () => {
    expect(saveSummaryText({ sent: 2, total: 3, failed: ['b.jpg'], stopped: false })).toBe(
      "Sent 2 of 3 photos to your browser's downloads. Could not export: b.jpg.",
    );
  });

  it('when the user stopped the run, it must say so and count what was sent before', () => {
    expect(saveSummaryText({ sent: 5, total: 12, failed: [], stopped: true })).toBe(
      "Stopped. Sent 5 of 12 photos to your browser's downloads.",
    );
  });

  it('when more than three photos failed, it must name three and count the rest', () => {
    const failed = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'];
    expect(saveSummaryText({ sent: 0, total: 5, failed, stopped: false })).toBe(
      "Sent 0 of 5 photos to your browser's downloads. Could not export: a.jpg, b.jpg, c.jpg and 2 more.",
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

describe('decodeErrorText', () => {
  it('when a photo fails to decode at full size, it must name the photo and both ways out', () => {
    const message = decodeErrorText('big.jpg');
    expect(message).toContain('big.jpg');
    expect(message).toMatch(/try again/i);
    expect(message).toMatch(/remove/i);
  });
});

describe('previewStateOf', () => {
  const photo = { hasPhoto: true, hasBitmap: false, decodeFailed: false, saving: false };

  it('when no photo is open, it must be empty', () => {
    expect(previewStateOf({ ...photo, hasPhoto: false })).toBe('empty');
  });

  it('when the current photo has no bitmap yet, it must be loading', () => {
    expect(previewStateOf(photo)).toBe('loading');
  });

  it('when the bitmap is decoded, it must be ready', () => {
    expect(previewStateOf({ ...photo, hasBitmap: true })).toBe('ready');
  });

  it('when the decode failed, it must be failed instead of loading forever', () => {
    expect(previewStateOf({ ...photo, decodeFailed: true })).toBe('failed');
  });

  it('when "Save all" is running, it must be saving even though the bitmap is given up', () => {
    expect(previewStateOf({ ...photo, saving: true })).toBe('saving');
    expect(previewStateOf({ ...photo, saving: true, decodeFailed: true })).toBe('saving');
  });
});

describe('editorStatusText', () => {
  const idle = { saving: null, reading: 0, loading: false, message: '' };

  it('when nothing is happening, it must show the last result message', () => {
    expect(editorStatusText({ ...idle, message: 'Applied to all 3 photos.' })).toBe(
      'Applied to all 3 photos.',
    );
  });

  it('when files are still being read, it must show how many are left instead of an old result', () => {
    expect(editorStatusText({ ...idle, reading: 4, message: 'Applied to all 3 photos.' })).toBe(
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
