import { useState } from 'react';
import { Link, useParams } from 'react-router';

import {
  blankSettings,
  hasSettings,
  latestVersion,
  type Recipe,
  RECIPE_FIELDS,
  recipeCollection,
  type RecipeSettings,
  type RecipeSystem,
  type RecipeVersion,
  recipeVersionCollection,
  sameSettings,
  STARTER_RECIPES,
  STARTER_SYSTEM,
  systemOf,
  SYSTEMS,
  toSettings,
} from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
import { missingRequired, normalizeRecord, type RecordValues } from '@/shared/lib/record-field';
import { useCollection } from '@/shared/lib/use-collection';
import { useGoBack } from '@/shared/lib/use-go-back';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { labelText, labelTitle } from '@/shared/ui/label.css';
import { formatCount, MetaList } from '@/shared/ui/MetaList';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PickField } from '@/shared/ui/PickField';
import { RecordForm } from '@/shared/ui/RecordForm';
import { PageShell } from '@/widgets/page-shell';

import * as css from './LibraryPage.css';

type Meta = Pick<Recipe, 'name' | 'system' | 'state' | 'note'>;
/**
 * Where a change to an existing recipe goes: `correct` overwrites the current version (fixing a
 * mistake), `version` adds the next version (keeping history), `new` creates a separate recipe.
 */
type SaveTarget = 'new' | 'version' | 'correct';
type Preset = { value: string; label: string; system: RecipeSystem; settings: RecipeSettings };
type SaveRecipe = (meta: Meta, settings: RecipeSettings, target: SaveTarget) => Promise<void>;

type RecipeFormProps = {
  recipe: Recipe | undefined;
  /** Settings of the latest saved version, used to tell whether the user changed anything. */
  saved: RecipeSettings;
  presets: readonly Preset[];
  /** Number of the latest saved version, or 0 when the recipe has none yet. */
  version: number;
  onSave: SaveRecipe;
  /** Present only when editing an existing recipe. */
  onDelete?: () => Promise<void>;
  onDone: () => void;
};

const RecipeForm = ({
  recipe,
  saved,
  presets,
  version,
  onSave,
  onDelete,
  onDone,
}: RecipeFormProps) => {
  const [values, setValues] = useState<RecordValues>({
    name: recipe?.name ?? '',
    system: recipe ? systemOf(recipe) : 'fujifilm',
    state: recipe?.state ?? 'candidate',
    note: recipe?.note ?? '',
    ...saved,
  });
  const [preset, setPreset] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const remove = async () => {
    if (!onDelete) return;
    setBusy(true);
    setError('');
    try {
      await onDelete();
      onDone();
    } catch {
      setError(MESSAGES.deleteFailed);
      setBusy(false);
    }
  };

  const change = (key: string, value: string) =>
    setValues(prev =>
      // Settings belong to a system. Changing it starts the settings over, so values from the
      // old system are not saved under the new one.
      key === 'system' && value !== prev.system
        ? { ...prev, ...blankSettings(), system: value }
        : { ...prev, [key]: value },
    );

  const system = systemOf({ system: values.system as RecipeSystem });
  const settingFields = SYSTEMS[system].fields;

  const applyPreset = (value: string) => {
    setPreset(value);
    const chosen = presets.find(item => item.value === value);
    if (!chosen) return;
    // Replace every setting so nothing from a previous preset lingers. A preset also brings its
    // camera system, since its settings only make sense there.
    const cleared = Object.fromEntries(SYSTEMS[chosen.system].fields.map(({ key }) => [key, '']));
    setValues(prev => ({ ...prev, ...cleared, ...chosen.settings, system: chosen.system }));
  };

  const commit = async (target: SaveTarget) => {
    const meta = normalizeRecord(RECIPE_FIELDS, values) as unknown as Meta;
    setAsking(false);
    setBusy(true);
    setError('');
    try {
      await onSave(meta, toSettings(system, values), target);
      onDone();
    } catch {
      setError(MESSAGES.saveFailed);
      setBusy(false);
    }
  };

  const submit = () => {
    const missing = missingRequired(RECIPE_FIELDS, normalizeRecord(RECIPE_FIELDS, values));
    if (missing.length > 0) return setError(MESSAGES.fillIn(missing));
    if (!recipe) return void commit('new');
    // Changed settings of a recipe that already has a version: a typo fix, a new version and a
    // separate recipe are different intentions, so ask. Otherwise there is nothing to choose.
    if (version > 0 && !sameSettings(saved, toSettings(system, values))) return setAsking(true);
    void commit('version');
  };

  return (
    <>
      {error && <ErrorText>{error}</ErrorText>}

      <RecordForm fields={RECIPE_FIELDS} values={values} onChange={change} />

      <PickField
        label="Start from a preset"
        indicator="Optional"
        description="Copies the settings below so you can tweak them. The preset itself is not changed."
        value={preset}
        options={presets}
        onChange={applyPreset}
      />

      <h3 className={labelTitle}>
        {SYSTEMS[system].label} settings{version > 0 && ` — v${version}`}
      </h3>
      <RecordForm fields={settingFields} values={values} onChange={change} />

      <div className={css.actions}>
        {onDelete && (
          <Button className={css.destructive} variant="plain" onClick={() => setConfirming(true)}>
            Delete recipe
          </Button>
        )}
        <Button onClick={onDone}>Cancel</Button>
        <Button variant="primary" loading={busy} onClick={submit}>
          Save recipe
        </Button>
      </div>

      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title="How should this change be saved?"
        actions={[
          { label: 'Save as new recipe', onSelect: () => void commit('new') },
          { label: `Correct v${version}`, onSelect: () => void commit('correct') },
          {
            label: `Save as v${version + 1}`,
            primary: true,
            onSelect: () => void commit('version'),
          },
        ]}
      >
        Correct v{version} fixes a mistake in place. Save as v{version + 1} keeps v{version} in the
        history. Save as new recipe leaves “{recipe?.name}” untouched.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this recipe?"
        actions={[{ label: 'Delete', primary: true, onSelect: () => void remove() }]}
      >
        Use this for a recipe entered by mistake. If you only stopped using it, set its state to
        Archived so it stays in your record. Deleting removes every version and cannot be undone.
      </ConfirmDialog>
    </>
  );
};

