import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import { MarkFields } from '@/entities/mark';
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
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/ActionMenu';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { NoteText } from '@/shared/ui/NoteText';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';

import { removeVersion } from '../model/recipe-actions';
import { copyRecipeText, shareRecipeCard } from '../model/share-recipe';
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
 * One recipe, read-only: its photo and settings as one sheet. Three menus at the top right hold
 * everything else — which version is shown, the ways to change the recipe, and the ways to share
 * it. What to do with a version — fix it, build the next one from it, or branch into a new
 * recipe — is chosen there, before any editing starts.
 */
export const RecipeDetailPage = () => {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { recipes, versions, ready, saveRecipe, removeRecipe, reload } = useRecipeLibrary();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState<'recipe' | 'version' | null>(null);

  const recipe = recipes.find(item => item.id === id);
  const history = recipe ? versionsOf(versions, recipe.id) : [];
  // The version in the URL when it exists, otherwise the newest.
  const selected = history.find(item => String(item.version) === params.get('v')) ?? history[0];
  const slots = versionSlots(history.length);

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

  const versionItems: ActionMenuItem[] = history.map(version => ({
    label: `v${version.version}`,
    hint: version.id === history[0]?.id ? 'Latest' : (version.settings.simulation ?? undefined),
    to: `/recipes/${recipe.id}?v=${version.version}`,
    // Switching versions stays on this screen, so Back should leave it in one step.
    replace: true,
    current: version.id === selected?.id,
  }));

  const changeItems: ActionMenuItem[] = [
    ...(selected
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
              : `Keeps v${selected.version}, saves your changes as v${next}.`,
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
        ]),
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
  ];

  const shareItems: ActionMenuItem[] = selected
    ? [
        {
          label: 'Copy as text',
          hint: 'Name and settings, ready to paste.',
          onSelect: () =>
            run(
              () => copyRecipeText(recipe, selected.settings).then(() => setNotice('Copied.')),
              'Could not copy. Your browser did not allow access to the clipboard.',
            ),
        },
        {
          label: 'Save as image',
          hint: 'A card with the photo, the settings and your own text.',
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
      <div className={css.detailHeader}>
        <PageHeader
          title={recipe.name}
          lead={[SYSTEMS[system].label, STATE_LABELS[recipe.state]].filter(Boolean).join(' · ')}
        />
        <div className={css.toolbar}>
          {versionItems.length > 0 && (
            <ActionMenu
              label={`Version v${selected?.version}`}
              variant="green"
              heading={`${slots.used} / ${MAX_VERSIONS} used${slots.low ? ` · ${slots.left} left` : ''}`}
              items={versionItems}
            />
          )}
          <ActionMenu label="Change" variant="primary" items={changeItems} />
          {shareItems.length > 0 && (
            <ActionMenu label="Share" variant="primary" items={shareItems} />
          )}
        </div>
      </div>

      <SignInGate what="recipes">
        {error && <ErrorText>{error}</ErrorText>}
        {/* Announced, because nothing else on screen changes after a copy. */}
        <p className={css.note} role="status">
          {notice}
        </p>

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
          {recipe.note && <NoteText>{recipe.note}</NoteText>}
          {selected ? (
            <SettingsView system={system} settings={selected.settings} />
          ) : (
            <EmptyState title="No settings yet">
              This recipe is known by name only. Add its settings from Change.
            </EmptyState>
          )}
        </Panel>

        {/* The same text the frame editor uses, drawn on the card that "Save as image" makes. */}
        {selected && (
          <Panel title="Text on the image">
            <MarkFields dated={false} />
          </Panel>
        )}
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
