import { useState } from 'react';
import { Link } from 'react-router';

import {
  filterRecipes,
  latestVersion,
  type Recipe,
  type RecipeFilter,
  systemOf,
  SYSTEMS,
} from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FilterChips } from '@/shared/ui/FilterChips';
import { labelText } from '@/shared/ui/label.css';
import { formatCount, MetaList } from '@/shared/ui/MetaList';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';

import { useRecipeLibrary } from '../model/use-recipe-library';

import * as css from './LibraryPage.css';

const FILTERS: readonly { value: RecipeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'favorite', label: 'Favorites' },
  { value: 'active', label: 'In the camera' },
  { value: 'candidate', label: 'Candidates' },
  { value: 'archived', label: 'Archived' },
];

/** Recipe library: every recipe at a glance, narrowed by favorite or state. */
export const RecipeListPage = () => {
  const { recipes, versions, ready, failed, saveRecipe } = useRecipeLibrary();
  const [filter, setFilter] = useState<RecipeFilter>('all');
  const [error, setError] = useState('');

  const shown = filterRecipes(recipes, filter);

  const toggleFavorite = (recipe: Recipe) => {
    setError('');
    saveRecipe({ ...recipe, isFavorite: !recipe.isFavorite }).catch(() =>
      setError(MESSAGES.saveFailed),
    );
  };

  return (
    <PageShell>
      <PageHeader title="Recipes" lead="Camera settings you shoot with, kept per camera system." />

      <SignInGate what="recipes">
        <Panel
          title="All recipes"
          action={
            <Button variant="primary" size="small" to="/recipes/new">
              + New recipe
            </Button>
          }
        >
          {failed && <ErrorText>{MESSAGES.loadFailed}</ErrorText>}
          {error && <ErrorText>{error}</ErrorText>}

          {ready && (
            <MetaList
              rows={[
                { label: 'Status', value: recipes.length === 0 ? 'Empty' : 'Ready' },
                { label: 'Registered', value: formatCount(recipes.length) },
                {
                  label: 'In the camera',
                  value: formatCount(filterRecipes(recipes, 'active').length),
                },
                {
                  label: 'Favorites',
                  value: formatCount(filterRecipes(recipes, 'favorite').length),
                },
              ]}
            />
          )}

          {ready && recipes.length === 0 && (
            <EmptyState title="No recipe registered">
              Start a new recipe for any camera. Your recipes are visible only to you.
            </EmptyState>
          )}

          {recipes.length > 0 && (
            <>
              <FilterChips label="Show" options={FILTERS} value={filter} onChange={setFilter} />

              {shown.length === 0 && (
                <EmptyState title="Nothing here">No recipe matches this view.</EmptyState>
              )}

              <ul className={css.list}>
                {shown.map(recipe => {
                  const version = latestVersion(versions, recipe.id);
                  const summary = [
                    version?.settings.customSlot,
                    SYSTEMS[systemOf(recipe)].label,
                    recipe.baseSimulation,
                    version ? `v${version.version}` : 'no settings yet',
                  ];
                  return (
                    <li key={recipe.id} className={css.rowWithAction}>
                      <button
                        type="button"
                        className={css.star}
                        aria-pressed={recipe.isFavorite}
                        aria-label={`Favorite ${recipe.name}`}
                        onClick={() => toggleFavorite(recipe)}
                      >
                        {recipe.isFavorite ? '★' : '☆'}
                      </button>
                      <Link to={`/recipes/${recipe.id}`} className={css.rowLink}>
                        <span className={css.rowTitle}>{recipe.name}</span>
                        <span className={labelText}>{summary.filter(Boolean).join(' · ')}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Panel>
      </SignInGate>
    </PageShell>
  );
};
