import { describe, expect, it } from 'vitest';

import { stripHeight } from './spec';
import {
  cropRect,
  DEFAULT_STYLE,
  effectiveStyle,
  inkFor,
  parseStyle,
  textScale,
  usesShootingInfo,
} from './style';

describe('parseStyle', () => {
  it('when nothing was stored, it must return the default style', () => {
    expect(parseStyle(null)).toEqual(DEFAULT_STYLE);
    expect(parseStyle('not an object')).toEqual(DEFAULT_STYLE);
  });

  it('when a stored field is not a known value, that field alone must fall back to the default', () => {
    const style = parseStyle({
      template: 'hologram',
      padding: 9,
      background: 'red',
      font: 'serif',
    });

    expect(style.template).toBe(DEFAULT_STYLE.template);
    expect(style.padding).toBe(DEFAULT_STYLE.padding);
    expect(style.background).toBe(DEFAULT_STYLE.background);
    expect(style.font).toBe('serif');
  });

  it('when a full valid style was stored, it must come back unchanged', () => {
    const stored = {
      template: 'film',
      background: '#1f4e3d',
      padding: 0,
      position: 'top',
      crop: 'pano',
      font: 'typewriter',
      textSize: 'l',
      textColor: '#ffa630',
      align: 'right',
      text: 'Seoul',
    };

    expect(parseStyle(stored)).toEqual(stored);
  });
});

describe('effectiveStyle', () => {
  const chosen = {
    ...DEFAULT_STYLE,
    font: 'typewriter' as const,
    textSize: 'l' as const,
    textColor: '#ff0000',
    align: 'right' as const,
    text: 'Seoul',
  };

  it('when the template is Text, the lettering choices must be used as they are', () => {
    expect(effectiveStyle({ ...chosen, template: 'text' })).toEqual({
      ...chosen,
      template: 'text',
    });
  });

  it('when the template is any other, lettering chosen for Text must not leak into it', () => {
    const drawn = effectiveStyle({ ...chosen, template: 'center' });

    expect(drawn.font).toBe(DEFAULT_STYLE.font);
    expect(drawn.textSize).toBe(DEFAULT_STYLE.textSize);
    expect(drawn.textColor).toBe('');
    expect(drawn.text).toBe('');
  });

  it('when the template is the date stamp, it must be lettered in the segment display', () => {
    expect(effectiveStyle({ ...chosen, template: 'stamp' }).font).toBe('digital');
  });

  it('when the template is not Text, frame settings such as background and padding must be kept', () => {
    const drawn = effectiveStyle({
      ...chosen,
      template: 'film',
      background: '#1f4e3d',
      padding: 0,
    });

    expect(drawn.background).toBe('#1f4e3d');
    expect(drawn.padding).toBe(0);
  });
});

describe('inkFor', () => {
  it('when the margin is light, the text must be dark', () => {
    expect(inkFor('#ffffff').ink).toBe('#111111');
    expect(inkFor('#f4efe3').ink).toBe('#111111');
  });

  it('when the margin is dark or a deep color, the text must be light', () => {
    expect(inkFor('#0b0b0c').ink).toBe('#f2f0ea');
    expect(inkFor('#8e211e').ink).toBe('#f2f0ea');
  });

  it('when the color is not a hex value, it must be treated as the default margin', () => {
    expect(inkFor('tomato')).toEqual(inkFor(DEFAULT_STYLE.background));
  });
});

describe('cropRect', () => {
  const portrait = { width: 3000, height: 4000 };

  it('when no cut is chosen, the whole photo must be used', () => {
    expect(cropRect(portrait, 'none')).toEqual({ x: 0, y: 0, width: 3000, height: 4000 });
  });

  it('when a wide cut is chosen, it must take a full-width band from the middle of the photo', () => {
    const rect = cropRect(portrait, '16:9');

    expect(rect.width).toBe(3000);
    expect(rect.height).toBe(Math.round(3000 / (16 / 9)));
    expect(rect.y).toBe(Math.round((4000 - rect.height) / 2));
  });

  it('when the photo is already wider than the cut, it must be left whole', () => {
    const wide = { width: 6000, height: 1500 };

    expect(cropRect(wide, 'cinema')).toEqual({ x: 0, y: 0, width: 6000, height: 1500 });
  });
});

describe('textScale', () => {
  it('when the date stamp is used, its lettering must be smaller than a caption at the same size', () => {
    expect(textScale({ template: 'stamp', textSize: 'm' })).toBeLessThan(
      textScale({ template: 'center', textSize: 'm' }),
    );
  });

  it('when a larger size is picked, every template must grow', () => {
    for (const template of ['label', 'stamp', 'film'] as const)
      expect(textScale({ template, textSize: 'l' })).toBeGreaterThan(
        textScale({ template, textSize: 'm' }),
      );
  });
});

describe('stripHeight', () => {
  it('when the text is larger, the film strip band must grow so the print does not crowd the holes', () => {
    expect(stripHeight(1.25)).toBeGreaterThan(stripHeight(1));
  });
});

describe('usesShootingInfo', () => {
  it('when the template is Text or Photo only, it must report that no shooting info is printed', () => {
    expect(usesShootingInfo('text')).toBe(false);
    expect(usesShootingInfo('none')).toBe(false);
  });

  it('when the template prints camera or exposure, it must report that shooting info is used', () => {
    for (const template of ['label', 'center', 'bar', 'overlay', 'stamp', 'film'] as const)
      expect(usesShootingInfo(template)).toBe(true);
  });
});
