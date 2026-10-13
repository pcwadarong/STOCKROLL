import { useId } from 'react';

import type { MarkArea, MarkPosition } from '../model/mark';

import * as css from './PlacePicker.css';

type Spot = { area: 'photo' | 'image'; position: MarkPosition; label: string };

const EDGES = [
  ['top-left', 'top left'],
  ['top', 'top'],
  ['top-right', 'top right'],
  ['bottom-left', 'bottom left'],
  ['bottom', 'bottom'],
  ['bottom-right', 'bottom right'],
] as const;

const spotOf = (area: Spot['area'], position: MarkPosition, name: string): Spot => ({
  area,
  position,
  label: area === 'photo' ? `Inside the photo, ${name}` : `Edge of the image, ${name}`,
});

const BESIDE = [
  ['-left', ', left'],
  ['', ''],
  ['-right', ', right'],
] as const;

const besideOf = (row: 'above' | 'below', side: string, name: string): Spot => ({
  area: 'image',
  position: `${row}${side}` as MarkPosition,
  label: `Just ${row} the photo${name}`,
});

// In reading order, so the arrow keys walk the picture from its top edge to its bottom edge.
const SPOTS: readonly Spot[] = [
  ...EDGES.slice(0, 3).map(([position, name]) => spotOf('image', position, name)),
  ...BESIDE.map(([side, name]) => besideOf('above', side, name)),
  ...EDGES.map(([position, name]) => spotOf('photo', position, name)),
  ...BESIDE.map(([side, name]) => besideOf('below', side, name)),
  ...EDGES.slice(3).map(([position, name]) => spotOf('image', position, name)),
];

type PlacePickerProps = {
  area: MarkArea;
  position: MarkPosition;
  onChange: (place: { area: MarkArea; position: MarkPosition }) => void;
  /**
   * Given when the picture is drawn by a template that can place the text itself: the sentence
   * that says where.
   */
  templateHint?: string;
};

/**
 * Picks where the user's text goes by pointing at it on a small drawing of the exported picture:
 * the outer box is the whole image and the inner box the photo, with a dot for every place the
 * text can go. Where a template can place the text itself, that is offered as a choice above.
 * @param props the current place, its change handler and the template's own place, if it has one
 */
export const PlacePicker = ({ area, position, onChange, templateHint }: PlacePickerProps) => {
  const name = useId();
  const templated = templateHint !== undefined;
  const chosen = SPOTS.find(spot => spot.area === area && spot.position === position);

  return (
    <div className={css.root} role="radiogroup" aria-label="Where the text goes">
      {templated && (
        <label className={css.templateRow}>
          <input
            type="radio"
            className={css.dot}
            name={name}
            checked={area === 'template'}
            onChange={() => onChange({ area: 'template', position })}
          />
          Where the template puts it
        </label>
      )}

      <div className={css.diagram}>
        <span className={css.photo} aria-hidden>
          Photo
        </span>
        {SPOTS.map(spot => (
          <label
            key={`${spot.area}-${spot.position}`}
            className={`${css.spot} ${css.spotAt[`${spot.area}-${spot.position}` as keyof typeof css.spotAt]}`}
            title={spot.label}
          >
            <input
              type="radio"
              className={css.dot}
              name={name}
              aria-label={spot.label}
              checked={spot === chosen}
              onChange={() => onChange({ area: spot.area, position: spot.position })}
            />
          </label>
        ))}
      </div>

      <p className={css.hint} aria-live="polite">
        {area === 'template'
          ? templateHint
          : `${chosen?.label ?? ''}. Text that lands on other lettering is yours to move.`}
      </p>
    </div>
  );
};
