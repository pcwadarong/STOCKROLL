import { describe, expect, it } from 'vitest';

import { toCamel, toSnake } from './case';

describe('toCamel / toSnake', () => {
  it('when a row has snake_case keys, toCamel must convert only the top-level keys', () => {
    expect(
      toCamel({ display_name: 'X-T50', film_format: null, settings: { wb_shift: 1 } }),
    ).toEqual({
      displayName: 'X-T50',
      filmFormat: null,
      settings: { wb_shift: 1 },
    });
  });

  it('when an object has camelCase keys, toSnake must produce the matching column names', () => {
    expect(toSnake({ recipeId: 'a', isFavorite: true, name: 'n' })).toEqual({
      recipe_id: 'a',
      is_favorite: true,
      name: 'n',
    });
  });
});
