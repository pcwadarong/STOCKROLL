import { useEffect, useRef } from 'react';
import { Link } from 'react-router';

import { ANY, FAVORITES_ONLY, type ListFilter } from '@/shared/lib/pick-filter';
import { Button } from '@/shared/ui/Button';
import { labelText } from '@/shared/ui/label.css';
import { PickField } from '@/shared/ui/PickField';
import { ProgressCircle } from 'seed-design/ui/progress-circle';
import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import * as css from './LibraryPage.css';

type Picks = Readonly<Record<string, string>>;

type ListSearchProps = {
  /** Names the box for assistive tech, e.g. "Search cameras". */
  label: string;
  value: string;
  onChange: (value: string) => void;
};

/**
 * The search box above a library list. It narrows as the user types; there is nothing to submit.
 * @param props an accessible name, the typed text and the change handler
 */
export const ListSearch = ({ label, value, onChange }: ListSearchProps) => (
  // `responsive` is the size of the dropdowns below on a desktop, and the large one on a phone,
  // where a smaller input makes iOS zoom the page on focus.
  <TextField size="responsive" value={value} onValueChange={({ value: next }) => onChange(next)}>
    <TextFieldInput type="search" aria-label={label} placeholder="Search" />
  </TextField>
);

type ListFiltersProps = {
  filters: readonly ListFilter[];
  picks: Picks;
  onPick: (key: string, value: string) => void;
  /** What the search box is called and holds. */
  search: ListSearchProps;
};

/**
 * The controls above a library list: a search box, one dropdown per fact, and a star that keeps
 * favorites only. Cameras, lenses, films and recipes all narrow their lists with this.
 * @param props the dropdowns to show, the picked values, the pick handler and the search box
 */
export const ListFilters = ({ filters, picks, onPick, search }: ListFiltersProps) => {
  const favoritesOnly = picks.isFavorite === FAVORITES_ONLY.isFavorite;
  return (
    <div className={css.filterBar} role="search">
      <div className={css.filterSearch}>
        <ListSearch {...search} />
      </div>
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

/**
 * A fact under a row's title. Text and non-zero numbers are shown; anything else is skipped, so
 * callers can write `value && text`.
 */
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
  /** Lets a `ListMore` below point at this list. */
  id?: string;
  rows: readonly ListRow[];
  onToggleFavorite: (id: string) => void;
};

/**
 * A library list: per row, a link (the title over a line of facts) and a favorite star at the end.
 * @param props the rows and the handler that flips a row's star
 */
export const ItemList = ({ id, rows, onToggleFavorite }: ItemListProps) => (
  <ul id={id} className={css.list}>
    {rows.map(({ id, to, title, facts, note, favorite }) => {
      const line = facts
        .filter(fact => (typeof fact === 'string' || typeof fact === 'number') && fact)
        .join(' · ');
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

type ListMoreProps = {
  /** `id` of the list this continues. */
  listId: string;
  /** How many rows are on screen and how many match in all. */
  shown: number;
  total: number;
  /** How many rows one press asks for. */
  step: number;
  /** True while the next rows are being read. */
  loading: boolean;
  onMore: () => void;
};

/**
 * The foot of a long list: how much of it is on screen, and a button that reads the next step,
 * with a spinner in its place while the rows are on their way. Renders nothing once the whole
 * list is shown.
 * @param props the list it belongs to, the counts, the loading state and the handler
 */
export const ListMore = ({ listId, shown, total, step, loading, onMore }: ListMoreProps) => {
  // Position of the first row a press will add, kept until that row is on screen.
  const awaited = useRef<number | null>(null);

  useEffect(() => {
    if (awaited.current === null || shown <= awaited.current) return;
    // Focus moves to the first new row: the button itself moves down, or is gone when this was
    // the last step, and a keyboard user would be left behind the new rows.
    document
      .getElementById(listId)
      ?.children[awaited.current]?.querySelector<HTMLElement>('a, button')
      ?.focus();
    awaited.current = null;
  }, [listId, shown]);

  const hidden = total - shown;
  if (hidden <= 0) return null;

  const show = () => {
    awaited.current = shown;
    onMore();
  };

  return (
    <div className={css.listMore}>
      <span className={labelText} role="status">
        {loading ? 'Loading more…' : `${shown} of ${total} shown`}
      </span>
      {loading ? (
        <ProgressCircle size="24" aria-hidden="true" />
      ) : (
        <Button size="small" aria-controls={listId} onClick={show}>
          Show {Math.min(step, hidden)} more
        </Button>
      )}
    </div>
  );
};
