import { describe, expect, it } from 'vitest';

import { missingRequired, normalizeRecord, type RecordField } from './record-field';

const FIELDS: RecordField[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'iso', label: 'ISO', type: 'number' },
  { key: 'note', label: 'Note', type: 'text' },
];

describe('normalizeRecord', () => {
  it('when text has surrounding spaces and numbers are typed as text, it must trim and convert them', () => {
    expect(normalizeRecord(FIELDS, { name: ' UltraMax 400 ', iso: '400', note: 'x' })).toEqual({
      name: 'UltraMax 400',
      iso: 400,
      note: 'x',
    });
  });

  it('when fields are left blank or hold a non-number, it must store null instead of a default', () => {
    expect(normalizeRecord(FIELDS, { name: '  ', iso: 'abc' })).toEqual({
      name: null,
      iso: null,
      note: null,
    });
  });
});

describe('missingRequired', () => {
  it('when a required field is null, it must report that field label', () => {
    expect(missingRequired(FIELDS, { name: null, iso: null, note: null })).toEqual(['Name']);
  });
});
