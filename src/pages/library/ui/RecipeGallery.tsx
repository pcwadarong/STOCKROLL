import { Link } from 'react-router';

import * as css from './RecipeGallery.css';

/** One recipe as the gallery shows it. */
export type GalleryItem = {
  id: string;
  title: string;
  /** Line under the title, such as the film simulation. */
  sub?: string | null;
  /** Link to the example photo. Without one the tile shows a "No photo" label instead. */
  photoUrl?: string;
  /** Short mark on the tile, such as the slot the recipe sits in. */
  badge?: string;
  /** Marks the tile as the one in the slot being filled. Only used with `onPick`. */
  pressed?: boolean;
};

type RecipeGalleryProps = {
  items: readonly GalleryItem[];
  /** `photos` lays recipes out as picture tiles; `names` lists them one per line without pictures. */
  layout: 'photos' | 'names';
  /** Where a tile leads. Leave out when tiles are picked instead of followed. */
  to?: (id: string) => string;
  /** Called with the recipe id when a tile is picked. Tiles are buttons when this is set. */
  onPick?: (id: string) => void;
};

const Picture = ({ item }: { item: GalleryItem }) => (
  <span className={css.frame}>
    {item.photoUrl ? (
      // The title right below names the recipe; the picture adds nothing a screen reader needs.
      <img className={css.image} src={item.photoUrl} alt="" loading="lazy" />
    ) : (
      <span className={css.placeholder}>No photo</span>
    )}
    {item.badge && <span className={css.badge}>{item.badge}</span>}
  </span>
);

/**
 * Recipes shown by their example photos, or by name only. Tiles either lead to the recipe (`to`)
 * or pick it (`onPick`), which is how a roll's slots are filled.
 * @param props the recipes, the layout and what a tile does
 */
export const RecipeGallery = ({ items, layout, to, onPick }: RecipeGalleryProps) => (
  <ul className={layout === 'photos' ? css.grid : css.names}>
    {items.map(item => {
      const body =
        layout === 'photos' ? (
          <>
            <Picture item={item} />
            <span className={css.title}>{item.title}</span>
            {item.sub && <span className={css.sub}>{item.sub}</span>}
          </>
        ) : (
          <>
            <span>
              <span className={css.title}>{item.title}</span>
              {item.sub && <span className={css.sub}> · {item.sub}</span>}
            </span>
            {item.badge && <span className={css.inlineBadge}>{item.badge}</span>}
          </>
        );
      const className = layout === 'photos' ? css.tile : css.nameRow;

      return (
        <li key={item.id}>
          {onPick ? (
            <button
              type="button"
              className={className}
              aria-pressed={item.pressed ?? false}
              onClick={() => onPick(item.id)}
            >
              {body}
            </button>
          ) : (
            <Link to={to?.(item.id) ?? '#'} className={className}>
              {body}
            </Link>
          )}
        </li>
      );
    })}
  </ul>
);
