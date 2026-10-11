import { type RecipeSettings, type RecipeSystem, SYSTEMS } from '@/entities/recipe';
import { labelTitle } from '@/shared/ui/label.css';
import { MetaList } from '@/shared/ui/MetaList';

import * as css from './LibraryPage.css';

/**
 * Read-only view of a version's settings, in the same sections as the form.
 * Only settings that have a value are listed; nothing is shown for the ones left blank.
 * @param props the camera system (which decides labels and sections) and the settings
 */
export const SettingsView = ({
  system,
  settings,
}: {
  system: RecipeSystem;
  settings: RecipeSettings;
}) => {
  const filled = SYSTEMS[system].fields.filter(field => settings[field.key]?.trim());
  const groups = [...new Set(filled.map(field => field.group ?? ''))];

  return (
    <div className={css.sections}>
      {groups.map(group => (
        <section key={group} className={css.section}>
          {group && <h3 className={labelTitle}>{group}</h3>}
          <MetaList
            rows={filled
              .filter(field => (field.group ?? '') === group)
              .map(field => ({ label: field.label, value: settings[field.key] ?? '' }))}
          />
        </section>
      ))}
    </div>
  );
};
