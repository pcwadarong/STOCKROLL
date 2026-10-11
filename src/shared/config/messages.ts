/** Wording for failures that can happen on any screen, kept in one place so it stays consistent. */
export const MESSAGES = {
  saveFailed: 'Could not save. Check your connection and try again.',
  loadFailed: 'Could not load. Try again.',
  deleteFailed: 'Could not delete. Check your connection and try again.',
  fillIn: (labels: readonly string[]) => `Fill in: ${labels.join(', ')}`,
} as const;
