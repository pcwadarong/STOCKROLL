import { describe, expect, it } from 'vitest';

import {
  CARD_TEXT,
  cardExportScale,
  type MeasureText,
  photoAtCorner,
  photoCells,
  recipeCardLayout,
  recipeCoverLayout,
  wrapText,
} from './recipe-card';

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
    const { photos, width } = recipeCardLayout({
      ...base,
      photos: [{ width: 3000, height: 2000 }],
    });
    const photo = photos[0]!.box;
    expect(photo).toMatchObject({ x: 64, width: width - 128 });
    expect(photo.width / photo.height).toBeCloseTo(1.5, 2);
  });

  it('when the photo is a tall portrait, it must be shrunk whole and centered, not cropped', () => {
    const { photos, width } = recipeCardLayout({
      ...base,
      photos: [{ width: 1000, height: 3000 }],
    });
    const photo = photos[0]!.box;
    expect(photo.height).toBe(1190);
    expect(photo.width / photo.height).toBeCloseTo(1 / 3, 2);
    // Centered to the pixel: rounding may leave one pixel over.
    expect(Math.abs(photo.x * 2 + photo.width - width)).toBeLessThanOrEqual(1);
  });

  it('when there is no photo, it must leave the photo out and start with the name', () => {
    const layout = recipeCardLayout(base);
    expect(layout.photos).toEqual([]);
    expect(layout.photoArea).toBeUndefined();
    expect(layout.title.y).toBeLessThan(200);
  });

  it('when settings are listed, it must write each as one "Label: value" line, top to bottom', () => {
    const layout = recipeCardLayout({ ...base, lines: lines(3) });
    expect(layout.lines.map(line => line.lines)).toEqual([['L0: V0'], ['L1: V1'], ['L2: V2']]);
    expect(layout.lines[1]!.x).toBe(layout.lines[0]!.x);
    expect(layout.lines[1]!.y).toBeGreaterThan(layout.lines[0]!.y);
  });

  it('when more settings are listed, the card must grow so the last line stays inside it', () => {
    const short = recipeCardLayout({ ...base, lines: lines(2) });
    const long = recipeCardLayout({ ...base, lines: lines(9) });
    expect(long.height).toBeGreaterThan(short.height);
    expect(long.lines.at(-1)!.y).toBeLessThan(long.height);
  });

  it('when a setting is too wide for the card, it must wrap in full and push later lines down', () => {
    const value =
      'Auto white priority with a remark that goes on far too long to fit the card on one line';
    const plain = recipeCardLayout({ ...base, lines: lines(4) });
    const wrapped = recipeCardLayout({
      ...base,
      lines: [{ label: 'White balance', value }, ...lines(3)],
    });
    expect(wrapped.lines[0]!.lines.length).toBeGreaterThan(1);
    expect(wrapped.lines[0]!.lines.join(' ')).toBe(`White balance: ${value}`);
    expect(wrapped.lines[1]!.y).toBeGreaterThan(plain.lines[1]!.y);
    expect(wrapped.height).toBeGreaterThan(plain.height);
  });

  it('when the name is too wide, it must wrap in full and move the settings down', () => {
    const name = 'A very long recipe name that goes on and on past the edge of the card';
    const layout = recipeCardLayout({ ...base, name });
    expect(layout.title.lines.length).toBeGreaterThan(1);
    expect(layout.title.lines.join(' ')).toBe(name);
    expect(layout.rule.y).toBeGreaterThan(recipeCardLayout(base).rule.y);
  });

  it('when room is asked for under the content, the card must grow by it and keep it empty', () => {
    const plain = recipeCardLayout(base);
    const roomy = recipeCardLayout({ ...base, footer: 90 });
    expect(roomy.height).toBe(plain.height + 90);
    expect(roomy.block.y + roomy.block.height).toBe(plain.block.y + plain.block.height);
    expect(roomy.lines.at(-1)!.y).toBeLessThanOrEqual(roomy.block.y + roomy.block.height);
  });
});

