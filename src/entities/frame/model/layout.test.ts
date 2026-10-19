import { describe, expect, it } from 'vitest';

import { computeLayout, defaultSpec, type FrameSpec, type Size } from './layout';
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

  it('when full detail is chosen but the photo is smaller than the preset, the canvas must keep the preset size and the photo its own size', () => {
    const layout = computeLayout({ width: 600, height: 400 }, preset('3x4'), 'full');

    expect(layout.canvas).toEqual({ width: 1080, height: 1440 });
    expect(layout.photo.width).toBe(600);
    expect(layout.photo.height).toBe(400);
    expect(layout.caption.width).toBe(600);
  });

  it('when full detail would exceed the browser canvas limit, the canvas must be scaled down to stay within it', () => {
    const layout = computeLayout(LANDSCAPE, preset('9x16'), 'full');

    expect(layout.canvas.width * layout.canvas.height).toBeLessThanOrEqual(16_000_000);
    expect(ratio(layout.photo)).toBeCloseTo(ratio(LANDSCAPE), 2);
    expect(layout.photo.x + layout.photo.width).toBeLessThanOrEqual(layout.canvas.width);
  });

  it('when the device can draw the full resolution, the photo must be drawn at its own size', () => {
    const xt50 = { width: 7728, height: 5152 };
    const roomy = () => 300_000_000;
    const layout = computeLayout(xt50, preset('original'), 'full', undefined, roomy);

    expect(layout.photo.width).toBe(7728);
    expect(layout.photo.height).toBe(5152);
  });

  it('when the device draws less than the full resolution, the canvas must stay within its budget', () => {
    const xt50 = { width: 7728, height: 5152 };
    const asked: number[] = [];
    const budget = (width: number, height: number) => {
      asked.push(width * height);
      return 25_000_000;
    };
    const layout = computeLayout(xt50, preset('original'), 'full', undefined, budget);

    expect(layout.canvas.width * layout.canvas.height).toBeLessThanOrEqual(25_000_000);
    expect(layout.canvas.width * layout.canvas.height).toBeGreaterThan(16_000_000);
    expect(asked).toHaveLength(1);
  });

  it('when a canvas is within the size every browser draws, the device must not be asked', () => {
    const asked: number[] = [];
    computeLayout({ width: 3000, height: 2000 }, preset('original'), 'full', undefined, () => {
      asked.push(1);
      return 0;
    });

    expect(asked).toEqual([]);
  });

  it('when full detail is chosen for the original preset, the long edge must not be capped at 2048', () => {
    const layout = computeLayout({ width: 3000, height: 2000 }, preset('original'), 'full');

    expect(layout.photo.width).toBe(3000);
  });
});

describe('computeLayout with a frame spec', () => {
  const photo = { width: 3000, height: 2000 };
  const preset = OUTPUT_PRESETS[0];
  const spec = (patch: Partial<FrameSpec> = {}): FrameSpec => ({ ...defaultSpec(photo), ...patch });

  it('when the photo position is top or bottom, the block must touch that margin', () => {
    const top = computeLayout(photo, preset, 'optimized', spec({ position: 'top' }));
    const bottom = computeLayout(photo, preset, 'optimized', spec({ position: 'bottom' }));

    expect(top.photo.y).toBe(48);
    expect(bottom.caption.y + bottom.caption.height).toBe(1440 - 48);
  });

  it('when there is no padding, the photo must run edge to edge while the caption keeps side room', () => {
    const layout = computeLayout(photo, preset, 'optimized', spec({ margin: 0, position: 'top' }));

    expect(layout.photo.x).toBe(0);
    expect(layout.photo.width).toBe(1080);
    expect(layout.caption.x).toBe(24);
    expect(layout.caption.width).toBe(1080 - 48);
  });

  it('when the caption goes over the photo, it must lie inside the photo and take no room of its own', () => {
    const below = computeLayout(photo, preset, 'optimized', spec());
    const over = computeLayout(photo, preset, 'optimized', spec({ captionPlacement: 'over' }));

    expect(over.photo.height).toBe(below.photo.height);
    expect(over.caption.y).toBeGreaterThanOrEqual(over.photo.y);
    expect(over.caption.y + over.caption.height).toBeLessThanOrEqual(
      over.photo.y + over.photo.height,
    );
    // No caption below, so the photo alone is centered.
    expect(over.photo.y).toBeGreaterThan(below.photo.y);
  });

  it('when there is no caption, the photo alone must be centered', () => {
    const layout = computeLayout(photo, preset, 'optimized', spec({ captionHeight: 0 }));

    expect(layout.photo.y).toBe(Math.round((1440 - layout.photo.height) / 2));
    expect(layout.caption.height).toBe(0);
  });

  it('when the look has film strips, they must hug the photo above and below at its width', () => {
    const layout = computeLayout(
      photo,
      preset,
      'optimized',
      spec({ strip: 72, captionPlacement: 'strip', captionHeight: 28 }),
    );

    expect(layout.strips).not.toBeNull();
    expect(layout.strips!.top.y + layout.strips!.top.height).toBe(layout.photo.y);
    expect(layout.strips!.bottom.y).toBe(layout.photo.y + layout.photo.height);
    expect(layout.strips!.bottom.width).toBe(layout.photo.width);
  });

  it('when a wide cut is given, the drawn photo must take the shape of the cut, not of the file', () => {
    const source = { x: 0, y: 438, width: 3000, height: 1125 };
    const layout = computeLayout(photo, preset, 'optimized', spec({ source }));

    expect(layout.source).toEqual(source);
    expect(layout.photo.width / layout.photo.height).toBeCloseTo(3000 / 1125, 1);
  });

  it('when the original preset has no padding and no caption, the canvas must be exactly the photo', () => {
    const layout = computeLayout(
      photo,
      OUTPUT_PRESETS.find(item => item.kind === 'original')!,
      'optimized',
      spec({ margin: 0, captionHeight: 0 }),
    );

    expect(layout.canvas).toEqual({ width: 2048, height: 1365 });
    expect(layout.photo).toEqual({ x: 0, y: 0, width: 2048, height: 1365 });
  });

  it('when the preset is landscape, the photo must be fitted whole inside the wide canvas', () => {
    const wide = OUTPUT_PRESETS.find(item => item.id === '16x9')!;
    const layout = computeLayout(photo, wide, 'optimized', spec());
    expect(layout.canvas).toEqual({ width: 1920, height: 1080 });
    expect(layout.photo.width / layout.photo.height).toBeCloseTo(1.5, 2);
    expect(layout.photo.y).toBeGreaterThanOrEqual(0);
    expect(layout.photo.y + layout.photo.height).toBeLessThanOrEqual(1080);
  });
});

