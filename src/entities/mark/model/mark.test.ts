import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MARK,
  hasMark,
  inkOver,
  insidePosition,
  type Mark,
  markFromLegacyStyle,
  markLines,
  markRoomBelow,
  overlayArea,
  parseMark,
  planMark,
} from './mark';

const photo = { x: 100, y: 300, width: 800, height: 600 };
const whole = { x: 0, y: 0, width: 1000, height: 1400 };
const plan = (over: Partial<Parameters<typeof planMark>[0]> = {}) =>
  planMark({
    area: 'photo',
    areas: { photo, whole },
    unit: 1,
    position: 'bottom-right',
    size: 'm',
    lineEms: [5],
    ...over,
  });
const lines = (...sources: Mark['lines']) => ({ lines: sources });
const custom = (text: string) => ({ source: 'custom', text }) as const;
const NONE = { source: 'none', text: '' } as const;

describe('parseMark', () => {
  it('when nothing was stored, it must return the default with no text', () => {
    expect(parseMark(null)).toEqual(DEFAULT_MARK);
    expect(markLines(parseMark('not an object'))).toEqual([]);
  });

  it('when a stored field is not a known value, that field alone must fall back to the default', () => {
    const parsed = parseMark({
      lines: [{ source: 'emoji', text: 'me' }, 'nope'],
      area: 'moon',
      position: 'center',
      font: 'comic',
      size: 'l',
      color: 'red',
    });

    expect(parsed).toEqual({ ...DEFAULT_MARK, lines: [custom('me'), NONE], size: 'l' });
  });

  it('when a full valid mark was stored, it must come back unchanged', () => {
    const stored = {
      lines: [custom('© someone'), { source: 'date-dot', text: '' }],
      area: 'image',
      position: 'above',
      font: 'typewriter',
      size: 's',
      color: '#8e211e',
    };

    expect(parseMark(stored)).toEqual(stored);
  });
});

describe('markFromLegacyStyle', () => {
  it('when an older frame style held the text and its lettering, they must carry over', () => {
    const mark = markFromLegacyStyle({
      template: 'text',
      text: 'Seoul',
      font: 'serif',
      textSize: 'l',
      textColor: '#FFA630',
    });

    expect(mark).toEqual({
      ...DEFAULT_MARK,
      lines: [custom('Seoul'), NONE],
      font: 'serif',
      size: 'l',
      color: '#ffa630',
    });
  });

  it('when the older style was on Photo only, its hidden text must not come back', () => {
    expect(markLines(markFromLegacyStyle({ template: 'none', text: 'Seoul' }))).toEqual([]);
  });
});

describe('markLines', () => {
  const taken = new Date(2026, 6, 30, 23, 30);

  it('when a line is typed, it must be printed trimmed and empty lines left out', () => {
    expect(markLines(lines(custom('  me '), custom('   ')))).toEqual(['me']);
  });

  it('when a line is a date, it must be printed in the chosen form', () => {
    const form = (source: Mark['lines'][0]['source']) =>
      markLines(lines({ source, text: '' }, NONE), taken)[0];

    expect(form('date-slash')).toBe('2026/07/30');
    expect(form('date-dot')).toBe('2026.07.30');
    expect(form('date-long')).toBe('Jul 30, 2026');
    expect(form('date-short')).toBe("'26 7 30");
  });

  it('when the photo records no date, a date line must be left out and no date invented', () => {
    expect(markLines(lines(custom('me'), { source: 'date-slash', text: '' }))).toEqual(['me']);
  });

  it('when a date line still holds typed text from before, that text must not be printed', () => {
    expect(markLines(lines({ source: 'date-dot', text: 'old' }, NONE))).toEqual([]);
  });
});

describe('hasMark', () => {
  it('when there is no typed text, no date line and no image, it must report nothing set up', () => {
    expect(hasMark(lines(custom('  '), NONE), false)).toBe(false);
  });

  it('when there is typed text, a date line or an image, it must report something set up', () => {
    expect(hasMark(lines(custom('me'), NONE), false)).toBe(true);
    expect(hasMark(lines(custom(''), { source: 'date-long', text: '' }), false)).toBe(true);
    expect(hasMark(lines(custom(''), NONE), true)).toBe(true);
  });
});