describe('recipeCardLayout on a card of a fixed size', () => {
  const landscape = { width: 3000, height: 2000 };
  const inside = (box: { x: number; y: number; width: number; height: number }, card: typeof box) =>
    box.x >= card.x &&
    box.y >= card.y &&
    box.x + box.width <= card.x + card.width + 1 &&
    box.y + box.height <= card.y + card.height + 1;

  it('when a size is given, the card must be exactly that size', () => {
    const layout = recipeCardLayout({ ...base, canvas: { width: 1080, height: 1350 } });
    expect(layout).toMatchObject({ width: 1080, height: 1350 });
  });

  it('when the card is tall, it must put the photo over the text, whole and inside the padding', () => {
    const layout = recipeCardLayout({
      ...base,
      photos: [landscape],
      canvas: { width: 1080, height: 1920 },
    });
    expect(layout.photoArea!.width / layout.photoArea!.height).toBeCloseTo(1.5, 1);
    expect(inside(layout.photoArea!, layout.block)).toBe(true);
    expect(layout.title.y).toBeGreaterThan(layout.photoArea!.y + layout.photoArea!.height);
  });

  it('when the card is wide, it must put the text beside the photo', () => {
    const layout = recipeCardLayout({
      ...base,
      lines: lines(10),
      photos: [landscape],
      canvas: { width: 1920, height: 1080 },
    });
    expect(inside(layout.photoArea!, layout.block)).toBe(true);
    expect(layout.title.x).toBeGreaterThan(layout.photoArea!.x + layout.photoArea!.width);
  });

  it('when the text at full size would crowd the photo out, it must set the text smaller', () => {
    const roomy = recipeCardLayout({
      ...base,
      photos: [landscape],
      canvas: { width: 1080, height: 1920 },
    });
    const crowded = recipeCardLayout({
      ...base,
      lines: lines(14),
      photos: [landscape],
      canvas: { width: 1080, height: 1350 },
    });
    expect(roomy.lines[0]!.size).toBe(CARD_TEXT.line.size);
    expect(crowded.lines[0]!.size).toBeLessThan(CARD_TEXT.line.size);
    expect(crowded.photoArea!.width * crowded.photoArea!.height).toBeGreaterThanOrEqual(
      0.25 * 1080 * 1350,
    );
  });

  it('when there are more settings than the size can hold, it must shrink them until all fit', () => {
    const layout = recipeCardLayout({
      ...base,
      lines: lines(40),
      canvas: { width: 1080, height: 1080 },
    });
    expect(layout.lines).toHaveLength(40);
    const last = layout.lines.at(-1)!;
    expect(last.y).toBeLessThanOrEqual(layout.block.y + layout.block.height);
    expect(layout.title.y).toBeGreaterThan(layout.block.y);
  });

  it('when room is asked for under the content, nothing must be placed in it', () => {
    const layout = recipeCardLayout({
      ...base,
      lines: lines(12),
      photos: [landscape],
      canvas: { width: 1080, height: 1350 },
      footer: 100,
    });
    expect(layout.block.y + layout.block.height).toBe(1350 - 64 - 100);
    expect(layout.lines.at(-1)!.y).toBeLessThanOrEqual(layout.block.y + layout.block.height);
    expect(inside(layout.photoArea!, layout.block)).toBe(true);
  });
});

describe('recipeCardLayout with a decoded image as the photo', () => {
  // Like an ImageBitmap: its dimensions are getters on the prototype, not own properties.
  class Decoded {
    get width() {
      return 3000;
    }
    get height() {
      return 2000;
    }
  }

  it('when the photo keeps its size on its prototype, the whole of it must still be drawn', () => {
    const layout = recipeCardLayout({ ...base, photos: [new Decoded()] });
    expect(layout.photos[0]!.source).toEqual({ x: 0, y: 0, width: 3000, height: 2000 });
  });
});

describe('recipeCardLayout beside the photos', () => {
  it('when a setting would break in the side column, it must be set smaller to stay on one line', () => {
    const long = [{ label: 'Exposure compensation', value: '+1/3 to +2/3' }, ...lines(8)];
    const layout = recipeCardLayout({
      ...base,
      lines: long,
      photos: [
        { width: 3000, height: 2000 },
        { width: 3000, height: 2000 },
      ],
      canvas: { width: 1920, height: 1080 },
    });
    expect(layout.title.x).toBeGreaterThan(layout.photoArea!.x + layout.photoArea!.width);
    expect(layout.lines[0]!.lines).toHaveLength(1);
  });
});

