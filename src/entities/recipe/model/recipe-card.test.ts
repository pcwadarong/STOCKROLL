import { describe, expect, it } from 'vitest';

import { recipeCardLayout } from './recipe-card';

const lines = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ label: `L${index}`, value: `V${index}` }));
const base = { name: 'Afternoon Street', sub: 'Fujifilm', lines: lines(4) };

describe('recipeCardLayout', () => {
  it('when the photo is landscape, it must span the inner width and keep its proportions', () => {
    const { photo, width } = recipeCardLayout({ ...base, photo: { width: 3000, height: 2000 } });
    expect(photo).toMatchObject({ x: 64, width: width - 128 });
    expect(photo!.width / photo!.height).toBeCloseTo(1.5, 2);
  });

  it('when the photo is a tall portrait, it must be shrunk whole and centered, not cropped', () => {
    const { photo, width } = recipeCardLayout({ ...base, photo: { width: 1000, height: 3000 } });
    expect(photo!.height).toBe(1190);
    expect(photo!.width / photo!.height).toBeCloseTo(1 / 3, 2);
    // Centered to the pixel: rounding may leave one pixel over.
    expect(Math.abs(photo!.x * 2 + photo!.width - width)).toBeLessThanOrEqual(1);
  });

  it('when there is no photo, it must leave the photo out and start with the name', () => {
    const layout = recipeCardLayout(base);
    expect(layout.photo).toBeUndefined();
    expect(layout.title.y).toBeLessThan(200);
  });

  it('when settings are listed, it must fill two columns row by row', () => {
    const { cells } = recipeCardLayout({ ...base, lines: lines(5) });
    expect(cells[0]!.label.x).toBeLessThan(cells[1]!.label.x);
    expect(cells[0]!.label.y).toBe(cells[1]!.label.y);
    expect(cells[2]!.label.x).toBe(cells[0]!.label.x);
    expect(cells[2]!.label.y).toBeGreaterThan(cells[0]!.value.y);
  });

  it('when more settings are listed, the card must grow so the last row stays inside it', () => {
    const short = recipeCardLayout({ ...base, lines: lines(2) });
    const long = recipeCardLayout({ ...base, lines: lines(9) });
    expect(long.height).toBeGreaterThan(short.height);
    expect(long.cells.at(-1)!.value.y).toBeLessThan(long.height);
  });
});
