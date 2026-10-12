import { describe, expect, it } from 'vitest';

import { CARD_TEXT, type MeasureText, recipeCardLayout, wrapText } from './recipe-card';

// Every character half as wide as the type is tall: enough to make widths predictable.
const measure: MeasureText = (text, style) => text.length * CARD_TEXT[style].size * 0.5;
const lines = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ label: `L${index}`, value: `V${index}` }));
const base = { name: 'Afternoon Street', sub: 'Fujifilm', lines: lines(4), measure };

describe('wrapText', () => {
  const byLetters = (text: string) => text.length;

  it('when the text fits, it must stay on one line', () => {
    expect(wrapText('Classic Neg.', 20, byLetters)).toEqual(['Classic Neg.']);
  });

  it('when the text is too wide, it must break at spaces and drop nothing', () => {
    const wrapped = wrapText('+1/3 to +2/3 (typically)', 12, byLetters);
    expect(wrapped.length).toBeGreaterThan(1);
    expect(wrapped.every(line => line.length <= 12)).toBe(true);
    expect(wrapped.join(' ')).toBe('+1/3 to +2/3 (typically)');
  });

  it('when one word alone is too wide, it must be cut inside the word and drop nothing', () => {
    const wrapped = wrapText('Supercalifragilistic', 6, byLetters);
    expect(wrapped.every(line => line.length <= 6)).toBe(true);
    expect(wrapped.join('')).toBe('Supercalifragilistic');
  });
});

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

  it('when a value is too wide for its column, it must wrap in full and push later rows down', () => {
    const long = 'Auto white priority with a long remark that cannot fit one column at all';
    const plain = recipeCardLayout({ ...base, lines: lines(4) });
    const wrapped = recipeCardLayout({
      ...base,
      lines: [{ label: 'White balance', value: long }, ...lines(3)],
    });
    expect(wrapped.cells[0]!.value.lines.length).toBeGreaterThan(1);
    expect(wrapped.cells[0]!.value.lines.join(' ')).toBe(long);
    expect(wrapped.cells[2]!.label.y).toBeGreaterThan(plain.cells[2]!.label.y);
    expect(wrapped.height).toBeGreaterThan(plain.height);
  });

  it('when the name is too wide, it must wrap in full and move the settings down', () => {
    const name = 'A very long recipe name that goes on and on past the edge of the card';
    const layout = recipeCardLayout({ ...base, name });
    expect(layout.title.lines.length).toBeGreaterThan(1);
    expect(layout.title.lines.join(' ')).toBe(name);
    expect(layout.rule.y).toBeGreaterThan(recipeCardLayout(base).rule.y);
  });
});
