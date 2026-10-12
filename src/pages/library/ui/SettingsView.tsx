import { recipeLines, type RecipeSettings, type RecipeSystem } from '@/entities/recipe';

import * as css from './LibraryPage.css';

/**
 * Read-only view of a version's settings, as a two-column sheet: each setting's name above its
 * value, in menu order. Only settings that have a value are listed.
 * @param props the camera system (which decides labels and order) and the settings
 */
export const SettingsView = ({
  system,
  settings,
}: {
  system: RecipeSystem;
  settings: RecipeSettings;
}) => (
  <dl className={css.sheet}>
    {recipeLines(system, settings).map(({ label, value }) => (
      <div key={label} className={css.sheetCell}>
        <dt className={css.sheetLabel}>{label}</dt>
        <dd className={css.sheetValue}>{value}</dd>
      </div>
    ))}
  </dl>
);
