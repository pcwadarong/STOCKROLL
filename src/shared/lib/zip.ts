// A ZIP that only bundles: every entry is stored as it is. JPEG is already compressed, so
// compressing it again saves almost nothing and costs time — and storing keeps the format small
// enough to write here instead of adding a library.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/**
 * The CRC-32 checksum a ZIP entry carries.
 * @param bytes the entry's data
 * @returns the checksum as an unsigned 32-bit number
 */
export const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

/** The date and time fields of a ZIP entry, in the old DOS format ZIP still uses. */
const dosTime = (date: Date) => ({
  time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  day:
    ((Math.max(1980, date.getFullYear()) - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate(),
});

// Bit 11: names are UTF-8, so a Korean or accented file name comes out as written.
const UTF8_NAMES = 0x0800;

type Entry = { name: Uint8Array<ArrayBuffer>; size: number; crc: number; offset: number };

const header = (signature: number, length: number) => {
  const view = new DataView(new ArrayBuffer(length));
  view.setUint32(0, signature, true);
  return view;
};

const localHeader = (entry: Entry, when: ReturnType<typeof dosTime>) => {
  const view = header(0x04034b50, 30);
  view.setUint16(4, 20, true); // version needed
  view.setUint16(6, UTF8_NAMES, true);
  view.setUint16(8, 0, true); // stored
  view.setUint16(10, when.time, true);
  view.setUint16(12, when.day, true);
  view.setUint32(14, entry.crc, true);
  view.setUint32(18, entry.size, true);
  view.setUint32(22, entry.size, true);
  view.setUint16(26, entry.name.length, true);
  return view.buffer;
};

const centralHeader = (entry: Entry, when: ReturnType<typeof dosTime>) => {
  const view = header(0x02014b50, 46);
  view.setUint16(4, 20, true); // version made by
  view.setUint16(6, 20, true); // version needed
  view.setUint16(8, UTF8_NAMES, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, when.time, true);
  view.setUint16(14, when.day, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.size, true);
  view.setUint32(24, entry.size, true);
  view.setUint16(28, entry.name.length, true);
  view.setUint32(42, entry.offset, true);
  return view.buffer;
};

const endRecord = (count: number, size: number, offset: number) => {
  const view = header(0x06054b50, 22);
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, size, true);
  view.setUint32(16, offset, true);
  return view.buffer;
};

/**
 * Bundles files into one ZIP without compressing them. Each file is read once for its checksum
 * and then kept only as the Blob it already is, so the ZIP is assembled from the originals.
 * @param files the files, by the names they get inside the ZIP
 * @param when the date the entries carry
 * @returns the ZIP
 */
export const makeZip = async (
  files: readonly { name: string; blob: Blob }[],
  when: Date = new Date(),
) => {
  const time = dosTime(when);
  const parts: BlobPart[] = [];
  const entries: Entry[] = [];
  let offset = 0;
  for (const file of files) {
    const bytes = new Uint8Array(await file.blob.arrayBuffer());
    const entry = {
      name: new TextEncoder().encode(file.name),
      size: bytes.length,
      crc: crc32(bytes),
      offset,
    };
    entries.push(entry);
    parts.push(localHeader(entry, time), entry.name, file.blob);
    offset += 30 + entry.name.length + entry.size;
  }
  const central: BlobPart[] = entries.flatMap(entry => [centralHeader(entry, time), entry.name]);
  const centralSize = entries.reduce((sum, entry) => sum + 46 + entry.name.length, 0);
  return new Blob([...parts, ...central, endRecord(entries.length, centralSize, offset)], {
    type: 'application/zip',
  });
};
