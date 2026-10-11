import { describe, expect, it } from 'vitest';

import { computeLayout, type Size } from './layout';
import { OUTPUT_PRESETS, type OutputPreset } from './presets';

const preset = (id: string) => OUTPUT_PRESETS.find(p => p.id === id) as OutputPreset;
const ratio = (size: Size) => size.width / size.height;

const LANDSCAPE = { width: 6240, height: 4160 };

describe('computeLayout', () => {
  it('when a landscape photo goes into the 3:4 preset, it must fill the width at its original ratio without cropping', () => {
    const layout = computeLayout(LANDSCAPE, preset('3x4'));

    expect(layout.canvas).toEqual({ width: 1080, height: 1440 });
    expect(layout.photo.width).toBe(984);
    expect(ratio(layout.photo)).toBeCloseTo(ratio(LANDSCAPE), 2);
  });

  it('when a landscape photo goes into the 3:4 preset, the caption must sit right below the photo and the block must be vertically centered', () => {
    const layout = computeLayout(LANDSCAPE, preset('3x4'));
    const top = layout.photo.y;
    const bottom = layout.canvas.height - (layout.caption.y + layout.caption.height);

    expect(layout.caption.y).toBe(layout.photo.y + layout.photo.height + 26);
    expect(Math.abs(top - bottom)).toBeLessThanOrEqual(1);
    expect(layout.caption.x).toBe(layout.photo.x);
    expect(layout.caption.width).toBe(layout.photo.width);
  });

  it.each(['3x4', '4x5', '1x1', '9x16'])(
    'when a photo of any ratio goes into the %s preset, the photo and caption must stay inside the margins',
    id => {
      for (const photo of [
        { width: 4160, height: 6240 },
        LANDSCAPE,
        { width: 3000, height: 3000 },
        { width: 6000, height: 2000 },
      ]) {
        const { canvas, photo: rect, caption } = computeLayout(photo, preset(id));

        expect(rect.x).toBeGreaterThanOrEqual(48);
        expect(rect.y).toBeGreaterThanOrEqual(48);
        expect(rect.x + rect.width).toBeLessThanOrEqual(canvas.width - 48);
        expect(caption.y + caption.height).toBeLessThanOrEqual(canvas.height - 47);
        expect(ratio(rect)).toBeCloseTo(ratio(photo), 1);
      }
    },
  );

  it('when a large photo goes into the original preset, its long edge must become 2048 and the canvas must wrap it by the margins only', () => {
    const layout = computeLayout(LANDSCAPE, preset('original'));

    expect(layout.photo.width).toBe(2048);
    expect(layout.photo.height).toBe(1365);
    expect(layout.canvas.width).toBe(2048 + layout.photo.x * 2);
    expect(layout.caption.y + layout.caption.height + layout.photo.y).toBe(layout.canvas.height);
  });

  it('when a photo smaller than 2048 on its long edge goes into the original preset, it must not be upscaled', () => {
    const layout = computeLayout({ width: 1200, height: 800 }, preset('original'));

    expect(layout.photo.width).toBe(1200);
    expect(layout.photo.height).toBe(800);
  });

  it('when full detail is chosen for a fixed preset, the photo must be drawn at its own resolution and the canvas keep the preset ratio', () => {
    const layout = computeLayout({ width: 3000, height: 2000 }, preset('3x4'), 'full');

    expect(layout.photo.width).toBe(3000);
    expect(ratio(layout.canvas)).toBeCloseTo(3 / 4, 2);
    expect(layout.caption.y).toBeGreaterThan(layout.photo.y + layout.photo.height);
  });

  it('when full detail is chosen but the photo is smaller than the preset, the canvas must not shrink below the preset size', () => {
    const layout = computeLayout({ width: 600, height: 400 }, preset('3x4'), 'full');

    expect(layout.canvas).toEqual({ width: 1080, height: 1440 });
  });

  it('when full detail would exceed the browser canvas limit, the canvas must be scaled down to stay within it', () => {
    const layout = computeLayout(LANDSCAPE, preset('9x16'), 'full');

    expect(layout.canvas.width * layout.canvas.height).toBeLessThanOrEqual(16_000_000);
    expect(ratio(layout.photo)).toBeCloseTo(ratio(LANDSCAPE), 2);
    expect(layout.photo.x + layout.photo.width).toBeLessThanOrEqual(layout.canvas.width);
  });

  it('when full detail is chosen for the original preset, the long edge must not be capped at 2048', () => {
    const layout = computeLayout({ width: 3000, height: 2000 }, preset('original'), 'full');

    expect(layout.photo.width).toBe(3000);
  });
});
