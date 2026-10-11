import type { RecordField } from '@/shared/lib/record-field';

const OWNERSHIP = [
  { value: 'owned', label: 'Owned' },
  { value: 'rented', label: 'Rented' },
  { value: 'borrowed', label: 'Borrowed' },
  { value: 'sold', label: 'Sold' },
] as const;

const STATUS = [
  { value: 'active', label: 'In use' },
  { value: 'inactive', label: 'Not in use' },
  { value: 'repair', label: 'In repair' },
  { value: 'display', label: 'Display only' },
] as const;

const FORMAT = [
  { value: '135', label: '135' },
  { value: '120', label: '120' },
] as const;

const NAME_HINT =
  'A shorter name to print on the photo. Leave empty to print the model name as it is.';

export const CAMERA_FIELDS: readonly RecordField[] = [
  { key: 'name', label: 'Model name', type: 'text', required: true, placeholder: 'Fujifilm X-T50' },
  {
    key: 'displayName',
    label: 'Name on the frame',
    type: 'text',
    hint: NAME_HINT,
    placeholder: 'X-T50',
  },
  {
    key: 'kind',
    label: 'Type',
    type: 'select',
    required: true,
    options: [
      { value: 'digital', label: 'Digital' },
      { value: 'film', label: 'Film' },
    ],
  },
  {
    key: 'filmFormat',
    label: 'Film format',
    type: 'select',
    options: FORMAT,
    hint: 'Film cameras only',
  },
  { key: 'mount', label: 'Mount', type: 'text', placeholder: 'X, EF, fixed lens…' },
  { key: 'ownership', label: 'Ownership', type: 'select', required: true, options: OWNERSHIP },
  { key: 'status', label: 'Status', type: 'select', required: true, options: STATUS },
  { key: 'note', label: 'Note', type: 'text' },
];

export const LENS_FIELDS: readonly RecordField[] = [
  {
    key: 'name',
    label: 'Model name',
    type: 'text',
    required: true,
    placeholder: 'Fujinon XF 16-80mm F4 R OIS WR',
  },
  {
    key: 'displayName',
    label: 'Name on the frame',
    type: 'text',
    hint: NAME_HINT,
    placeholder: 'XF 16-80mm F4',
  },
  { key: 'mount', label: 'Mount', type: 'text', placeholder: 'X, EF…' },
  { key: 'ownership', label: 'Ownership', type: 'select', required: true, options: OWNERSHIP },
  { key: 'status', label: 'Status', type: 'select', required: true, options: STATUS },
  { key: 'note', label: 'Note', type: 'text' },
];

export const FILM_FIELDS: readonly RecordField[] = [
  {
    key: 'name',
    label: 'Film name',
    type: 'text',
    required: true,
    placeholder: 'Kodak UltraMax 400',
  },
  { key: 'format', label: 'Format', type: 'select', required: true, options: FORMAT },
  { key: 'iso', label: 'ISO', type: 'number', placeholder: '400' },
  {
    key: 'kind',
    label: 'Type',
    type: 'select',
    required: true,
    options: [
      { value: 'color_negative', label: 'Color negative' },
      { value: 'bw', label: 'Black & white' },
      { value: 'slide', label: 'Slide' },
    ],
  },
  {
    key: 'usage',
    label: 'Usage',
    type: 'select',
    required: true,
    hint: 'Keep candidates as "Interested" until you have actually shot them',
    options: [
      { value: 'used', label: 'Used' },
      { value: 'planned', label: 'Planned' },
      { value: 'interested', label: 'Interested' },
    ],
  },
  { key: 'note', label: 'Note', type: 'text' },
];

export const CAMERA_DEFAULTS = { kind: 'digital', ownership: 'owned', status: 'active' };
export const LENS_DEFAULTS = { ownership: 'owned', status: 'active' };
export const FILM_DEFAULTS = {
  format: '135',
  kind: 'color_negative',
  usage: 'used',
  isFavorite: false,
};
