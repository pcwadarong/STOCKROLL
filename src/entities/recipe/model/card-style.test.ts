import { describe, expect, it } from 'vitest';

import { cardOwnSpot, DEFAULT_CARD_STYLE, parseCardStyle } from './card-style';

describe('parseCardStyle', () => {
  it('when nothing is stored, it must return the default style', () => {
    expect(parseCardStyle(null)).toEqual(DEFAULT_CARD_STYLE);
  });

  it('when the stored style is valid, it must keep every field', () => {
    const stored = {
      design: 'cover',
      align: 'center',
      padding: 'l',
      gap: 'none',
      textFirst: true,
      textPlace: 'top-right',
      textSize: 80,
      dim: 25,
      detail: 'full',
      ratio: '4x5',
      background: '#0b0b0c',
      titleColor: '#ff0000',
      textColor: '#ffffff',
      ownPlace: 'photo-top-left',
    };
    expect(parseCardStyle(stored)).toEqual(stored);
  });

  it('when a field is not recognized, it must fall back for that field only', () => {
    const parsed = parseCardStyle({
      ratio: '1x1',
      background: 'red',
      titleColor: 12,
      ownPlace: 'top',
    });
    expect(parsed).toEqual({ ...DEFAULT_CARD_STYLE, ratio: '1x1' });
  });

  it('when a slider value is out of range, it must be brought back inside it', () => {
    expect(parseCardStyle({ textSize: 500, dim: -20 })).toMatchObject({ textSize: 100, dim: 0 });
    expect(parseCardStyle({ textSize: 'big', dim: null })).toMatchObject({
      textSize: DEFAULT_CARD_STYLE.textSize,
      dim: DEFAULT_CARD_STYLE.dim,
    });
  });
});

describe('cardOwnSpot', () => {
  it('when the text is switched off, it must draw nowhere', () => {
    expect(cardOwnSpot('off', 'sheet', true)).toBeNull();
    expect(cardOwnSpot('off', 'cover', true)).toBeNull();
  });

  it('when a corner of the photos is picked, it must draw inside them at that corner', () => {
    expect(cardOwnSpot('photo-top-right', 'sheet', true)).toEqual({
      area: 'photo',
      position: 'top-right',
    });
  });

  it('when a corner is picked but the card has no photo, it must draw below, right', () => {
    expect(cardOwnSpot('photo-top-left', 'sheet', false)).toEqual({
      area: 'below',
      position: 'below-right',
    });
  });

  it('when a place below is picked, it must draw under the content on that side', () => {
    expect(cardOwnSpot('below-left', 'sheet', true)).toEqual({
      area: 'below',
      position: 'below-left',
    });
    expect(cardOwnSpot('below', 'sheet', true)).toEqual({ area: 'below', position: 'below' });
    expect(cardOwnSpot('below-right', 'sheet', false)).toEqual({
      area: 'below',
      position: 'below-right',
    });
  });

  it('when the photos are the background, every place must be at an edge of the card', () => {
    expect(cardOwnSpot('photo-top-left', 'cover', true)).toEqual({
      area: 'edge',
      position: 'top-left',
    });
    expect(cardOwnSpot('below', 'cover', true)).toEqual({ area: 'edge', position: 'bottom' });
    expect(cardOwnSpot('below-left', 'cover', false)).toEqual({
      area: 'edge',
      position: 'bottom-left',
    });
  });
});
