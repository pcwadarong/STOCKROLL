import { describe, expect, it } from 'vitest';

import { looksLikeBrowserCapture } from './capture-hint';

const NOW = 1_800_000_000_000;

describe('looksLikeBrowserCapture', () => {
  it('when a file with no shooting info was written seconds before it was opened, it must be flagged', () => {
    expect(looksLikeBrowserCapture({}, NOW - 5_000, NOW)).toBe(true);
  });

  it('when a file with no shooting info is old, such as a film scan, it must not be flagged', () => {
    expect(looksLikeBrowserCapture({}, NOW - 86_400_000, NOW)).toBe(false);
  });

  it('when a fresh file carries any shooting info, it must not be flagged', () => {
    expect(looksLikeBrowserCapture({ iso: 200 }, NOW - 5_000, NOW)).toBe(false);
    expect(looksLikeBrowserCapture({ scanner: 'Noritsu' }, NOW - 5_000, NOW)).toBe(false);
  });

  it('when the file claims to be newer than the moment it was opened, it must not be flagged', () => {
    expect(looksLikeBrowserCapture({}, NOW + 60_000, NOW)).toBe(false);
  });
});
