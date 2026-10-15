import { useState } from 'react';
import { Link } from 'react-router';

import {
  filledSlots,
  liveSlots,
  recipeCollection,
  recipeIdsOf,
  STRIP_ORDER,
  STRIP_SLOTS,
  stripCollection,
} from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
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

import { SEARCH_DELAY_MS, STRIP_STEP } from '../model/list-steps';
import { useRecipePhotos } from '../model/use-recipe-photos';

import { FilmStrip, slotContents } from './FilmStrip';
import { ListMore, ListSearch } from './LibraryList';
import { RecipeTabs } from './RecipeTabs';

import * as css from './FilmStrip.css';

const LIST_ID = 'strip-list';

/** Recipes read per request when filling in the strips on screen. */
const RECIPE_CHUNK = 100;

/**
 * Strips: named sets of recipes laid out over the camera's slots. Each is one line — its name
 * over its frames, drawn as film — and leads to the strip's own screen. A search finds a strip by its name
 * or its note.
 */
export const StripListPage = () => {
  const [query, setQuery] = useState('');
  const list = useCollectionPage(stripCollection, {
    search: useDebounced(query, SEARCH_DELAY_MS),
    order: STRIP_ORDER,
    step: STRIP_STEP,
  });
  const strips = list.rows;
  // Only the recipes the strips on screen point at.
  const recipes = useRelated(
    recipeCollection,
    'id',
    strips.flatMap(strip => recipeIdsOf(strip.slots)),
    RECIPE_CHUNK,
  );
  const photoOf = useRecipePhotos(recipes.records);

  const registered = list.counts.total ?? 0;
  const recipeIds = new Set(recipes.records.map(recipe => recipe.id));

  return (
    <PageShell wide title="Recipes">
      <PageHeader
        title="Strips"
        lead="Recipes for C1–C7 and film simulations for the FS dial, planned here and set on the camera by hand."
      />

      <SignInGate what="strips">
        <RecipeTabs />

        <Panel
          title="All strips"
          action={
            <Button variant="primary" size="small" to="/recipes/strips/new">
              + New strip
            </Button>
          }
        >
          {(list.status === 'error' || recipes.failed) && (
            <ErrorText>{MESSAGES.loadFailed}</ErrorText>
          )}

          {list.status === 'ready' && (
            <MetaList rows={[{ label: 'Registered', value: formatCount(registered) }]} />
          )}

          {list.status === 'ready' && registered === 0 && (
            <EmptyState title="No strip yet">
              A strip gathers the recipes you want in the camera together, one per slot, under a
              name of your own.
            </EmptyState>
          )}

          {registered > 0 && (
            <>
              <ListSearch label="Search strips" value={query} onChange={setQuery} />

              {list.status === 'ready' && list.total === 0 && (
                <EmptyState title="Nothing here">No strip matches this search.</EmptyState>
              )}

              {/* Drawn once the recipes are known: until then a filled slot would read as empty. */}
              {strips.length > 0 && recipes.ready && (
                <ul id={LIST_ID} className={css.strips}>
                  {strips.map(strip => {
                    const slots = liveSlots(strip.slots, recipeIds);
                    return (
                      <li key={strip.id}>
                        <Link to={`/recipes/strips/${strip.id}`} className={css.stripLink}>
                          <span className={css.stripHeader}>
                            <span className={css.stripName}>{strip.name}</span>
                            <span className={css.stripCount}>
                              {filledSlots(slots)} / {STRIP_SLOTS.length}
                            </span>
                          </span>
                          <FilmStrip contents={slotContents(slots, recipes.records, photoOf)} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              {list.moreFailed && <ErrorText>{MESSAGES.loadFailed}</ErrorText>}
              <ListMore
                listId={LIST_ID}
                shown={recipes.ready ? strips.length : 0}
                total={list.total}
                step={list.step}
                loading={list.loadingMore || (strips.length > 0 && !recipes.ready)}
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
