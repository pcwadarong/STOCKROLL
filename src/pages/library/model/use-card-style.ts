import { useState } from 'react';

import { type CardStyle, DEFAULT_CARD_STYLE, parseCardStyle } from '@/entities/recipe';

const STORAGE_KEY = 'stockroll:card-style';

const readStored = (): CardStyle => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseCardStyle(JSON.parse(stored)) : DEFAULT_CARD_STYLE;
  } catch {
    return DEFAULT_CARD_STYLE;
  }
};

/**
 * The look of recipe cards — size, colors and where the user's own text goes — remembered on
 * this device and shared by every recipe.
 * @returns the style and `update` to change some of it
 */
export const useCardStyle = () => {
  const [style, setStyle] = useState(readStored);
  const update = (patch: Partial<CardStyle>) => {
    const next = { ...style, ...patch };
    setStyle(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be full or blocked (private mode); the style then lasts for this visit only.
    }
  };
  return { style, update };
};