describe('overlayArea', () => {
  it('when the template places the text, it must not be laid over the picture', () => {
    expect(overlayArea('template', true)).toBeNull();
  });

  it('when the picture has no template place, a template mark must go over the whole picture', () => {
    expect(overlayArea('template', false)).toBe('image');
    expect(overlayArea('photo', false)).toBe('photo');
    expect(overlayArea('image', true)).toBe('image');
  });
});

describe('planMark', () => {
  it('when there is no line and no image, it must plan nothing', () => {
    expect(plan({ lineEms: [] })).toBeNull();
    expect(plan({ lineEms: [], image: { width: 0, height: 40 } })).toBeNull();
  });

  it('when placed bottom right in the photo, it must keep the same inset from both photo edges', () => {
    const { box, align } = plan()!;

    expect(photo.x + photo.width - (box.x + box.width)).toBeCloseTo(32);
    expect(photo.y + photo.height - (box.y + box.height)).toBeCloseTo(32);
    expect(align).toBe('right');
  });

  it('when placed top left over the whole image, it must start at the inset from the picture corner', () => {
    const { box } = plan({ area: 'image', position: 'top-left' })!;

    expect(box.x).toBeCloseTo(32);
    expect(box.y).toBeCloseTo(32);
  });

  it('when placed at the top or bottom, it must be centered across', () => {
    const { box, align } = plan({ position: 'top' })!;

    expect(box.x + box.width / 2).toBeCloseTo(photo.x + photo.width / 2);
    expect(align).toBe('center');
  });

  it('when placed below the photo, it must sit under the photo and whatever is attached to it, centered on the photo', () => {
    const block = { ...photo, height: photo.height + 100 };
    const { box } = plan({ area: 'image', position: 'below', areas: { photo, block, whole } })!;

    expect(box.y).toBeCloseTo(block.y + block.height + 18);
    expect(box.x + box.width / 2).toBeCloseTo(photo.x + photo.width / 2);
  });

  it('when placed above the photo, it must end just over the photo', () => {
    const { box } = plan({ area: 'image', position: 'above' })!;

    expect(box.y + box.height).toBeCloseTo(photo.y - 18);
  });

  it('when placed below the photo on the left or right, it must line up with that edge of the photo', () => {
    const left = plan({ area: 'image', position: 'below-left' })!;
    const right = plan({ area: 'image', position: 'above-right' })!;

    expect(left.box.x).toBeCloseTo(photo.x);
    expect(left.box.y).toBeCloseTo(photo.y + photo.height + 18);
    expect(right.box.x + right.box.width).toBeCloseTo(photo.x + photo.width);
    expect(right.box.y + right.box.height).toBeCloseTo(photo.y - 18);
    expect(right.align).toBe('right');
  });

  it('when above or below is kept while the mark goes inside the photo, it must use the top or bottom edge', () => {
    expect(plan({ position: 'below' })!.box).toEqual(plan({ position: 'bottom' })!.box);
    expect(plan({ position: 'above' })!.box).toEqual(plan({ position: 'top' })!.box);
    expect(plan({ position: 'below-right' })!.box).toEqual(plan({ position: 'bottom-right' })!.box);
    expect(insidePosition('above-left')).toBe('top-left');
  });

  it('when there is no room under the photo, it must fall back to the bottom edge of the image', () => {
    const tight = { ...whole, height: photo.y + photo.height + 10 };
    const areas = { photo, whole: tight };

    expect(plan({ area: 'image', position: 'below-left', areas })).toEqual(
      plan({ area: 'image', position: 'bottom-left', areas }),
    );
  });

  it('when the picture has no photo, a place outside the photo must still be drawn on the image', () => {
    const areas = { whole };

    expect(plan({ area: 'image', position: 'above', areas })).toEqual(
      plan({ area: 'image', position: 'top', areas }),
    );
  });

  it('when the output is twice as large, every length must double', () => {
    const double = (rect: typeof photo) => ({
      x: rect.x * 2,
      y: rect.y * 2,
      width: rect.width * 2,
      height: rect.height * 2,
    });
    const small = plan()!;
    const large = plan({ areas: { photo: double(photo), whole: double(whole) }, unit: 2 })!;

    expect(large.box.width).toBeCloseTo(small.box.width * 2);
    expect(large.size).toBeCloseTo(small.size * 2);
    expect(large.box.x).toBeCloseTo(small.box.x * 2);
  });

  it('when a larger size is picked, the text must be drawn larger', () => {
    const sizeOf = (size: 's' | 'm' | 'l') => plan({ size })!.size;

    expect(sizeOf('s')).toBeLessThan(sizeOf('m'));
    expect(sizeOf('m')).toBeLessThan(sizeOf('l'));
  });

  it('when there are two lines, the second must sit one line under the first', () => {
    const { lines: placed, size } = plan({ lineEms: [5, 3] })!;

    expect(placed).toHaveLength(2);
    expect(placed[1]!.middle - placed[0]!.middle).toBeCloseTo(size * 1.25);
    expect(placed[1]!.x).toBeCloseTo(placed[0]!.x);
  });

  it('when the mark is on the left, the image must come first with the text beside it', () => {
    const {
      box,
      image,
      lines: placed,
    } = plan({
      position: 'bottom-left',
      image: { width: 300, height: 100 },
    })!;

    expect(image!.x).toBeCloseTo(box.x);
    expect(image!.width / image!.height).toBeCloseTo(3);
    expect(placed[0]!.x).toBeGreaterThan(image!.x + image!.width);
  });

  it('when the mark is on the right, the image must come last, at the outer edge', () => {
    const { box, image, lines: placed } = plan({ image: { width: 300, height: 100 } })!;

    expect(image!.x + image!.width).toBeCloseTo(box.x + box.width);
    expect(placed[0]!.x).toBeLessThan(image!.x);
  });

  it('when the mark is wider than its room, it must shrink whole and stay inside the insets', () => {
    const { box, size } = plan({ lineEms: [200] })!;

    expect(box.width).toBeCloseTo(photo.width - 64);
    expect(size).toBeLessThan(plan()!.size);
  });
});

