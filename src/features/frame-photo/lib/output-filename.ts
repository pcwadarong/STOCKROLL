/**
 * Builds the export file name.
 * @param sourceName original file name
 * @param presetId output preset id
 * @returns `{original}_stockroll_{preset}.jpg`
 */
export const outputFilename = (sourceName: string, presetId: string) => {
  const base = sourceName.replace(/\.[^.]+$/, '') || 'photo';
  return `${base}_stockroll_${presetId}.jpg`;
};

/**
 * Builds the export file names for a whole batch so that no two are the same.
 *
 * Photos from different folders or cameras often share a name (`DSCF0001.jpg` twice), and a
 * download that reuses a name either overwrites the earlier file or is renamed by the browser in
 * a way that no longer says which photo it was. The first photo keeps the plain name and later
 * ones get `-2`, `-3`… Names are compared without case because common file systems do the same.
 * @param sourceNames original file names in queue order
 * @param presetId output preset id
 * @returns one unique file name per photo, in the same order
 */
export const outputFilenames = (sourceNames: readonly string[], presetId: string) => {
  const taken = new Set<string>();
  return sourceNames.map(sourceName => {
    const base = sourceName.replace(/\.[^.]+$/, '') || 'photo';
    let name = outputFilename(base, presetId);
    for (let copy = 2; taken.has(name.toLowerCase()); copy++)
      name = outputFilename(`${base}-${copy}`, presetId);
    taken.add(name.toLowerCase());
    return name;
  });
};
