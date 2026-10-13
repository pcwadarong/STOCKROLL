import { useState } from 'react';
import { Link } from 'react-router';

import {
  filledSlots,
  liveSlots,
  recipeCollection,
  recipeIdsOf,
  ROLL_ORDER,
  ROLL_SLOTS,
  rollCollection,
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

import { ROLL_STEP, SEARCH_DELAY_MS } from '../model/list-steps';
import { useRecipePhotos } from '../model/use-recipe-photos';

import { ListMore, ListSearch } from './LibraryList';
import { RecipeTabs } from './RecipeTabs';
import { RollStrip, slotContents } from './RollStrip';

import * as css from './RollStrip.css';

const LIST_ID = 'roll-list';

/** Recipes read per request when filling in the rolls on screen. */
const RECIPE_CHUNK = 100;

/**
 * Rolls: named sets of recipes laid out over the camera's slots. Each is one line — its name
 * over a strip of film — and leads to the roll's own screen. A search finds a roll by its name
 * or its note.
 */
export const RollListPage = () => {
  const [query, setQuery] = useState('');
  const list = useCollectionPage(rollCollection, {
    search: useDebounced(query, SEARCH_DELAY_MS),
    order: ROLL_ORDER,
    step: ROLL_STEP,
  });
  const rolls = list.rows;
  // Only the recipes the rolls on screen point at.
  const recipes = useRelated(
    recipeCollection,
    'id',
    rolls.flatMap(roll => recipeIdsOf(roll.slots)),
    RECIPE_CHUNK,
  );
  const photoOf = useRecipePhotos(recipes.records);

  const registered = list.counts.total ?? 0;
  const recipeIds = new Set(recipes.records.map(recipe => recipe.id));

  return (
    <PageShell wide>
      <PageHeader
        title="Rolls"
        lead="Recipes for C1–C7 and film simulations for the FS dial, planned here and set on the camera by hand."
      />

      <SignInGate what="rolls">
        <RecipeTabs />

        <Panel
          title="All rolls"
          action={
            <Button variant="primary" size="small" to="/recipes/rolls/new">
              + New roll
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
            <EmptyState title="No roll yet">
              A roll gathers the recipes you want in the camera together, one per slot, under a name
              of your own.
            </EmptyState>
          )}

          {registered > 0 && (
            <>
              <ListSearch label="Search rolls" value={query} onChange={setQuery} />

              {list.status === 'ready' && list.total === 0 && (
                <EmptyState title="Nothing here">No roll matches this search.</EmptyState>
              )}

              {/* Drawn once the recipes are known: until then a filled slot would read as empty. */}
              {rolls.length > 0 && recipes.ready && (
                <ul id={LIST_ID} className={css.rolls}>
                  {rolls.map(roll => {
                    const slots = liveSlots(roll.slots, recipeIds);
                    return (
                      <li key={roll.id}>
                        <Link to={`/recipes/rolls/${roll.id}`} className={css.roll}>
                          <span className={css.rollHeader}>
                            <span className={css.rollName}>{roll.name}</span>
                            <span className={css.rollCount}>
                              {filledSlots(slots)} / {ROLL_SLOTS.length}
                            </span>
                          </span>
                          <RollStrip contents={slotContents(slots, recipes.records, photoOf)} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              {list.moreFailed && <ErrorText>{MESSAGES.loadFailed}</ErrorText>}
              <ListMore
                listId={LIST_ID}
                shown={recipes.ready ? rolls.length : 0}
                total={list.total}
                step={list.step}
                loading={list.loadingMore || (rolls.length > 0 && !recipes.ready)}
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
