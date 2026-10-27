import { describe, expect, it } from 'vitest';

import { probeSteps, SAFE_CANVAS_PIXELS, safePixelBudget, sizeForPixels } from './canvas-budget';

describe('probeSteps', () => {
  const fresh = { good: SAFE_CANVAS_PIXELS, bad: Infinity };

  it('when a drawing wants a camera resolution, it must try the common limits smallest first, then the size itself', () => {
    const steps = probeSteps(39_814_656, fresh);
    expect(steps[0]).toBe(16_777_216);
    expect(steps).toContain(39_814_656);
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
  });

  it('when a drawing is within the size known to draw, it must try nothing', () => {
    expect(probeSteps(12_000_000, fresh)).toEqual([]);
    expect(probeSteps(30_000_000, { good: 32_000_000, bad: Infinity })).toEqual([]);
  });

  it('when a size is known not to draw, it must not try it or anything larger', () => {
    // A phone that drew 4096² but not 20 million.
    const phone = { good: 16_777_216, bad: 20_000_000 };
    expect(probeSteps(39_814_656, phone)).toEqual([]);
  });

  it('when only part of the way is known, it must try just the sizes in between', () => {
    expect(probeSteps(39_814_656, { good: 25_000_000, bad: 50_000_000 })).toEqual([
      32_000_000, 39_814_656, 40_000_000,
    ]);
  });

  it('when a size is tried, the next common limit past it must be tried too, so a slightly taller drawing does not ask again', () => {
    expect(probeSteps(50_090_000, { good: 40_000_000, bad: Infinity })).toEqual([
      50_000_000, 50_090_000, 64_000_000,
    ]);
  });
});

describe('sizeForPixels', () => {
  it('when a size is reduced to a pixel count, it must keep its shape and stay within the count', () => {
    const size = sizeForPixels(7728, 5152, 16_000_000);
    expect(size.width * size.height).toBeLessThanOrEqual(16_000_000);
    expect(size.width / size.height).toBeCloseTo(7728 / 5152, 2);
  });

  it('when the count already fits, it must keep the size as it is rather than enlarge it', () => {
    expect(sizeForPixels(1080, 1350, 50_000_000)).toEqual({ width: 1080, height: 1350 });
  });
});

describe('safePixelBudget', () => {
  it('when the device cannot be asked, it must allow the size every target browser draws', () => {
    expect(safePixelBudget(9000, 9000)).toBe(SAFE_CANVAS_PIXELS);
  });
});
