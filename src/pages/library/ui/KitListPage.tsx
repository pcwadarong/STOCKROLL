import { useState } from 'react';

import {
  filledSlots,
  KIT_ORDER,
  KIT_SLOTS,
  kitCollection,
  liveSlots,
  recipeCollection,
  recipeIdsOf,
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
import { NoteText } from '@/shared/ui/NoteText';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';

import { KIT_STEP, SEARCH_DELAY_MS } from '../model/list-steps';
import { useRecipePhotos } from '../model/use-recipe-photos';

import { KitStrip, slotContents } from './KitStrip';
import { ListMore, ListSearch } from './LibraryList';
import { RecipeTabs } from './RecipeTabs';

import * as css from './RecipeGallery.css';

const LIST_ID = 'kit-list';

/** Recipes read per request when filling in the kits on screen. */
const RECIPE_CHUNK = 100;

/**
 * Kits: named sets of recipes laid out over the camera's slots, each shown as a strip. A search
 * finds a kit by its name or its note.
 */
export const KitListPage = () => {
  const [query, setQuery] = useState('');
  const list = useCollectionPage(kitCollection, {
    search: useDebounced(query, SEARCH_DELAY_MS),
    order: KIT_ORDER,
    step: KIT_STEP,
  });
  const kits = list.rows;
  // Only the recipes the kits on screen point at.
  const recipes = useRelated(
    recipeCollection,
    'id',
    kits.flatMap(kit => recipeIdsOf(kit.slots)),
    RECIPE_CHUNK,
  );
  const photoOf = useRecipePhotos(recipes.records);

  const registered = list.counts.total ?? 0;
  const recipeIds = new Set(recipes.records.map(recipe => recipe.id));

  return (
    <PageShell wide>
      <PageHeader
        title="Kits"
        lead="Recipes for C1–C7 and film simulations for the FS dial, planned here and set on the camera by hand."
      />

      <SignInGate what="kits">
        <RecipeTabs />

        <Panel
          title="All kits"
          action={
            <Button variant="primary" size="small" to="/recipes/kits/new">
              + New kit
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
            <EmptyState title="No kit yet">
              A kit gathers the recipes you want in the camera together, one per slot, under a name
              of your own.
            </EmptyState>
          )}

          {registered > 0 && (
            <>
              <ListSearch label="Search kits" value={query} onChange={setQuery} />

              {list.status === 'ready' && list.total === 0 && (
                <EmptyState title="Nothing here">No kit matches this search.</EmptyState>
              )}

              {/* Drawn once the recipes are known: until then a filled slot would read as empty. */}
              {kits.length > 0 && recipes.ready && (
                <ul id={LIST_ID} className={css.kits}>
                  {kits.map(kit => {
                    const slots = liveSlots(kit.slots, recipeIds);
                    return (
                      <li key={kit.id} className={css.kit}>
                        <div className={css.kitHeader}>
                          <h3 className={css.kitName}>{kit.name}</h3>
                          <span className={css.kitCount}>
                            {filledSlots(slots)} / {KIT_SLOTS.length}
                          </span>
                          <Button
                            size="small"
                            to={`/recipes/kits/${kit.id}/edit`}
                            aria-label={`Edit ${kit.name}`}
                          >
                            Edit
                          </Button>
                        </div>
                        {kit.note && <NoteText>{kit.note}</NoteText>}
                        <KitStrip contents={slotContents(slots, recipes.records, photoOf)} />
                      </li>
                    );
                  })}
                </ul>
              )}

              {list.moreFailed && <ErrorText>{MESSAGES.loadFailed}</ErrorText>}
              <ListMore
                listId={LIST_ID}
                shown={recipes.ready ? kits.length : 0}
                total={list.total}
                step={list.step}
                loading={list.loadingMore || (kits.length > 0 && !recipes.ready)}
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
