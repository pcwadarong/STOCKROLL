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
