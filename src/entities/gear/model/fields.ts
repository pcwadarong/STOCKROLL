import type { RecordField } from '@/shared/lib/record-field';

export const STATUS = [
  { value: 'active', label: 'In use' },
  { value: 'inactive', label: 'Not in use' },
  { value: 'repair', label: 'In repair' },
  { value: 'display', label: 'Display only' },
  { value: 'rented', label: 'Rented' },
  { value: 'sold', label: 'Sold' },
] as const;

export const CAMERA_KIND = [
  { value: 'digital', label: 'Digital' },
  { value: 'film', label: 'Film' },
] as const;

export const BODY_TYPE = [
  { value: 'mirrorless', label: 'Mirrorless' },
  { value: 'slr', label: 'SLR' },
  { value: 'compact', label: 'Compact' },
  { value: 'rangefinder', label: 'Rangefinder' },
  { value: 'tlr', label: 'TLR' },
  { value: 'instant', label: 'Instant' },
  { value: 'phone', label: 'Phone' },
  { value: 'other', label: 'Other' },
] as const;

export const FILM_KIND = [
  { value: 'color_negative', label: 'Color negative' },
  { value: 'bw', label: 'Black & white' },
  { value: 'slide', label: 'Slide' },
  { value: 'cine', label: 'Cine' },
] as const;

export const FORMAT = [
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
    options: CAMERA_KIND,
  },
  {
    key: 'bodyType',
    label: 'Body',
    type: 'select',
    options: BODY_TYPE,
    hint: 'A digital SLR is "Digital" with an "SLR" body',
  },
  {
    key: 'filmFormat',
    label: 'Film format',
    type: 'select',
    options: FORMAT,
    hint: 'Film cameras only',
  },
  { key: 'mount', label: 'Mount', type: 'text', placeholder: 'X, EF, fixed lens…' },
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
    options: FILM_KIND,
  },
  { key: 'note', label: 'Note', type: 'text' },
];

export const CAMERA_DEFAULTS = { kind: 'digital', status: 'active', isFavorite: false };
export const LENS_DEFAULTS = { status: 'active', isFavorite: false };
export const FILM_DEFAULTS = { format: '135', kind: 'color_negative', isFavorite: false };
