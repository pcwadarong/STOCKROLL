import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import {
  foldVersions,
  MAX_VERSIONS,
  RECIPE_FIELDS,
  systemOf,
  SYSTEMS,
  VERSIONS_SHOWN,
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
import { copyRecipeText, shareRecipeCard } from '../model/share-recipe';
import { useRecipeLibrary } from '../model/use-recipe-library';

import { ActionList } from './ActionList';
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
 * One recipe, read-only: its photo and settings as one sheet on the left; versions, the ways to
 * change it and the ways to share it as quiet lists on the right. What to do with a version — fix
 * it, build the next one from it, or branch into a new recipe — is chosen here, before any
 * editing starts.
 */
export const RecipeDetailPage = () => {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { recipes, versions, ready, saveRecipe, removeRecipe, reload } = useRecipeLibrary();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [allVersions, setAllVersions] = useState(false);
  const [confirming, setConfirming] = useState<'recipe' | 'version' | null>(null);

  const recipe = recipes.find(item => item.id === id);
  const history = recipe ? versionsOf(versions, recipe.id) : [];
  // The version in the URL when it exists, otherwise the newest.
  const selected = history.find(item => String(item.version) === params.get('v')) ?? history[0];
  const slots = versionSlots(history.length);
  const listed = foldVersions(history, selected?.id, allVersions);

  const run = (action: () => Promise<unknown>, failure: string) => {
    setError('');
    setNotice('');
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
  const next = (history[0]?.version ?? 0) + 1;

  const editing = selected
    ? [
        {
          label: `Correct v${selected.version}`,
          hint: 'Fix a value that was entered wrong.',
          to: edit('correct'),
        },
        {
          label: 'New version',
          hint: slots.full
            ? `All ${MAX_VERSIONS} version slots are used.`
            : `Keeps v${selected.version} and saves your changes as v${next}.`,
          to: edit('version'),
          disabled: slots.full,
        },
        {
          label: 'Copy to a new recipe',
          hint: 'Starts a separate recipe from these settings.',
          to: `/recipes/new?from=${recipe.id}&v=${selected.version}`,
        },
      ]
    : [
        {
          label: 'Add settings',
          hint: 'This recipe is known by name only so far.',
          to: edit('version'),
        },
      ];

  const sharing = selected
    ? [
        {
          label: 'Copy as text',
          hint: 'Name and settings, ready to paste into a message.',
          onSelect: () =>
            run(
              () => copyRecipeText(recipe, selected.settings).then(() => setNotice('Copied.')),
              'Could not copy. Your browser did not allow access to the clipboard.',
            ),
        },
        {
          label: 'Save as image',
          hint: 'A card with the photo and the settings.',
          onSelect: () =>
            run(
              () =>
                shareRecipeCard(recipe, selected.settings, `v${selected.version}`).then(outcome =>
                  // A download is only handed over: the browser does not say whether it was kept.
                  setNotice(outcome === 'downloaded' ? "Sent to your browser's downloads." : ''),
                ),
              'Could not make the image. Try again.',
            ),
        },
      ]
    : [];

  return (
    <PageShell wide>
      <PageHeader
        title={recipe.name}
        lead={[SYSTEMS[system].label, STATE_LABELS[recipe.state], recipe.note]
          .filter(Boolean)
          .join(' · ')}
      />

      <SignInGate what="recipes">
        {error && <ErrorText>{error}</ErrorText>}

        <div className={css.columns}>
          <Panel
            title={selected ? `Settings — v${selected.version}` : 'Settings'}
            action={
              <button
                type="button"
                className={css.headingStar}
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
            }
          >
            <RecipePhoto recipe={recipe} onChanged={reload} />
            {selected ? (
              <SettingsView system={system} settings={selected.settings} />
            ) : (
              <EmptyState title="No settings yet">
                This recipe is known by name only. Add its settings when you have them.
              </EmptyState>
            )}
          </Panel>

          <div className={css.stack}>
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

              {history.length > 0 ? (
                <ul className={css.versionList}>
                  {listed.shown.map(version => (
                    <li key={version.id}>
                      <Link
                        to={`/recipes/${recipe.id}?v=${version.version}`}
                        replace
                        className={css.versionItem}
                        aria-current={version.id === selected?.id ? 'true' : undefined}
                      >
                        <span>v{version.version}</span>
                        <span>
                          {version.id === history[0]?.id
                            ? 'Latest'
                            : (version.settings.simulation ?? '')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={css.note}>No version yet.</p>
              )}
              {(listed.hidden > 0 || (allVersions && history.length > VERSIONS_SHOWN)) && (
                <Button
                  variant="plain"
                  aria-expanded={allVersions}
                  onClick={() => setAllVersions(open => !open)}
                >
                  {allVersions ? 'Show fewer' : `Show ${listed.hidden} older`}
                </Button>
              )}
            </Panel>

            <Panel title="Change">
              <ActionList
                items={[
                  ...editing,
                  {
                    label: 'Name and state',
                    hint: 'Applies to every version.',
                    to: `/recipes/${recipe.id}/edit?mode=details`,
                  },
                  ...(selected
                    ? [
                        {
                          label: `Delete v${selected.version}`,
                          hint: 'The other versions stay.',
                          tone: 'danger' as const,
                          onSelect: () => setConfirming('version'),
                        },
                      ]
                    : []),
                  {
                    label: 'Delete recipe',
                    hint: 'For a recipe entered by mistake.',
                    tone: 'danger' as const,
                    onSelect: () => setConfirming('recipe'),
                  },
                ]}
              />
            </Panel>

            {sharing.length > 0 && (
              <Panel title="Share">
                <ActionList items={sharing} />
                {/* Announced, because nothing else on screen changes after a copy. */}
                <p className={css.note} role="status">
                  {notice}
                </p>
              </Panel>
            )}
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