describe('recipeCardLayout alignment and spacing', () => {
  it('when the text is centered or set right, every line must be anchored there', () => {
    const left = recipeCardLayout(base);
    const center = recipeCardLayout({ ...base, align: 'center' });
    const right = recipeCardLayout({ ...base, align: 'right' });
    expect(left.title).toMatchObject({ align: 'left', x: 64 });
    expect(center.title).toMatchObject({ align: 'center', x: 540 });
    expect(right.lines[0]).toMatchObject({ align: 'right', x: 1080 - 64 });
  });

  it('when the padding is changed, the content must keep that far from every edge', () => {
    const layout = recipeCardLayout({
      ...base,
      padding: 96,
      photos: [{ width: 3000, height: 2000 }],
    });
    expect(layout.photos[0]!.box).toMatchObject({ x: 96, y: 96, width: 1080 - 192 });
    expect(layout.title.x).toBe(96);
  });

  it('when the text comes first, it must sit above the photo', () => {
    const layout = recipeCardLayout({
      ...base,
      textFirst: true,
      photos: [{ width: 3000, height: 2000 }],
    });
    expect(layout.lines.at(-1)!.y).toBeLessThan(layout.photos[0]!.box.y);
  });
});

describe('recipeCardLayout with several photos', () => {
  const photo = { width: 3000, height: 2000 };

  it('when there are two photos, they must fill two cells side by side, cut to fit', () => {
    const layout = recipeCardLayout({ ...base, photos: [photo, photo], gap: 24 });
    const [first, second] = layout.photos;
    expect(first!.box.y).toBe(second!.box.y);
    expect(second!.box.x - (first!.box.x + first!.box.width)).toBe(24);
    // A square cell shows the middle of a 3:2 photo, at full height.
    expect(first!.source.height).toBeCloseTo(2000, 5);
    expect(first!.source.width / first!.source.height).toBeCloseTo(
      first!.box.width / first!.box.height,
      2,
    );
    expect(first!.source.x).toBeGreaterThan(0);
  });

  it('when there are three photos, the text must take the fourth cell of a two-by-two grid', () => {
    const layout = recipeCardLayout({
      ...base,
      photos: [photo, photo, photo],
      canvas: { width: 1080, height: 1350 },
    });
    const boxes = layout.photos.map(item => item.box);
    expect(boxes).toHaveLength(3);
    expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x);
    expect(boxes[2]!.y).toBeGreaterThan(boxes[0]!.y);
    // The text is in the bottom right cell.
    expect(layout.title.x).toBeGreaterThanOrEqual(boxes[1]!.x);
    expect(layout.title.y).toBeGreaterThan(boxes[2]!.y);
  });

  it('when the gap between photos is small, the text must still keep its distance from them', () => {
    const edges = (gap: number) => {
      const layout = recipeCardLayout({
        ...base,
        gap,
        photos: [photo, photo, photo],
        canvas: { width: 1080, height: 1350 },
      });
      const [, above, beside] = layout.photos.map(item => item.box);
      return {
        fromSide: layout.rule.x - (beside!.x + beside!.width),
        fromAbove: layout.title.y - layout.title.size - (above!.y + above!.height),
        // The cell ends where the photo beside it ends.
        fromFoot: beside!.y + beside!.height - layout.lines.at(-1)!.y,
      };
    };
    for (const gap of [0, 12, 24]) {
      expect(edges(gap).fromSide).toBe(56);
      expect(edges(gap).fromAbove).toBeGreaterThanOrEqual(56);
      expect(edges(gap).fromFoot).toBeGreaterThanOrEqual(28);
    }
    // A gap wider than that distance is kept as it is.
    expect(edges(80).fromSide).toBe(80);
  });

  it('when there are three photos and the text comes first, it must take the first cell', () => {
    const layout = recipeCardLayout({
      ...base,
      textFirst: true,
      photos: [photo, photo, photo],
      canvas: { width: 1080, height: 1350 },
    });
    expect(layout.title.x).toBe(64);
    expect(layout.photos[0]!.box.x).toBeGreaterThan(64);
    expect(layout.lines.at(-1)!.y).toBeLessThan(layout.photos[1]!.box.y);
  });

  it('when a cell is too small for the settings, the text must shrink to stay inside it', () => {
    const layout = recipeCardLayout({
      ...base,
      lines: lines(16),
      photos: [photo, photo, photo],
      canvas: { width: 1080, height: 1080 },
    });
    const cellBottom = layout.block.y + layout.block.height;
    expect(layout.lines).toHaveLength(16);
    expect(layout.lines.at(-1)!.y).toBeLessThan(cellBottom);
    expect(layout.lines[0]!.size).toBeLessThan(CARD_TEXT.line.size);
  });

  it('when there are four photos, they must form a grid with the text outside it', () => {
    const layout = recipeCardLayout({ ...base, photos: [photo, photo, photo, photo] });
    const boxes = layout.photos.map(item => item.box);
    expect(boxes[0]!.y).toBe(boxes[1]!.y);
    expect(boxes[2]!.y).toBeGreaterThan(boxes[0]!.y);
    expect(boxes[3]!.x).toBe(boxes[1]!.x);
    expect(layout.title.y).toBeGreaterThan(boxes[3]!.y + boxes[3]!.height);
  });
});

