import { Link } from 'react-router';

import { ANY, FAVORITES_ONLY, type ListFilter } from '@/shared/lib/pick-filter';
import { Button } from '@/shared/ui/Button';
import { labelText } from '@/shared/ui/label.css';
import { PickField } from '@/shared/ui/PickField';

import * as css from './LibraryPage.css';

type Picks = Readonly<Record<string, string>>;

type ListFiltersProps = {
  filters: readonly ListFilter[];
  picks: Picks;
  onPick: (key: string, value: string) => void;
};

/**
 * The controls above a library list: one dropdown per fact, and a star that keeps favorites only.
 * Cameras, lenses, films and recipes all narrow their lists with this.
 * @param props the dropdowns to show, the picked values and the pick handler
 */
export const ListFilters = ({ filters, picks, onPick }: ListFiltersProps) => {
  const favoritesOnly = picks.isFavorite === FAVORITES_ONLY.isFavorite;
  return (
    <div className={css.filterBar}>
      {filters.map(filter => (
        <PickField
          key={filter.key}
          label={filter.label}
          size="medium"
          hideLabel
          // Unfiltered shows the filter's own name as the placeholder instead of "All".
          placeholder={filter.label}
          options={filter.options}
          value={picks[filter.key] && picks[filter.key] !== ANY ? picks[filter.key]! : ''}
          onChange={value => onPick(filter.key, value || ANY)}
        />
      ))}
      {/* A labeled toggle: a lone star here reads as decoration, not as a filter. */}
      <Button
        size="small"
        pressed={favoritesOnly}
        className={css.favoritesToggle}
        onClick={() => onPick('isFavorite', favoritesOnly ? ANY : FAVORITES_ONLY.isFavorite)}
      >
        <span className={css.toggleStar} aria-hidden="true">
          ★
        </span>
        Favorites
      </Button>
    </div>
  );
};

/** A fact under a row's title. Anything empty is skipped, so callers can write `value && text`. */
export type ListFact = string | number | boolean | null | undefined;

/** One line of a library list. */
export type ListRow = {
  id: string;
  /** Where the row leads. */
  to: string;
  title: string;
  /** Facts shown under the title, joined with a middle dot. Empty ones are skipped. */
  facts: readonly ListFact[];
  /** A state worth pointing out, shown after the facts: `alert` in red, `muted` in gray. */
  note?: { label: string; tone: 'alert' | 'muted' };
  favorite: boolean;
};

type ItemListProps = {
  rows: readonly ListRow[];
  onToggleFavorite: (id: string) => void;
};

/**
 * A library list: per row, a link (the title over a line of facts) and a favorite star at the end.
 * @param props the rows and the handler that flips a row's star
 */
export const ItemList = ({ rows, onToggleFavorite }: ItemListProps) => (
  <ul className={css.list}>
    {rows.map(({ id, to, title, facts, note, favorite }) => {
      const line = facts.filter(fact => typeof fact === 'string' && fact !== '').join(' · ');
      return (
        <li key={id} className={css.rowWithAction}>
          <Link to={to} className={css.rowLink}>
            <span className={css.rowTitle}>{title}</span>
            {(line || note) && (
              <span className={`${labelText} ${css.rowFacts}`}>
                {line}
                {line && note && ' · '}
                {note && <span className={css.rowNote[note.tone]}>{note.label}</span>}
              </span>
            )}
          </Link>
          <button
            type="button"
            className={css.star}
            aria-pressed={favorite}
            aria-label={`Favorite ${title}`}
            onClick={() => onToggleFavorite(id)}
          >
            {favorite ? '★' : '☆'}
          </button>
        </li>
      );
    })}
  </ul>
);
