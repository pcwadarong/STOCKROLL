import { describe, expect, it } from 'vitest';

import {
  decodeErrorText,
  editorStatusText,
  openErrorText,
  preparingText,
  previewStateOf,
  queueFullText,
  saveSummaryText,
  savingProgressText,
  shareButtonText,
  shareReadyText,
  zipName,
} from './batch-text';

describe('savingProgressText', () => {
  it('when the third of twelve photos is being saved, it must read "Saving 3 of 12…"', () => {
    expect(savingProgressText({ current: 3, total: 12 })).toBe('Saving 3 of 12…');
  });
});

describe('saveSummaryText', () => {
  const zip = { way: 'zip', name: 'stockroll-2026-10-20-12-photos.zip' } as const;
  const folder = { way: 'folder', folder: 'Exports' } as const;

  it('when a ZIP was handed to the browser, it must say it was sent, not that it was saved', () => {
    const summary = saveSummaryText({ sent: 12, total: 12, failed: [], stopped: false, to: zip });
    expect(summary).toBe("Sent stockroll-2026-10-20-12-photos.zip to your browser's downloads.");
    expect(summary).not.toMatch(/saved/i);
  });

  it('when photos were written to a picked folder, it must say they were saved there', () => {
    expect(saveSummaryText({ sent: 12, total: 12, failed: [], stopped: false, to: folder })).toBe(
      'Saved 12 photos to “Exports”.',
    );
  });

  it('when the batch is a single photo, it must use the singular', () => {
    expect(saveSummaryText({ sent: 1, total: 1, failed: [], stopped: false, to: folder })).toBe(
      'Saved 1 photo to “Exports”.',
    );
  });

  it('when some photos could not be exported, it must count only the made ones and name the failures', () => {
    expect(
      saveSummaryText({ sent: 2, total: 3, failed: ['b.jpg'], stopped: false, to: folder }),
    ).toBe('Saved 2 of 3 photos to “Exports”. Could not export: b.jpg.');
  });

  it('when the user stopped a folder run, it must count the photos already written', () => {
    expect(saveSummaryText({ sent: 5, total: 12, failed: [], stopped: true, to: folder })).toBe(
      'Stopped. Saved 5 of 12 photos to “Exports”.',
    );
  });

  it('when the user stopped a ZIP or a share, it must say nothing was made', () => {
    expect(saveSummaryText({ sent: 5, total: 12, failed: [], stopped: true, to: zip })).toBe(
      'Stopped. Nothing was saved.',
    );
    expect(
      saveSummaryText({ sent: 5, total: 12, failed: [], stopped: true, to: { way: 'share' } }),
    ).toBe('Stopped. Nothing was shared.');
  });

  it('when photos reached the share sheet, it must say they were handed over, not saved', () => {
    expect(
      saveSummaryText({ sent: 3, total: 3, failed: [], stopped: false, to: { way: 'share' } }),
    ).toBe('Handed 3 photos to the share sheet.');
  });

  it('when more than three photos failed, it must name three and count the rest', () => {
    const failed = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'];
    expect(saveSummaryText({ sent: 0, total: 5, failed, stopped: false, to: folder })).toBe(
      'Saved 0 of 5 photos to “Exports”. Could not export: a.jpg, b.jpg, c.jpg and 2 more.',
    );
  });
});

describe('zipName', () => {
  it('when a batch is zipped, it must be named for the app, the day and the count', () => {
    expect(zipName(12, new Date(2026, 9, 20))).toBe('stockroll-2026-10-20-12-photos.zip');
    expect(zipName(1, new Date(2026, 0, 5))).toBe('stockroll-2026-01-05-1-photo.zip');
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

describe('queueFullText', () => {
  it('when every chosen file fit, it must say nothing', () => {
    expect(queueFullText(0, 50)).toBe('');
  });

  it('when files were left unopened, it must say how many and name the limit', () => {
    expect(queueFullText(1, 50)).toContain('1 photo was not opened');
    expect(queueFullText(4, 50)).toContain('4 photos were not opened');
    expect(queueFullText(4, 50)).toContain('up to 50 photos');
  });
});

describe('shareReadyText', () => {
  it('when the whole batch waits for a tap, it must say they are ready and why a tap is needed', () => {
    expect(shareReadyText({ start: 0, end: 13, total: 13 })).toBe(
      '13 photos are ready. Your phone opens its save options only right after a tap.',
    );
  });

  it('when the last part is one photo, it must name it alone', () => {
    expect(shareReadyText({ start: 12, end: 13, total: 13 })).toMatch(/^Photo 13 of 13 is next/);
    expect(shareButtonText({ start: 12, end: 13, total: 13 })).toBe(
      'Choose where to save photo 13 of 13',
    );
  });

  it('when the batch goes in parts, it must say which photos are next and why', () => {
    expect(shareReadyText({ start: 8, end: 13, total: 13 })).toBe(
      'Photos 9–13 of 13 are next: your phone takes this many at a time. Your phone opens its save options only right after a tap.',
    );
  });
});

describe('shareButtonText', () => {
  it('when the button opens the save options, it must say saving rather than sharing', () => {
    expect(shareButtonText({ start: 0, end: 13, total: 13 })).toBe(
      'Choose where to save 13 photos',
    );
    expect(shareButtonText({ start: 0, end: 8, total: 13 })).toBe(
      'Choose where to save photos 1–8 of 13',
    );
  });
});

describe('preparingText', () => {
  it('when photos are still being made ahead, it must count them', () => {
    expect(preparingText({ done: 9, total: 13 })).toBe('Getting 9 of 13 ready…');
  });

  it('when every chosen photo is made, it must say they are ready', () => {
    expect(preparingText({ done: 13, total: 13 })).toBe('13 photos ready.');
  });
});
