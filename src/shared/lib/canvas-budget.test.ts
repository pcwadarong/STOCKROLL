import { describe, expect, it } from 'vitest';

import { budgetSteps, SAFE_CANVAS_PIXELS, safePixelBudget, sizeForPixels } from './canvas-budget';

describe('budgetSteps', () => {
  it('when a drawing wants a camera resolution, it must try that first, then smaller limits largest first', () => {
    const steps = budgetSteps(39_814_656);
    expect(steps[0]).toBe(39_814_656);
    expect(steps.slice(1, 4)).toEqual([32_000_000, 25_000_000, 20_000_000]);
    expect([...steps].sort((a, b) => b - a)).toEqual(steps);
  });

  it('when trying limits, it must include the mobile Safari limit and the safe size below it', () => {
    expect(budgetSteps(39_814_656)).toEqual(
      expect.arrayContaining([16_777_216, SAFE_CANVAS_PIXELS]),
    );
  });

  it('when a drawing is small, it must try only its own size', () => {
    expect(budgetSteps(2_000_000)).toEqual([2_000_000]);
  });

  it('when trying limits, it must never offer more than the drawing wants', () => {
    expect(Math.max(...budgetSteps(30_000_000))).toBe(30_000_000);
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