describe('photoCells', () => {
  const area = { x: 0, y: 0, width: 1000, height: 600 };

  it('when four cells are asked for, they must come in reading order whatever the shape', () => {
    for (const shape of [area, { ...area, width: 600, height: 1000 }]) {
      const [a, b, c, d] = photoCells(shape, 4, 0);
      expect(b!.x).toBeGreaterThan(a!.x);
      expect(b!.y).toBe(a!.y);
      expect(c!.y).toBeGreaterThan(a!.y);
      expect(d).toMatchObject({ x: b!.x, y: c!.y });
    }
  });

  it('when two cells are asked for, the area must be split along its longer side', () => {
    expect(photoCells(area, 2, 0)[1]).toMatchObject({ x: 500, y: 0 });
    expect(photoCells({ ...area, width: 600, height: 1000 }, 2, 0)[1]).toMatchObject({
      x: 0,
      y: 500,
    });
  });
});

describe('recipeCoverLayout', () => {
  const photo = { width: 3000, height: 2000 };
  const cover = { ...base, place: 'center' as const, share: 0.6 };
  const bottomOf = (layout: ReturnType<typeof recipeCoverLayout>) => layout.lines.at(-1)!.y;

  it('when the card has a size, the photo must fill it edge to edge, cut to its shape', () => {
    const layout = recipeCoverLayout({
      ...cover,
      photos: [photo],
      canvas: { width: 1080, height: 1350 },
    });
    expect(layout.photos[0]!.box).toEqual({ x: 0, y: 0, width: 1080, height: 1350 });
    expect(layout.photos[0]!.source.width / layout.photos[0]!.source.height).toBeCloseTo(0.8, 2);
  });

  it('when the card has no size, it must take the shape of its one photo, uncut', () => {
    const layout = recipeCoverLayout({ ...cover, photos: [photo] });
    expect(layout).toMatchObject({ width: 1080, height: 720 });
    expect(layout.photos[0]!.source).toMatchObject({ x: 0, y: 0, width: 3000, height: 2000 });
  });

  it('when the text is at full size, it must still end inside the padding', () => {
    for (const count of [3, 14, 40]) {
      const layout = recipeCoverLayout({
        ...cover,
        share: 1,
        lines: lines(count),
        photos: [photo],
        canvas: { width: 1080, height: 1350 },
      });
      expect(layout.title.y - layout.title.size).toBeGreaterThanOrEqual(64 - 1);
      expect(bottomOf(layout)).toBeLessThanOrEqual(1350 - 64);
    }
  });

  it('when the size is turned down, the text must get smaller', () => {
    const canvas = { width: 1080, height: 1350 };
    const full = recipeCoverLayout({ ...cover, share: 1, canvas });
    const half = recipeCoverLayout({ ...cover, share: 0.5, canvas });
    expect(half.lines[0]!.size).toBeCloseTo(full.lines[0]!.size / 2, 0);
  });

  it('when a corner is picked, the text group must sit against the padding there', () => {
    const canvas = { width: 1080, height: 1350 };
    const topLeft = recipeCoverLayout({ ...cover, place: 'top-left', canvas });
    const bottomRight = recipeCoverLayout({ ...cover, place: 'bottom-right', canvas });
    expect(topLeft.rule.x).toBe(64);
    expect(topLeft.title.y - topLeft.title.size).toBeCloseTo(64, 5);
    expect(bottomRight.rule.x + bottomRight.rule.width).toBeCloseTo(1080 - 64, 5);
    expect(bottomOf(bottomRight)).toBeGreaterThan(1350 - 64 - 60);
  });

  it('when the text is set right in a corner on the left, it must align within its own width', () => {
    const layout = recipeCoverLayout({
      ...cover,
      place: 'top-left',
      align: 'right',
      canvas: { width: 1080, height: 1350 },
    });
    expect(layout.title.align).toBe('right');
    expect(layout.title.x).toBeCloseTo(layout.rule.x + layout.rule.width, 5);
    expect(layout.title.x).toBeLessThan(1080 - 64);
  });

  it('when there are four photos, they must cover the card as a grid', () => {
    const layout = recipeCoverLayout({
      ...cover,
      gap: 0,
      photos: [photo, photo, photo, photo],
      canvas: { width: 1080, height: 1350 },
    });
    expect(layout.photos.map(item => item.box)).toEqual([
      { x: 0, y: 0, width: 540, height: 675 },
      { x: 540, y: 0, width: 540, height: 675 },
      { x: 0, y: 675, width: 540, height: 675 },
      { x: 540, y: 675, width: 540, height: 675 },
    ]);
  });
});

