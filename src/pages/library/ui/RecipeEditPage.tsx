import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import {
  blankSettings,
  DETAIL_FIELDS,
  hasSettings,
  type ParsedRecipeText,
  type Recipe,
  RECIPE_FIELDS,
  type RecipeSettings,
  type RecipeSystem,
  type RecipeVersion,
  sameSettings,
  systemOf,
  SYSTEMS,
  toSettings,
  versionSlots,
  versionsOf,
} from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
import { missingRequired, normalizeRecord, type RecordValues } from '@/shared/lib/record-field';
import { useGoBack } from '@/shared/lib/use-go-back';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PickField } from '@/shared/ui/PickField';
import { RecordForm } from '@/shared/ui/RecordForm';
import { PageShell } from '@/widgets/page-shell';

import {
  addVersion,
  correctVersion,
  createRecipe,
  type RecipeDetails,
} from '../model/recipe-actions';
import { useRecipeLibrary } from '../model/use-recipe-library';

import { flagText, PasteSettings } from './PasteSettings';

import * as css from './LibraryPage.css';

/**
 * What the form is for. Chosen on the detail screen before editing, so the form never has to ask
 * afterwards what the change was meant to be.
 */
type Mode = 'new' | 'details' | 'correct' | 'version';

type Source = { label: string; system: RecipeSystem; settings: RecipeSettings };

type FormProps = {
  mode: Mode;
  recipe: Recipe | undefined;
  version: RecipeVersion | undefined;
  nextVersion: number;
  /** Settings the form starts from: the version being edited, or the recipe being copied. */
  initial: RecipeSettings;
  initialSystem: RecipeSystem;
  initialName: string;
  sources: readonly (Source & { value: string })[];
  onSubmit: (
    details: RecipeDetails,
    system: RecipeSystem,
    settings: RecipeSettings,
  ) => Promise<void>;
  onCancel: () => void;
};

const TITLES: Record<Mode, (version: number, next: number) => string> = {
  new: () => 'New recipe',
  details: () => 'Name and state',
  correct: version => `Correct v${version}`,
  version: (_version, next) => `New version — v${next}`,
};

const EXPLANATIONS: Record<Mode, (version: number, next: number) => string> = {
  new: () => 'Pick the camera system first: it decides which settings the recipe has.',
  details: () => 'These describe the recipe as a whole and apply to every version.',
  correct: version =>
    `Changes overwrite v${version}. Use this to fix a value that was entered wrong.`,
  version: (version, next) =>
    version > 0
      ? `Starts from v${version}. Saving adds v${next}; v${version} stays as it is.`
      : 'These become v1 of this recipe.',
};

const RecipeEditForm = ({
  mode,
  recipe,
  version,
  nextVersion,
  initial,
  initialSystem,
  initialName,
  sources,
  onSubmit,
  onCancel,
}: FormProps) => {
  const [values, setValues] = useState<RecordValues>({
    name: initialName,
    system: initialSystem,
    state: recipe?.state ?? 'candidate',
    note: recipe?.note ?? '',
    ...initial,
  });
  // Fields of pasted text that need a second look, with the remark to show under each.
  const [guessed, setGuessed] = useState<Record<string, string>>({});
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const system = systemOf({ system: values.system as RecipeSystem });
  const editsDetails = mode === 'new' || mode === 'details';
  const editsSettings = mode !== 'details';

  const fill = ({ settings, flags }: ParsedRecipeText) => {
    setValues(prev => ({ ...prev, ...settings }));
    // A field filled again loses its old remark; it gets a new one only if it is flagged again.
    setGuessed(prev => ({
      ...Object.fromEntries(Object.entries(prev).filter(([key]) => !(key in settings))),
      // A field can carry two remarks (a misspelled name and an unusual number, say).
      ...flags.reduce<Record<string, string>>(
        (notes, flag) => ({
          ...notes,
          [flag.key]: [notes[flag.key], flagText(flag)].filter(Boolean).join(' · '),
        }),
        {},
      ),
    }));
  };

  const change = (key: string, value: string) => {
    // Editing a field is the check the remark asked for. Switching system starts over.
    setGuessed(prev =>
      key === 'system' ? {} : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)),
    );
    setValues(prev =>
      // Settings belong to a system. Changing it starts the settings over, so values from the
      // old system are not saved under the new one.
      key === 'system' && value !== prev.system
        ? { ...prev, ...blankSettings(), system: value }
        : { ...prev, [key]: value },
    );
  };

  const copyFrom = (value: string) => {
    setSource(value);
    const chosen = sources.find(item => item.value === value);
    if (!chosen) return;
    // Copied settings replace everything, pasted guesses included.
    setGuessed({});
    setValues(prev => ({
      ...prev,
      ...blankSettings(),
      ...chosen.settings,
      system: chosen.system,
    }));
  };

  const submit = async () => {
    const details = normalizeRecord(RECIPE_FIELDS, values);
    const missing = editsDetails ? missingRequired(RECIPE_FIELDS, details) : [];
    if (missing.length > 0) return setError(MESSAGES.fillIn(missing));

    const settings = toSettings(system, values);
    // A version that records nothing, or repeats the one it started from, would only use up a
    // slot — and an empty v1 would hide the fact that the recipe has no settings yet.
    if (mode === 'version' && !hasSettings(settings))
      return setError('Enter at least one setting before saving a version.');
    if (mode !== 'new' && editsSettings && sameSettings(initial, settings))
      return setError('Nothing was changed, so there is nothing to save.');

    setBusy(true);
    setError('');
    try {
      await onSubmit(details as unknown as RecipeDetails, system, settings);
    } catch {
      setError(MESSAGES.saveFailed);
      setBusy(false);
    }
  };

  return (
    <>
      <p className={css.note}>{EXPLANATIONS[mode](version?.version ?? 0, nextVersion)}</p>
      {error && <ErrorText>{error}</ErrorText>}

      {/* First on the form: pasting is the quickest way in, and it was easy to miss lower down. */}
      {editsSettings && <PasteSettings system={system} onFill={fill} />}

      {editsDetails && (
        <RecordForm
          fields={mode === 'new' ? RECIPE_FIELDS : DETAIL_FIELDS}
          values={values}
          onChange={change}
        />
      )}

      {mode === 'new' && sources.length > 0 && (
        <PickField
          label="Copy settings from"
          indicator="Optional"
          description="Fills the fields below. The other recipe stays as it is."
          value={source}
          options={sources}
          onChange={copyFrom}
        />
      )}

      {editsSettings && (
        <>
          <RecordForm
            fields={SYSTEMS[system].fields}
            values={values}
            onChange={change}
            notes={guessed}
          />
        </>
      )}

      <div className={css.actions}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" loading={busy} onClick={() => void submit()}>
          {mode === 'correct'
            ? `Save v${version?.version}`
            : mode === 'version'
              ? `Save as v${nextVersion}`
              : 'Save recipe'}
        </Button>
      </div>
    </>
  );
};

