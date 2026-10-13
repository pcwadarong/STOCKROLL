import { describe, expect, it } from 'vitest';

import { buildCaption, captionHeight, EMPTY_INFO, type FrameInfo } from './caption';

const FULL: FrameInfo = {
  camera: 'X-T50',
  lens: 'XF 16-80mm F4',
  look: 'Classic Chrome',
  iso: 'ISO1250',
  focal: '72mm',
  aperture: 'F5.6',
  shutter: '1/250s',
  date: '2026/07/30',
};

describe('buildCaption', () => {
  it('when the label template has everything, it must put the camera and lens left and the exposure and look right', () => {
    expect(buildCaption('label', FULL).rows).toEqual([
      { kind: 'sides', left: 'Shot on X-T50', right: 'ISO1250 72mm F5.6 1/250s', strong: true },
      { kind: 'sides', left: 'XF 16-80mm F4', right: 'Classic Chrome', strong: false },
    ]);
  });

  it('when there is no shooting info, it must produce no rows instead of blank lines', () => {
    for (const template of ['label', 'center', 'bar', 'overlay', 'stamp', 'film', 'text'] as const)
      expect(buildCaption(template, EMPTY_INFO).rows).toEqual([]);
  });

  it('when only some values exist, it must print those and leave the rest out', () => {
    const scan = { ...EMPTY_INFO, camera: 'Capios 125S', look: 'Kodak UltraMax 400' };

    expect(buildCaption('center', scan).rows).toEqual([
      { kind: 'text', text: 'Capios 125S', strong: true },
      { kind: 'text', text: 'Kodak UltraMax 400', strong: false },
    ]);
    expect(buildCaption('bar', scan).rows).toEqual([]);
  });

  it('when the bar template is used, it must spread aperture, shutter, ISO and focal length as cells', () => {
    expect(buildCaption('bar', FULL).rows).toEqual([
      { kind: 'cells', cells: ['F5.6', '1/250s', 'ISO1250', '72mm'] },
    ]);
  });

  it('when the label template has a look and own text, the exposure must move up and the text must end the right column', () => {
    expect(buildCaption('label', FULL, ['Seoul', '2026']).rows).toEqual([
      { kind: 'sides', left: '', right: 'ISO1250 72mm F5.6 1/250s', strong: true },
      {
        kind: 'sides',
        left: 'Shot on X-T50',
        right: 'Classic Chrome',
        strong: true,
        rightStrong: false,
      },
      { kind: 'sides', left: 'XF 16-80mm F4', right: 'Seoul · 2026', strong: false },
    ]);
  });

  it('when the label template has no look, own text must take its place under the exposure', () => {
    expect(buildCaption('label', { ...FULL, look: '' }, ['Seoul']).rows).toEqual([
      { kind: 'sides', left: 'Shot on X-T50', right: 'ISO1250 72mm F5.6 1/250s', strong: true },
      { kind: 'sides', left: 'XF 16-80mm F4', right: 'Seoul', strong: false },
    ]);
  });

  it('when the centered template has own text, up to two lines must follow the shooting info', () => {
    expect(buildCaption('center', FULL, ['Seoul', '2026']).rows.slice(2)).toEqual([
      { kind: 'text', text: 'Seoul', strong: false },
      { kind: 'text', text: '2026', strong: false },
    ]);
  });

  it('when the overlay template has own text, it must be one line under the shooting info', () => {
    expect(buildCaption('overlay', FULL, ['Seoul', '2026']).rows.slice(2)).toEqual([
      { kind: 'text', text: 'Seoul · 2026', strong: false },
    ]);
  });

  it('when the bar template is used, own text must have no place in it', () => {
    expect(buildCaption('bar', FULL, ['Seoul']).rows).toEqual(buildCaption('bar', FULL).rows);
  });

  it('when the date stamp has own text, it must sit under the exposure read-out', () => {
    const rows = buildCaption('stamp', FULL, ['Seoul']).rows;

    expect(rows.at(-1)).toMatchObject({ kind: 'sides', right: 'SEOUL' });
    expect(rows.at(-2)).toMatchObject({ kind: 'sides', right: 'ISO1250' });
  });

  it('when the film strip has own text, it must be the second row, printed at the right of the upper strip', () => {
    expect(buildCaption('film', FULL, ['Seoul']).rows[1]).toEqual({
      kind: 'sides',
      left: '',
      right: 'SEOUL',
      strong: false,
    });
    // With no shooting info the text must still be the second row, not slide down to the first.
    expect(buildCaption('film', EMPTY_INFO, ['Seoul']).rows).toEqual([
      { kind: 'sides', left: '', right: '', strong: false },
      { kind: 'sides', left: '', right: 'SEOUL', strong: false },
    ]);
  });

  it('when the Text template is used, it must show the own lines and no shooting info', () => {
    expect(buildCaption('text', FULL, ['Seoul', '2026'], true).rows).toEqual([
      { kind: 'mark', text: 'Seoul', image: true },
      { kind: 'text', text: '2026', strong: false },
    ]);
  });

  it('when the Text template has only an image, it must still make a row for it', () => {
    expect(buildCaption('text', FULL, [], true).rows).toEqual([
      { kind: 'mark', text: '', image: true },
    ]);
  });

  it('when the Text template has no text and no image, it must show the photo alone', () => {
    expect(buildCaption('text', FULL).rows).toEqual([]);
  });

  it('when the overlay template is used, the text must go over the photo in a light tone', () => {
    const block = buildCaption('overlay', FULL);

    expect(block.placement).toBe('over');
    expect(block.tone).toBe('light');
  });

  it('when the date stamp has columns of different lengths, both must sit on the bottom row', () => {
    const noDate = { ...FULL, date: '', lens: '' };
    const rows = buildCaption('stamp', noDate).rows;

    expect(rows).toEqual([
      { kind: 'sides', left: '', right: 'F5.6', strong: false },
      { kind: 'sides', left: '', right: '1/250S', strong: false },
      { kind: 'sides', left: 'X-T50', right: 'ISO1250', strong: false },
    ]);
  });

  it('when the file records no date, the date stamp must not print one', () => {
    const rows = buildCaption('stamp', { ...FULL, date: '' }).rows;

    expect(rows.some(row => row.kind === 'sides' && /\d{4}\/\d{2}/.test(row.left))).toBe(false);
  });

  it('when the film strip has a film or look, it must print that on the edge; otherwise the camera', () => {
    const [first] = buildCaption('film', FULL).rows;
    const [fallback] = buildCaption('film', { ...FULL, look: '' }).rows;

    expect(first).toMatchObject({ kind: 'sides', left: 'CLASSIC CHROME' });
    expect(fallback).toMatchObject({ kind: 'sides', left: 'X-T50' });
  });
});

describe('captionHeight', () => {
  it('when there are no rows, it must reserve no height', () => {
    expect(captionHeight([], 1)).toBe(0);
  });

  it('when the label caption has its two rows, it must be the classic 74 high', () => {
    expect(captionHeight(buildCaption('label', FULL).rows, 1)).toBe(74);
  });

  it('when the text is larger, the caption must grow by the same factor', () => {
    const rows = buildCaption('label', FULL).rows;

    expect(captionHeight(rows, 1.25)).toBe(74 * 1.25);
  });
});

describe('captionHeight with an image', () => {
  it('when the Text row carries an image, the row must be as tall as the image square', () => {
    expect(captionHeight(buildCaption('text', FULL, ['Seoul'], true).rows, 1)).toBe(64);
    expect(captionHeight(buildCaption('text', FULL, ['Seoul']).rows, 1)).toBe(34);
  });
});
