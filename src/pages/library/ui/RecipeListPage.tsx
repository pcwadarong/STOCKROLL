import { useState } from 'react';
import { useSearchParams } from 'react-router';

import {
  latestVersion,
  MAX_VERSIONS,
  RECIPE_ORDER,
  RECIPE_STATES,
  recipeCollection,
  recipeFields,
  recipeNote,
  recipeVersionCollection,
  systemOf,
  SYSTEMS,
} from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
import { activePicks, type ListFilter, listFilter } from '@/shared/lib/pick-filter';
import { useCollectionPage } from '@/shared/lib/use-collection-page';
import { useDebounced } from '@/shared/lib/use-debounced';
import { useRelated } from '@/shared/lib/use-related';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { formatCount, MetaList } from '@/shared/ui/MetaList';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';

import { LIST_STEP, SEARCH_DELAY_MS } from '../model/list-steps';
import { useRecipePhotos } from '../model/use-recipe-photos';

import { ItemList, ListFilters, ListMore } from './LibraryList';
import { RecipeGallery } from './RecipeGallery';
import { RecipeTabs } from './RecipeTabs';

import * as css from './LibraryPage.css';

const FILTERS: readonly ListFilter[] = [
  listFilter(
    'system',
    'System',
    Object.entries(SYSTEMS).map(([value, { label }]) => ({ value, label })),
  ),
  listFilter('state', 'State', RECIPE_STATES),
];

const LIST_ID = 'recipe-list';

// Versions are read for the recipes on screen, this many recipes per request. A recipe keeps at
// most `MAX_VERSIONS`, and the API cuts an answer off at 1,000 rows without saying so.
const VERSION_CHUNK = Math.floor(1000 / MAX_VERSIONS);

/**
 * Recipe library: every recipe at a glance, narrowed by search, system, state or favorite.
 * `?view=photos` shows the same recipes by their example photos instead of as lines.
 */
export const RecipeListPage = () => {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const list = useCollectionPage(recipeCollection, {
    filters: activePicks(picks),
    search: useDebounced(query, SEARCH_DELAY_MS),
    order: RECIPE_ORDER,
    step: LIST_STEP,
    tallies: { inCamera: { state: 'active' } },
  });
  const recipes = list.rows;
  const versions = useRelated(
    recipeVersionCollection,
    'recipeId',
    recipes.map(recipe => recipe.id),
    VERSION_CHUNK,
  );
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const byPhoto = params.get('view') === 'photos';
  const photoOf = useRecipePhotos(byPhoto ? recipes : []);
  // Kept in the URL, so coming back from a recipe returns to the same view.
  const show = (view: 'list' | 'photos') =>
    setParams(view === 'photos' ? { view } : {}, { replace: true });

  const registered = list.counts.total ?? 0;
  const failed = list.status === 'error' || versions.failed;

  const toggleFavorite = (id: string) => {
    const recipe = recipes.find(candidate => candidate.id === id);
    if (!recipe) return;
    setError('');
    // The photo path is never part of this write (`recipeFields`).
    list
      .save(recipeFields({ ...recipe, isFavorite: !recipe.isFavorite }))
      .catch(() => setError(MESSAGES.saveFailed));
  };

  return (
    <PageShell title="Recipes">
      <PageHeader title="Recipes" lead="Camera settings you shoot with, kept per camera system." />

      <SignInGate what="recipes">
        <RecipeTabs />

        <Panel
          title="All recipes"
          action={
            <div className={css.toolbar}>
              {/* The same form as a new recipe: its paste box is the first thing on it. */}
              <Button size="small" to="/recipes/new">
                Paste a recipe
              </Button>
              <Button variant="primary" size="small" to="/recipes/new">
                + New recipe
              </Button>
            </div>
          }
        >
          {failed && <ErrorText>{MESSAGES.loadFailed}</ErrorText>}
          {error && <ErrorText>{error}</ErrorText>}

          {list.status === 'ready' && (
            <MetaList
              rows={[
                { label: 'Registered', value: formatCount(registered) },
                { label: 'In the camera', value: formatCount(list.counts.inCamera ?? 0) },
              ]}
            />
          )}

          {list.status === 'ready' && registered === 0 && (
            <EmptyState title="No recipe registered">
              Start a new recipe for any camera, or paste one as text. Your recipes are visible only
              to you.
            </EmptyState>
          )}

          {registered > 0 && (
            <>
              <ListFilters
                filters={FILTERS}
                picks={picks}
                onPick={(key, value) => setPicks(previous => ({ ...previous, [key]: value }))}
                search={{ label: 'Search recipes', value: query, onChange: setQuery }}
              />

              <div className={css.toolbar}>
                <Button size="small" pressed={!byPhoto} onClick={() => show('list')}>
                  List
                </Button>
                <Button size="small" pressed={byPhoto} onClick={() => show('photos')}>
                  Photos
                </Button>
              </div>

              {list.status === 'ready' && list.total === 0 && (
                <EmptyState title="Nothing here">No recipe matches this view.</EmptyState>
              )}

              {recipes.length > 0 && byPhoto && (
                <RecipeGallery
                  id={LIST_ID}
                  layout="photos"
                  to={id => `/recipes/${id}`}
                  items={recipes.map(recipe => ({
                    id: recipe.id,
                    title: recipe.name,
                    sub: recipe.baseSimulation ?? SYSTEMS[systemOf(recipe)].label,
                    photoUrl: photoOf(recipe),
                    badge: latestVersion(versions.records, recipe.id)?.settings.customSlot,
                  }))}
                />
              )}

              {recipes.length > 0 && !byPhoto && (
                <ItemList
                  id={LIST_ID}
                  rows={recipes.map(recipe => {
                    const version = latestVersion(versions.records, recipe.id);
                    return {
                      id: recipe.id,
                      to: `/recipes/${recipe.id}`,
                      title: recipe.name,
                      facts: [
                        version?.settings.customSlot,
                        SYSTEMS[systemOf(recipe)].label,
                        recipe.baseSimulation,
                        // Until the versions arrive, a recipe is not said to have none.
                        version ? `v${version.version}` : versions.ready && 'no settings yet',
                      ],
                      note: recipeNote(recipe),
                      favorite: recipe.isFavorite,
                    };
                  })}
                  onToggleFavorite={toggleFavorite}
                />
              )}

              {list.moreFailed && <ErrorText>{MESSAGES.loadFailed}</ErrorText>}
              <ListMore
                listId={LIST_ID}
                shown={recipes.length}
                total={list.total}
                step={list.step}
                loading={list.loadingMore}
                busy={list.settling}
                onMore={() => void list.more()}
              />
            </>
          )}
        </Panel>
      </SignInGate>
    </PageShell>
  );
};