/**
 * Form for creating a recipe or changing one. The route and query decide the mode:
 * `/recipes/new` (optionally `?from=<recipe>&v=<n>` to copy), and `/recipes/:id/edit` with
 * `?mode=details|correct|version&v=<n>`.
 */
export const RecipeEditPage = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { recipes, versions, ready, saveRecipe, reload } = useRecipeLibrary();

  const recipe = id ? recipes.find(item => item.id === id) : undefined;
  const requested = params.get('mode');
  const mode: Mode = !id
    ? 'new'
    : requested === 'details' || requested === 'correct'
      ? requested
      : 'version';

  const history = recipe ? versionsOf(versions, recipe.id) : [];
  const version = history.find(item => String(item.version) === params.get('v')) ?? history[0];
  const nextVersion = (history[0]?.version ?? 0) + 1;

  // Copying: `/recipes/new?from=<recipe id>&v=<n>`.
  const original = recipes.find(item => item.id === params.get('from'));
  const copied = original
    ? (versionsOf(versions, original.id).find(item => String(item.version) === params.get('v')) ??
      versionsOf(versions, original.id)[0])
    : undefined;

  const goBack = useGoBack(recipe ? `/recipes/${recipe.id}` : '/recipes');

  const sources = recipes.flatMap(item => {
    const latest = versionsOf(versions, item.id)[0];
    return latest
      ? [
          {
            value: item.id,
            label: `${item.name} (${SYSTEMS[systemOf(item)].label})`,
            system: systemOf(item),
            settings: latest.settings,
          },
        ]
      : [];
  });

  const submit: FormProps['onSubmit'] = async (details, system, settings) => {
    if (mode === 'new') {
      const created = await createRecipe({ ...details, system }, settings);
      await reload();
      return void navigate(`/recipes/${created.id}`, { replace: true });
    }
    if (!recipe) return;
    if (mode === 'details') await saveRecipe({ ...recipe, ...details });
    else if (mode === 'correct' && version)
      await correctVersion(recipe, version, settings, version.id === history[0]?.id);
    else await addVersion(recipe, versions, settings);
    await reload();
    navigate(`/recipes/${recipe.id}`, { replace: true });
  };

  const missing = mode !== 'new' && !recipe;
  const blocked =
    mode === 'version' && versionSlots(history.length).full
      ? 'All version slots are used. Delete a version you no longer need, or copy to a new recipe.'
      : mode === 'correct' && !version
        ? 'This recipe has no version to correct yet.'
        : '';

  return (
    <PageShell>
      <PageHeader
        title={recipe?.name ?? 'New recipe'}
        lead={recipe ? SYSTEMS[systemOf(recipe)].label : undefined}
      />

      <SignInGate what="recipes">
        <Panel title={TITLES[mode](version?.version ?? 0, nextVersion)}>
          {!ready || missing ? (
            <EmptyState title={ready ? 'Not found' : 'Loading'}>
              {ready ? 'This recipe no longer exists.' : 'One moment.'}
            </EmptyState>
          ) : blocked ? (
            <EmptyState title="Not available" action={<Button onClick={goBack}>Back</Button>}>
              {blocked}
            </EmptyState>
          ) : (
            <RecipeEditForm
              key={`${mode}:${id}:${version?.id}:${copied?.id}`}
              mode={mode}
              recipe={recipe}
              version={version}
              nextVersion={nextVersion}
              initial={mode === 'new' ? (copied?.settings ?? {}) : (version?.settings ?? {})}
              initialSystem={recipe ? systemOf(recipe) : original ? systemOf(original) : 'fujifilm'}
              initialName={recipe?.name ?? (original ? `${original.name} (copy)` : '')}
              sources={sources}
              onSubmit={submit}
              onCancel={goBack}
            />
          )}
        </Panel>
      </SignInGate>
    </PageShell>
  );
};
