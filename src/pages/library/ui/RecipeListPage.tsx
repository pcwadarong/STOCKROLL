import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { latestVersion, RECIPE_STATES, recipeNote, systemOf, SYSTEMS } from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
import { type ListFilter, listFilter, matchesPicks } from '@/shared/lib/pick-filter';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { formatCount, MetaList } from '@/shared/ui/MetaList';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';

import { useRecipeLibrary } from '../model/use-recipe-library';
import { useRecipePhotos } from '../model/use-recipe-photos';

import { ItemList, ListFilters } from './LibraryList';
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

/**
 * Recipe library: every recipe at a glance, narrowed by favorite or state. `?view=photos` shows
 * the same recipes by their example photos instead of as lines.
 */
export const RecipeListPage = () => {
  const { recipes, versions, ready, failed, saveRecipe } = useRecipeLibrary();
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const byPhoto = params.get('view') === 'photos';
  const photoOf = useRecipePhotos(byPhoto ? recipes : []);
  // Kept in the URL, so coming back from a recipe returns to the same view.
  const show = (view: 'list' | 'photos') =>
    setParams(view === 'photos' ? { view } : {}, { replace: true });

  // Records saved before systems existed carry none; they are read as their effective system.
  const shown = recipes.filter(recipe =>
    matchesPicks({ ...recipe, system: systemOf(recipe) }, picks),
  );

  const toggleFavorite = (id: string) => {
    const recipe = recipes.find(candidate => candidate.id === id);
    if (!recipe) return;
    setError('');
    saveRecipe({ ...recipe, isFavorite: !recipe.isFavorite }).catch(() =>
      setError(MESSAGES.saveFailed),
    );
  };

  return (
    <PageShell>
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

          {ready && (
            <MetaList
              rows={[
                { label: 'Registered', value: formatCount(recipes.length) },
                {
                  label: 'In the camera',
                  value: formatCount(recipes.filter(recipe => recipe.state === 'active').length),
                },
              ]}
            />
          )}

          {ready && recipes.length === 0 && (
            <EmptyState title="No recipe registered">
              Start a new recipe for any camera, or paste one as text. Your recipes are visible only
              to you.
            </EmptyState>
          )}

          {recipes.length > 0 && (
            <>
              <ListFilters
                filters={FILTERS}
                picks={picks}
                onPick={(key, value) => setPicks(previous => ({ ...previous, [key]: value }))}
              />

              <div className={css.toolbar}>
                <Button size="small" pressed={!byPhoto} onClick={() => show('list')}>
                  List
                </Button>
                <Button size="small" pressed={byPhoto} onClick={() => show('photos')}>
                  Photos
                </Button>
              </div>

              {shown.length === 0 && (
                <EmptyState title="Nothing here">No recipe matches this view.</EmptyState>
              )}

              {shown.length > 0 && byPhoto && (
                <RecipeGallery
                  layout="photos"
                  to={id => `/recipes/${id}`}
                  items={shown.map(recipe => ({
                    id: recipe.id,
                    title: recipe.name,
                    sub: recipe.baseSimulation ?? SYSTEMS[systemOf(recipe)].label,
                    photoUrl: photoOf(recipe),
                    badge: latestVersion(versions, recipe.id)?.settings.customSlot,
                  }))}
                />
              )}

              {shown.length > 0 && !byPhoto && (
                <ItemList
                  rows={shown.map(recipe => {
                    const version = latestVersion(versions, recipe.id);
                    return {
                      id: recipe.id,
                      to: `/recipes/${recipe.id}`,
                      title: recipe.name,
                      facts: [
                        version?.settings.customSlot,
                        SYSTEMS[systemOf(recipe)].label,
                        recipe.baseSimulation,
                        version ? `v${version.version}` : 'no settings yet',
                      ],
                      note: recipeNote(recipe),
                      favorite: recipe.isFavorite,
                    };
                  })}
                  onToggleFavorite={toggleFavorite}
                />
              )}
            </>
          )}
        </Panel>
      </SignInGate>
    </PageShell>
  );
};
