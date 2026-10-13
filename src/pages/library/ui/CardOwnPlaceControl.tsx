import { CARD_BELOW_PLACES, CARD_PHOTO_PLACES, type CardOwnPlace } from '@/entities/recipe';
import { Chips, Segments } from '@/shared/ui/Options';

const GROUPS = [
  { value: 'off', label: 'Off', places: [], first: 'off' },
  { value: 'photo', label: 'On photos', places: CARD_PHOTO_PLACES, first: 'photo-bottom-right' },
  { value: 'below', label: 'Below', places: CARD_BELOW_PLACES, first: 'below-right' },
] as const satisfies readonly {
  value: string;
  label: string;
  places: readonly { value: CardOwnPlace; label: string }[];
  first: CardOwnPlace;
}[];

type CardOwnPlaceControlProps = {
  value: CardOwnPlace;
  onChange: (value: CardOwnPlace) => void;
};

/**
 * Picks where the user's own text goes on a recipe card: off, a corner of the example photo, or
 * under the settings. The kind of place first, then the exact one.
 * @param props the place picked and the change handler
 */
export const CardOwnPlaceControl = ({ value, onChange }: CardOwnPlaceControlProps) => {
  const group = GROUPS.find(item => item.places.some(place => place.value === value)) ?? GROUPS[0];
  return (
    <>
      <Segments
        label="Where your text goes"
        value={group.value}
        options={GROUPS}
        onChange={picked => {
          const next = GROUPS.find(item => item.value === picked);
          if (next && next.value !== group.value) onChange(next.first);
        }}
      />
      {group.places.length > 0 && (
        <Chips<CardOwnPlace>
          label={group.value === 'photo' ? 'Corner of the photos' : 'Side of the card'}
          value={value}
          options={group.places}
          onChange={onChange}
        />
      )}
    </>
  );
};
