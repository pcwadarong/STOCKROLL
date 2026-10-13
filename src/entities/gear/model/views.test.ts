import { describe, expect, it } from 'vitest';

import { statusNote } from './views';

describe('statusNote', () => {
  it('when gear is in use, there must be nothing to say', () => {
    expect(statusNote({ status: 'active' })).toBeUndefined();
  });

  it('when gear is in repair, the note must be an alert', () => {
    expect(statusNote({ status: 'repair' })).toEqual({ label: 'In repair', tone: 'alert' });
  });

  it('when gear is shelved, on display, rented or sold, the note must be muted', () => {
    expect(statusNote({ status: 'display' })).toEqual({ label: 'Display only', tone: 'muted' });
    expect(statusNote({ status: 'rented' })?.tone).toBe('muted');
  });

  it('when a record has no status, such as a film, there must be no note', () => {
    expect(statusNote({ kind: 'bw' })).toBeUndefined();
  });
});
