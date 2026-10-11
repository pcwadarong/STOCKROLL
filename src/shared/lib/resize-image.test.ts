import { describe, expect, it } from 'vitest';

import { fitWithin } from './resize-image';

describe('fitWithin', () => {
  it('when a landscape image is larger than the limit, it must scale the long edge to the limit and keep the ratio', () => {
    expect(fitWithin({ width: 6000, height: 4000 }, 1200)).toEqual({ width: 1200, height: 800 });
  });

  it('when a portrait image is larger than the limit, it must limit the height, not the width', () => {
    expect(fitWithin({ width: 4000, height: 6000 }, 1200)).toEqual({ width: 800, height: 1200 });
  });

  it('when the image is smaller than the limit, it must return the original size without upscaling', () => {
    expect(fitWithin({ width: 800, height: 600 }, 1200)).toEqual({ width: 800, height: 600 });
  });

  it('when the long edge equals the limit, it must return the original size', () => {
    expect(fitWithin({ width: 1200, height: 900 }, 1200)).toEqual({ width: 1200, height: 900 });
  });

  it('when the scaled short edge is not a whole number, it must round to whole pixels', () => {
    expect(fitWithin({ width: 1999, height: 1333 }, 1200)).toEqual({ width: 1200, height: 800 });
  });

  it('when an extreme panorama would round its short edge to zero, it must keep at least one pixel', () => {
    expect(fitWithin({ width: 10000, height: 2 }, 1200)).toEqual({ width: 1200, height: 1 });
  });
});