describe('markRoomBelow', () => {
  it('when the mark draws nothing, it must ask for no room', () => {
    expect(markRoomBelow('m', 0, false)).toBe(0);
  });

  it('when that room is kept under a block, a mark below it must fit whole and end at its foot', () => {
    const room = markRoomBelow('l', 2, true);
    const whole = { x: 0, y: 0, width: 1080, height: 1000 };
    const block = { x: 64, y: 64, width: 952, height: 1000 - 64 - 64 - room };
    const placed = planMark({
      area: 'image',
      areas: { block, whole },
      unit: 1,
      position: 'below-right',
      size: 'l',
      lineEms: [8, 6],
      image: { width: 200, height: 100 },
    })!;
    expect(placed.box.y).toBeGreaterThan(block.y + block.height);
    expect(placed.box.y + placed.box.height).toBeCloseTo(1000 - 64, 5);
    expect(placed.box.x + placed.box.width).toBeCloseTo(block.x + block.width, 5);
  });
});

describe('inkOver', () => {
  const patch = (r: number, g: number, b: number, count = 64) =>
    Array.from({ length: count }, () => [r, g, b, 255]).flat();

  it('when the patch behind the mark is light, it must pick dark text', () => {
    expect(inkOver(patch(244, 239, 227))).toBe('#111111');
  });

  it('when the patch behind the mark is dark, it must pick light text', () => {
    expect(inkOver(patch(20, 20, 24))).toBe('#ffffff');
  });

  it('when there are no pixels to judge by, it must pick light text', () => {
    expect(inkOver([])).toBe('#ffffff');
  });
});
