import { describe, expect, it } from 'vitest';

import { crc32, makeZip } from './zip';

const text = (value: string) => new TextEncoder().encode(value);

describe('crc32', () => {
  it('when given the standard check input, it must give the standard checksum', () => {
    expect(crc32(text('123456789'))).toBe(0xcbf43926);
  });

  it('when given nothing, it must give zero', () => {
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe('makeZip', () => {
  const read = async (blob: Blob) => new DataView(await blob.arrayBuffer());

  it('when files are bundled, every entry must be stored as it is with its name, size and checksum', async () => {
    const zip = await makeZip([
      { name: 'a.jpg', blob: new Blob([text('first')]) },
      { name: 'b.jpg', blob: new Blob([text('second photo')]) },
    ]);
    const view = await read(zip);

    // First local header, then its name and the data unchanged.
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(8, true)).toBe(0); // stored, not compressed
    expect(view.getUint32(14, true)).toBe(crc32(text('first')));
    expect(view.getUint32(18, true)).toBe(5);
    const bytes = new Uint8Array(view.buffer);
    expect(new TextDecoder().decode(bytes.slice(30, 35))).toBe('a.jpg');
    expect(new TextDecoder().decode(bytes.slice(35, 40))).toBe('first');

    // The end record counts both entries and points at the central directory.
    const end = view.byteLength - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const centralAt = view.getUint32(end + 16, true);
    expect(view.getUint32(centralAt, true)).toBe(0x02014b50);
  });

  it('when a name is not ASCII, it must be written as UTF-8 and flagged so', async () => {
    const zip = await makeZip([{ name: '서울.jpg', blob: new Blob([text('x')]) }]);
    const view = await read(zip);
    expect(view.getUint16(6, true) & 0x0800).toBe(0x0800);
    expect(view.getUint16(26, true)).toBe(text('서울.jpg').length);
  });

  it('when nothing is bundled, it must still be a valid empty ZIP', async () => {
    const view = await read(await makeZip([]));
    expect(view.byteLength).toBe(22);
    expect(view.getUint32(0, true)).toBe(0x06054b50);
  });
});