describe("computeLayout with room for the user's text", () => {
  const portrait = { width: 2000, height: 3000 };
  const landscape = { width: 3000, height: 2000 };
  const original = OUTPUT_PRESETS.find(item => item.kind === 'original')!;
  const spec = (photo: Size, patch: Partial<FrameSpec> = {}): FrameSpec => ({
    ...defaultSpec(photo),
    ...patch,
  });

  it('when a photo fills a fixed output and room is asked above it, the output must keep its size while the photo makes the room past the margin', () => {
    const plain = computeLayout(portrait, preset('4x5'), 'optimized', spec(portrait));
    const roomy = computeLayout(
      portrait,
      preset('4x5'),
      'optimized',
      spec(portrait, { markRoom: { above: 60, below: 0 } }),
    );

    expect(roomy.canvas).toEqual(plain.canvas);
    expect(roomy.photo.height).toBeLessThan(plain.photo.height);
    expect(roomy.photo.y).toBeGreaterThanOrEqual(48 + 60);
  });

  it('when the photo already has space to spare around it, asking for room must not move it', () => {
    const plain = computeLayout(landscape, preset('4x5'), 'optimized', spec(landscape));
    const roomy = computeLayout(
      landscape,
      preset('4x5'),
      'optimized',
      spec(landscape, { markRoom: { above: 60, below: 60 } }),
    );

    expect(roomy.photo).toEqual(plain.photo);
  });

  it('when the photo is set at the top and room is asked above it, it must sit that far below the margin', () => {
    const layout = computeLayout(
      landscape,
      preset('4x5'),
      'optimized',
      spec(landscape, { position: 'top', markRoom: { above: 60, below: 0 } }),
    );

    expect(layout.photo.y).toBe(48 + 60);
  });

  it('when room is asked below a photo with a caption, it must sit between the photo and the caption', () => {
    const layout = computeLayout(
      portrait,
      preset('4x5'),
      'optimized',
      spec(portrait, { position: 'bottom', markRoom: { above: 0, below: 60 } }),
    );

    expect(layout.caption.y).toBe(layout.photo.y + layout.photo.height + 60 + 26);
    expect(layout.caption.y + layout.caption.height).toBe(1350 - 48);
  });

  it('when room is asked below a photo with a caption on the original output, the caption must move down by the room', () => {
    const plain = computeLayout(landscape, original, 'optimized', spec(landscape));
    const roomy = computeLayout(
      landscape,
      original,
      'optimized',
      spec(landscape, { markRoom: { above: 0, below: 60 } }),
    );
    const room = Math.round(60 * plain.unit);

    expect(roomy.photo).toEqual(plain.photo);
    expect(roomy.caption.y).toBe(plain.caption.y + room);
    expect(roomy.canvas.height).toBe(plain.canvas.height + room);
  });

  it('when the output is the original, the canvas must grow by the room and keep the photo at its size', () => {
    const plain = computeLayout(landscape, original, 'optimized', spec(landscape));
    const roomy = computeLayout(
      landscape,
      original,
      'optimized',
      spec(landscape, { markRoom: { above: 60, below: 0 } }),
    );
    const room = Math.round(60 * plain.unit);

    expect(roomy.canvas).toEqual({ ...plain.canvas, height: plain.canvas.height + room });
    expect(roomy.photo).toEqual({ ...plain.photo, y: plain.photo.y + room });
  });
});
