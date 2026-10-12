import { filledSlots, KIT_SLOTS, kitCollection, liveSlots } from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
import { useCollection } from '@/shared/lib/use-collection';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { formatCount, MetaList } from '@/shared/ui/MetaList';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';

import { useRecipeLibrary } from '../model/use-recipe-library';
import { useRecipePhotos } from '../model/use-recipe-photos';

import { KitStrip, slotContents } from './KitStrip';
import { RecipeTabs } from './RecipeTabs';

import * as css from './RecipeGallery.css';

/** Kits: named sets of recipes laid out over the camera's slots, each shown as a strip. */
export const KitListPage = () => {
  const { recipes, ready: recipesReady, failed: recipesFailed } = useRecipeLibrary();
  const kits = useCollection(kitCollection);
  const photoOf = useRecipePhotos(recipes);

  const ready = recipesReady && kits.status === 'ready';
  const recipeIds = new Set(recipes.map(recipe => recipe.id));

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
          {(recipesFailed || kits.status === 'error') && (
            <ErrorText>{MESSAGES.loadFailed}</ErrorText>
          )}

          {ready && (
            <MetaList rows={[{ label: 'Registered', value: formatCount(kits.items.length) }]} />
          )}

          {ready && kits.items.length === 0 && (
            <EmptyState title="No kit yet">
              A kit gathers the recipes you want in the camera together, one per slot, under a name
              of your own.
            </EmptyState>
          )}

          {ready && kits.items.length > 0 && (
            <ul className={css.kits}>
              {kits.items.map(kit => {
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
                    <KitStrip contents={slotContents(slots, recipes, photoOf)} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </SignInGate>
    </PageShell>
  );
};