describe('photoAtCorner', () => {
  const photo = { width: 3000, height: 2000 };
  const grid = (textFirst: boolean) =>
    recipeCardLayout({
      ...base,
      textFirst,
      photos: [photo, photo, photo],
      canvas: { width: 1080, height: 1350 },
    });

  it('when the card has no photo, it must give nothing', () => {
    expect(photoAtCorner(recipeCardLayout(base), 'top-left')).toBeUndefined();
  });

  it('when the card has one photo, every corner must be that photo', () => {
    const layout = recipeCardLayout({ ...base, photos: [photo] });
    expect(photoAtCorner(layout, 'bottom-right')).toEqual(layout.photos[0]!.box);
  });

  it('when the corner cell of a grid holds the text, it must give a photo and not that cell', () => {
    const last = grid(false);
    const boxes = last.photos.map(item => item.box);
    // The text is bottom right: the nearest photo corner belongs to one of its neighbours.
    const picked = photoAtCorner(last, 'bottom-right')!;
    expect(boxes).toContainEqual(picked);
    expect(picked.x + picked.width <= last.title.x || picked.y + picked.height < last.title.y).toBe(
      true,
    );

    const first = grid(true);
    expect(first.photos.map(item => item.box)).toContainEqual(photoAtCorner(first, 'top-left'));
  });

  it('when the corner cell of a grid holds a photo, it must give that photo', () => {
    const layout = grid(false);
    expect(photoAtCorner(layout, 'top-left')).toEqual(layout.photos[0]!.box);
  });
});

describe('cardExportScale', () => {
  const box = { x: 0, y: 0, width: 1000, height: 500 };
  const card = (sourceWidth: number) => ({
    width: 1080,
    height: 1350,
    photos: [{ box, source: { x: 0, y: 0, width: sourceWidth, height: sourceWidth / 2 } }],
  });

  it('when a photo is drawn smaller than it is, the card must grow until it is pixel for pixel', () => {
    expect(cardExportScale(card(2000))).toBe(2);
  });

  it('when no photo has detail to spare, the card must stay at its working size', () => {
    expect(cardExportScale(card(800))).toBe(1);
    expect(cardExportScale({ width: 1080, height: 1350, photos: [] })).toBe(1);
  });

  it('when the device can draw more, the card must grow until its photos are pixel for pixel', () => {
    expect(cardExportScale(card(8000), () => 300_000_000)).toBe(8);
  });

  it('when the device draws less than the card wants, the card must stop at the device limit', () => {
    const scale = cardExportScale(card(8000), () => 25_000_000);
    expect(1080 * scale * 1350 * scale).toBeLessThanOrEqual(25_000_000 + 1);
    expect(scale).toBeGreaterThan(Math.sqrt(16_000_000 / (1080 * 1350)));
  });

  it('when full detail would exceed what a browser can draw, the card must stop at that limit', () => {
    const scale = cardExportScale(card(8000));
    expect(scale).toBeLessThan(8);
    expect(1080 * scale * 1350 * scale).toBeLessThanOrEqual(16_000_000 + 1);
  });
});
