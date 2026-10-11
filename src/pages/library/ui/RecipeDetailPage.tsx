import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import {
  MAX_VERSIONS,
  RECIPE_FIELDS,
  systemOf,
  SYSTEMS,
  versionSlots,
  versionsOf,
} from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';

import { removeVersion } from '../model/recipe-actions';
import { useRecipeLibrary } from '../model/use-recipe-library';

import { RecipePhoto } from './RecipePhoto';
import { SettingsView } from './SettingsView';

import * as css from './LibraryPage.css';

const STATE_LABELS = Object.fromEntries(
  (RECIPE_FIELDS.find(field => field.key === 'state')?.options ?? []).map(option => [
    option.value,
    option.label,
  ]),
);

/**
 * One recipe, read-only: its settings on the left and its version history on the right.
 * What to do with a version — fix it, build the next one from it, or branch into a new recipe —
 * is chosen here, before any editing starts.
 */
export const RecipeDetailPage = () => {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { recipes, versions, ready, saveRecipe, removeRecipe, reload } = useRecipeLibrary();
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<'recipe' | 'version' | null>(null);

  const recipe = recipes.find(item => item.id === id);
  const history = recipe ? versionsOf(versions, recipe.id) : [];
  // The version in the URL when it exists, otherwise the newest.
  const selected = history.find(item => String(item.version) === params.get('v')) ?? history[0];
  const slots = versionSlots(history.length);

  const run = (action: () => Promise<unknown>, failure: string) => {
    setError('');
    action().catch(() => setError(failure));
  };

  if (!ready || !recipe)
    return (
      <PageShell>
        <PageHeader title="Recipe" />
        <SignInGate what="recipes">
          <Panel>
            <EmptyState title={ready ? 'Not found' : 'Loading'}>
              {ready ? 'This recipe no longer exists.' : 'One moment.'}
            </EmptyState>
          </Panel>
        </SignInGate>
      </PageShell>
    );

  const system = systemOf(recipe);
  const edit = (mode: string) =>
    `/recipes/${recipe.id}/edit?mode=${mode}${selected ? `&v=${selected.version}` : ''}`;

  return (
    <PageShell wide>
      <PageHeader
        title={recipe.name}
        lead={[SYSTEMS[system].label, STATE_LABELS[recipe.state], recipe.note]
          .filter(Boolean)
          .join(' · ')}
      />

      <SignInGate what="recipes">
        <div className={css.toolbar}>
          <button
            type="button"
            className={css.star}
            aria-pressed={recipe.isFavorite}
            aria-label="Favorite"
            onClick={() =>
              run(
                () => saveRecipe({ ...recipe, isFavorite: !recipe.isFavorite }),
                MESSAGES.saveFailed,
              )
            }
          >
            {recipe.isFavorite ? '★' : '☆'}
          </button>
          <Button size="small" to={`/recipes/${recipe.id}/edit?mode=details`}>
            Edit name and state
          </Button>
          <Button size="small" to="/recipes">
            All recipes
          </Button>
          <Button
            className={css.destructive}
            variant="plain"
            onClick={() => setConfirming('recipe')}
          >
            Delete recipe
          </Button>
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        <div className={css.columns}>
          <Panel title={selected ? `Settings — v${selected.version}` : 'Settings'}>
            {selected ? (
              <>
                <SettingsView system={system} settings={selected.settings} />
                <div className={css.toolbar}>
                  <Button to={edit('correct')}>Correct v{selected.version}</Button>
                  {slots.full ? (
                    <Button disabled>New version from this</Button>
                  ) : (
                    <Button variant="primary" to={edit('version')}>
                      New version from this
                    </Button>
                  )}
                  <Button to={`/recipes/new?from=${recipe.id}&v=${selected.version}`}>
                    Copy to a new recipe
                  </Button>
                </div>
                <p className={css.note}>
                  Correct fixes a mistake in v{selected.version} itself. New version keeps v
                  {selected.version} and saves your changes as v{(history[0]?.version ?? 0) + 1}.
                  Copy starts a separate recipe from these settings.
                </p>
              </>
            ) : (
              <EmptyState
                title="No settings yet"
                action={
                  <Button variant="primary" to={edit('version')}>
                    Add settings
                  </Button>
                }
              >
                This recipe is known by name only. Add its settings when you have them.
              </EmptyState>
            )}
          </Panel>

          <div className={css.stack}>
            <RecipePhoto recipe={recipe} onChanged={reload} />

            <Panel
              title="Versions"
              action={
                <span aria-label={`${slots.used} of ${MAX_VERSIONS} versions used`}>
                  {slots.used} / {MAX_VERSIONS}
                </span>
              }
            >
              {slots.full && (
                <p className={css.note}>
                  All {MAX_VERSIONS} slots are used. Delete a version you no longer need, or copy to
                  a new recipe. Nothing is removed automatically.
                </p>
              )}
              {slots.low && (
                <p className={css.note}>
                  {slots.left} {slots.left === 1 ? 'slot' : 'slots'} left.
                </p>
              )}

              {history.length > 0 && (
                <ul className={css.versionList}>
                  {history.map((version, index) => (
                    <li key={version.id}>
                      <Link
                        to={`/recipes/${recipe.id}?v=${version.version}`}
                        replace
                        className={css.versionItem}
                        aria-current={version.id === selected?.id ? 'true' : undefined}
                      >
                        <span>v{version.version}</span>
                        <span>{index === 0 ? 'Latest' : (version.settings.simulation ?? '')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {selected && (
                <Button
                  className={css.destructive}
                  variant="plain"
                  onClick={() => setConfirming('version')}
                >
                  Delete v{selected.version}
                </Button>
              )}
            </Panel>
          </div>
        </div>
      </SignInGate>

      <ConfirmDialog
        open={confirming === 'recipe'}
        onOpenChange={open => setConfirming(open ? 'recipe' : null)}
        title="Delete this recipe?"
        actions={[
          {
            label: 'Delete',
            primary: true,
            onSelect: () =>
              run(
                () => removeRecipe(recipe.id).then(() => navigate('/recipes', { replace: true })),
                MESSAGES.deleteFailed,
              ),
          },
        ]}
      >
        Use this for a recipe entered by mistake. If you only stopped using it, set its state to
        Archived so it stays in your record. Deleting removes every version and cannot be undone.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirming === 'version'}
        onOpenChange={open => setConfirming(open ? 'version' : null)}
        title={`Delete v${selected?.version}?`}
        actions={[
          {
            label: 'Delete',
            primary: true,
            onSelect: () =>
              selected &&
              run(
                () =>
                  removeVersion(recipe, versions, selected)
                    .then(reload)
                    .then(() => navigate(`/recipes/${recipe.id}`, { replace: true })),
                MESSAGES.deleteFailed,
              ),
          },
        ]}
      >
        The other versions stay as they are. Deleting a version cannot be undone.
      </ConfirmDialog>
    </PageShell>
  );
};
