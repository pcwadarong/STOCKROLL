import { describe, expect, it } from 'vitest';

import { parseRecipeText } from './parse-recipe-text';

// The inputs are Korean on purpose: this file checks the vocabulary in `paste-korean.ts`.
describe('parseRecipeText (Korean)', () => {
  it('when a recipe is written in Korean, it must fill the same fields as the English one', () => {
    const { settings, flags, unread } = parseRecipeText(
      'fujifilm',
      [
        '흐린 날에도 좋은 레시피',
        '필름 시뮬레이션: 클래식 네거티브',
        '다이내믹 레인지: DR400',
        '그레인 효과: 강, 소',
        '컬러 크롬 효과: 강',
        '컬러 크롬 FX 블루: 약',
        '화이트 밸런스: 자동, R+3 B-5',
        '하이라이트: -1.5, 섀도우: +1',
        '컬러: +3',
        '샤프니스: -1',
        '노이즈 리덕션: -4',
        '명료도: -2',
      ].join('\n'),
    );

    expect(settings).toEqual({
      simulation: 'Classic Neg.',
      dynamicRange: 'DR400',
      grainStrength: 'Strong',
      grainSize: 'Small',
      colorChrome: 'Strong',
      colorChromeFxBlue: 'Weak',
      whiteBalance: 'Auto',
      wbShiftR: '+3',
      wbShiftB: '-5',
      highlight: '-1.5',
      shadow: '+1',
      color: '+3',
      sharpness: '-1',
      noiseReduction: '-4',
      clarity: '-2',
    });
    expect(flags).toEqual([]);
    expect(unread).toEqual(['흐린 날에도 좋은 레시피']);
  });

  it('when labels come without colons or with other spellings, it must still read them', () => {
    const { settings } = parseRecipeText(
      'fujifilm',
      '클래식 크롬\n화밸 5600K\n쉐도우 +2\n그레인 약하게 크게\n컬러크롬 블루: 끔',
    );
    expect(settings).toEqual({
      simulation: 'Classic Chrome',
      whiteBalance: '5600K',
      shadow: '+2',
      grainStrength: 'Weak',
      grainSize: 'Large',
      colorChromeFxBlue: 'Off',
    });
  });

  it('when the shift is written with Korean color words, it must fill the shift', () => {
    expect(parseRecipeText('fujifilm', '화이트 밸런스: 자동, 레드 +2 블루 -4').settings).toEqual({
      whiteBalance: 'Auto',
      wbShiftR: '+2',
      wbShiftB: '-4',
    });
  });

  it('when a white balance preset is written in Korean, it must fill the preset name', () => {
    expect(parseRecipeText('fujifilm', '화이트 밸런스: 그늘').settings).toEqual({
      whiteBalance: 'Shade',
    });
  });

  it('when a one-syllable value word is part of a longer word, it must not be read as the value', () => {
    expect(parseRecipeText('fujifilm', '컬러 크롬 효과: 약간만').settings).toEqual({});
  });

  it('when a Korean word is misspelled, it must not be guessed at', () => {
    const { settings, flags } = parseRecipeText('fujifilm', '필름 시뮬레이션: 클래식 크름');
    expect(settings).toEqual({});
    expect(flags).toEqual([]);
  });
});
