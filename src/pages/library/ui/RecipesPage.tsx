import { Text } from '@seed-design/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import {
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
import { missingRequired, normalizeRecord, type RecordValues } from '@/shared/lib/record-field';
import { useCollection } from '@/shared/lib/use-collection';
import { useGoBack } from '@/shared/lib/use-go-back';
import { Button } from '@/shared/ui/Button';
import { ErrorText } from '@/shared/ui/ErrorText';
import { card, labelText } from '@/shared/ui/label.css';
import { PickField } from '@/shared/ui/PickField';
import { RecordForm } from '@/shared/ui/RecordForm';
import { PageShell } from '@/widgets/page-shell';
import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'seed-design/ui/alert-dialog';

import { count, MetaList } from './LibraryPage';

import * as css from './LibraryPage.css';

type Meta = Pick<Recipe, 'name' | 'system' | 'state' | 'note'>;
type Preset = { value: string; label: string; system: RecipeSystem; settings: RecipeSettings };
type SaveRecipe = (
  meta: Meta,
  settings: RecipeSettings,
  target: 'new' | 'version',
) => Promise<void>;

type RecipeFormProps = {
  recipe: Recipe | undefined;
  /** Settings of the latest saved version, used to tell whether the user changed anything. */
  saved: RecipeSettings;
  presets: readonly Preset[];
  onSave: SaveRecipe;
  onDone: () => void;
};

const RecipeForm = ({ recipe, saved, presets, onSave, onDone }: RecipeFormProps) => {
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

  const change = (key: string, value: string) => setValues(prev => ({ ...prev, [key]: value }));

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

  const commit = async (target: 'new' | 'version') => {
    const meta = normalizeRecord(RECIPE_FIELDS, values) as unknown as Meta;
    setAsking(false);
    setBusy(true);
    setError('');
    try {
      await onSave(meta, toSettings(system, values), target);
      onDone();
    } catch {
      setError('Could not save. Check your connection and try again.');
      setBusy(false);
    }
  };

  const submit = () => {
    const missing = missingRequired(RECIPE_FIELDS, normalizeRecord(RECIPE_FIELDS, values));
    if (missing.length > 0) return setError(`Fill in: ${missing.join(', ')}`);
    if (!recipe) return void commit('new');
    // Changed settings of an existing recipe: let the user decide where the change goes.
    if (!sameSettings(saved, toSettings(system, values))) return setAsking(true);
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

      <h3 className={`${labelText} ${css.panelTitle}`}>{SYSTEMS[system].label} settings</h3>
      <RecordForm fields={settingFields} values={values} onChange={change} />

      <div className={css.actions}>
        <Button onClick={onDone}>Cancel</Button>
        <Button variant="primary" loading={busy} onClick={submit}>
          Save recipe
        </Button>
      </div>

      <AlertDialogRoot open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Settings changed</AlertDialogTitle>
            <AlertDialogDescription>
              Update “{recipe?.name}”, or save these settings as a new recipe? Updating adds a
              version; linked photos keep the old one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setAsking(false)}>Cancel</Button>
            <Button onClick={() => void commit('new')}>Save as new recipe</Button>
            <Button variant="primary" onClick={() => void commit('version')}>
              Update this recipe
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
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
    starter => !recipes.items.some(recipe => recipe.name === starter.name),
  );

  const create = async (meta: Meta, settings: RecipeSettings) => {
    const recipe = await recipeCollection.save({
      ...meta,
      baseSimulation: settings.simulation ?? null,
    });
    await recipeVersionCollection.save({
      recipeId: recipe.id,
      version: 1,
      settings,
      sourceUrl: null,
    } satisfies Omit<RecipeVersion, 'id'>);
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
      if (!latest || !sameSettings(latest.settings, settings))
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
      await Promise.all([recipes.reload(), versions.reload()]);
    } catch {
      setImportError('Import stopped partway. Check the list before trying again.');
    }
    setImporting(false);
  };

  return (
    <PageShell>
      <div className={css.intro}>
        <h1 className={css.heading}>Recipes</h1>
        <Text as="p" color="fg.neutralMuted">
          Camera settings you shoot with, kept per camera system.
        </Text>
      </div>

      <SignInGate what="recipes">
        <section className={`${card} ${css.panel}`}>
          {editing ? (
            <>
              <div className={css.header}>
                <h2 className={`${labelText} ${css.panelTitle}`}>
                  {id === 'new' ? 'New recipe' : 'Edit recipe'}
                </h2>
              </div>
              {!ready || (id !== 'new' && !current) ? (
                <Text as="p" color="fg.neutralMuted" aria-live="polite">
                  {ready ? 'This recipe no longer exists.' : 'Loading…'}
                </Text>
              ) : (
                <RecipeForm
                  key={id}
                  recipe={current}
                  saved={latest?.settings ?? {}}
                  presets={presets.filter(item => item.value !== `recipe:${current?.id}`)}
                  onSave={saveRecipe}
                  onDone={goBack}
                />
              )}
            </>
          ) : (
            <>
              <div className={css.header}>
                <h2 className={`${labelText} ${css.panelTitle}`}>All recipes</h2>
                <Button variant="primary" size="small" to="/recipes/new">
                  + New recipe
                </Button>
              </div>

              {ready && (
                <MetaList
                  rows={[
                    { label: 'Status', value: recipes.items.length === 0 ? 'Empty' : 'Ready' },
                    { label: 'Registered', value: count(recipes.items.length) },
                    {
                      label: 'In the camera',
                      value: count(recipes.items.filter(item => item.state === 'active').length),
                    },
                    { label: 'Last added', value: recipes.items.at(-1)?.name ?? '—' },
                  ]}
                />
              )}

              {importError && <ErrorText>{importError}</ErrorText>}
              {ready && recipes.items.length === 0 && (
                <div className={css.empty}>
                  <p className={`${labelText} ${css.panelTitle}`}>No recipe registered</p>
                  <Text as="p" color="fg.neutralMuted">
                    Start a new recipe for any camera, or import the ones you wrote down.
                  </Text>
                </div>
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
                          <Text textStyle="t5Bold">{recipe.name}</Text>
                          <span className={labelText}>{summary.filter(Boolean).join(' · ')}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      </SignInGate>
    </PageShell>
  );
};
