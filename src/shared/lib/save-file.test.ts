import { describe, expect, it } from 'vitest';

import { batchSaveWay, numberedName } from './save-file';

describe('batchSaveWay', () => {
  it('when a folder can be picked, it must save into a folder, even where sharing works', () => {
    expect(batchSaveWay({ pickFolder: true, shareFiles: true, touch: false })).toBe('folder');
  });

  it('when on a touch screen that shares files, it must hand the batch to the share sheet', () => {
    expect(batchSaveWay({ pickFolder: false, shareFiles: true, touch: true })).toBe('share');
  });

  it('when a desktop browser can share files but not pick a folder, it must make one ZIP', () => {
    // A Mac's Safari: its share sheet is not where photos are saved.
    expect(batchSaveWay({ pickFolder: false, shareFiles: true, touch: false })).toBe('zip');
  });

  it('when nothing else works, it must make one ZIP', () => {
    expect(batchSaveWay({ pickFolder: false, shareFiles: false, touch: true })).toBe('zip');
  });
});

describe('numberedName', () => {
  it('when a file name has an extension, it must number before the extension', () => {
    expect(numberedName('DSCF1234_stockroll_4x5.jpg', 2)).toBe('DSCF1234_stockroll_4x5 (2).jpg');
  });

  it('when a file name has no extension, it must number at the end', () => {
    expect(numberedName('notes', 3)).toBe('notes (3)');
  });
});