/**
 * Recipe library: lists Fujifilm recipes and hosts the form for creating one from scratch,
 * from a preset, or by tweaking an existing recipe.
 */
export const RecipesPage = () => {
  const { id } = useParams();
  const goBack = useGoBack('/recipes');
  const recipes = useCollection(recipeCollection);
  const versions = useCollection(recipeVersionCollection);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const ready = recipes.status === 'ready' && versions.status === 'ready';
  const editing = id !== undefined;
  const current = id && id !== 'new' ? recipes.items.find(item => item.id === id) : undefined;
  const latest = current ? latestVersion(versions.items, current.id) : undefined;

  const presets: Preset[] = [
    ...recipes.items.map(recipe => ({
      value: `recipe:${recipe.id}`,
      label: recipe.name,
      system: systemOf(recipe),
      settings: latestVersion(versions.items, recipe.id)?.settings ?? {},
    })),
    ...SYSTEMS.fujifilm.baseLooks.map(simulation => ({
      value: `sim:${simulation}`,
      label: `${simulation} (plain simulation)`,
      system: 'fujifilm' as const,
      settings: { simulation },
    })),
  ];

  // The owner's own recipes can be imported at any time; ones already present are skipped.
  const missingStarters = STARTER_RECIPES.filter(
    starter =>
      !recipes.items.some(
        recipe => recipe.name === starter.name && systemOf(recipe) === STARTER_SYSTEM,
      ),
  );

  const create = async (meta: Meta, settings: RecipeSettings) => {
    const recipe = await recipeCollection.save({
      ...meta,
      baseSimulation: settings.simulation ?? null,
    });
    // A recipe known only by name gets no version: "no settings yet" and "v1" are different.
    if (!hasSettings(settings)) return;
    try {
      await recipeVersionCollection.save({
        recipeId: recipe.id,
        version: 1,
        settings,
        sourceUrl: null,
      } satisfies Omit<RecipeVersion, 'id'>);
    } catch (cause) {
      // The two inserts are not one transaction. Undo the first so a retry does not leave a
      // second recipe behind, then report the original failure.
      await recipeCollection.remove(recipe.id).catch(() => undefined);
      throw cause;
    }
  };

  const saveRecipe: SaveRecipe = async (meta, settings, target) => {
    if (!current || target === 'new') {
      // Saving a tweak as a separate recipe must not reuse the original's name.
      const name = current && meta.name === current.name ? `${meta.name} (copy)` : meta.name;
      await create({ ...meta, name }, settings);
    } else {
      await recipeCollection.save({
        ...current,
        ...meta,
        baseSimulation: settings.simulation ?? null,
      });
      if (latest && target === 'correct')
        // A mistake is fixed where it is: the version keeps its number, and photos linked to it
        // show the corrected values.
        await recipeVersionCollection.save({ ...latest, settings });
      else if (hasSettings(settings) && (!latest || !sameSettings(latest.settings, settings)))
        await recipeVersionCollection.save({
          recipeId: current.id,
          version: (latest?.version ?? 0) + 1,
          settings,
          sourceUrl: latest?.sourceUrl ?? null,
        });
    }
    await Promise.all([recipes.reload(), versions.reload()]);
  };

  const importStarters = async () => {
    setImporting(true);
    setImportError('');
    try {
      for (const starter of missingStarters)
        await create(
          { name: starter.name, system: STARTER_SYSTEM, state: starter.state, note: null },
          starter.settings,
        );
    } catch {
      setImportError('Import stopped partway. The ones already imported are in the list.');
    }
    // Reload either way: after a partial failure the list must show what did get saved, or the
    // next attempt would import those again.
    await Promise.all([recipes.reload(), versions.reload()]).catch(() => undefined);
    setImporting(false);
  };

  return (
    <PageShell>
      <PageHeader title="Recipes" lead="Camera settings you shoot with, kept per camera system." />

      <SignInGate what="recipes">
        {editing ? (
          <Panel title={id === 'new' ? 'New recipe' : 'Edit recipe'}>
            {!ready || (id !== 'new' && !current) ? (
              <EmptyState title={ready ? 'Not found' : 'Loading'}>
                {ready ? 'This recipe no longer exists.' : 'One moment.'}
              </EmptyState>
            ) : (
              <RecipeForm
                key={id}
                recipe={current}
                saved={latest?.settings ?? {}}
                version={latest?.version ?? 0}
                onDelete={current ? () => recipes.remove(current.id) : undefined}
                presets={presets.filter(item => item.value !== `recipe:${current?.id}`)}
                onSave={saveRecipe}
                onDone={goBack}
              />
            )}
          </Panel>
        ) : (
          <Panel
            title="All recipes"
            action={
              <Button variant="primary" size="small" to="/recipes/new">
                + New recipe
              </Button>
            }
          >
            {ready && (
              <MetaList
                rows={[
                  { label: 'Status', value: recipes.items.length === 0 ? 'Empty' : 'Ready' },
                  { label: 'Registered', value: formatCount(recipes.items.length) },
                  {
                    label: 'In the camera',
                    value: formatCount(
                      recipes.items.filter(item => item.state === 'active').length,
                    ),
                  },
                  { label: 'Last added', value: recipes.items.at(-1)?.name ?? '—' },
                ]}
              />
            )}

            {importError && <ErrorText>{importError}</ErrorText>}

            {ready && recipes.items.length === 0 && (
              <EmptyState title="No recipe registered">
                Start a new recipe for any camera, or import the ones you wrote down.
              </EmptyState>
            )}

            {ready && missingStarters.length > 0 && (
              <div className={css.actions}>
                <Button loading={importing} onClick={() => void importStarters()}>
                  Import my recipes ({missingStarters.length})
                </Button>
              </div>
            )}

            {recipes.items.length > 0 && (
              <ul className={css.list}>
                {recipes.items.map(recipe => {
                  const version = latestVersion(versions.items, recipe.id);
                  const summary = [
                    version?.settings.customSlot,
                    SYSTEMS[systemOf(recipe)].label,
                    recipe.baseSimulation,
                    version ? `v${version.version}` : 'no settings yet',
                  ];
                  return (
                    <li key={recipe.id}>
                      <Link to={`/recipes/${recipe.id}`} className={css.row}>
                        <span className={css.rowTitle}>{recipe.name}</span>
                        <span className={labelText}>{summary.filter(Boolean).join(' · ')}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        )}
      </SignInGate>
    </PageShell>
  );
};
