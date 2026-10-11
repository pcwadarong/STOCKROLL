/** Wording for failures that can happen on any screen, kept in one place so it stays consistent. */
export const MESSAGES = {
  saveFailed: 'Could not save. Check your connection and try again.',
  loadFailed: 'Could not load. Try again.',
  fillIn: (labels: readonly string[]) => `Fill in: ${labels.join(', ')}`,
} as const;
