import { Link } from 'react-router';

import { filledSlots, liveSlots, ROLL_SLOTS, rollCollection } from '@/entities/recipe';
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

import { RecipeTabs } from './RecipeTabs';
import { RollStrip, slotContents } from './RollStrip';

import * as css from './RollStrip.css';

/**
 * Rolls: named sets of recipes laid out over the camera's slots. Each is one line — its name
 * over a strip of film — and leads to the roll's own screen.
 */
export const RollListPage = () => {
  const { recipes, ready: recipesReady, failed: recipesFailed } = useRecipeLibrary();
  const rolls = useCollection(rollCollection);
  const photoOf = useRecipePhotos(recipes);

  const ready = recipesReady && rolls.status === 'ready';
  const recipeIds = new Set(recipes.map(recipe => recipe.id));

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
          {(recipesFailed || rolls.status === 'error') && (
            <ErrorText>{MESSAGES.loadFailed}</ErrorText>
          )}

          {ready && (
            <MetaList rows={[{ label: 'Registered', value: formatCount(rolls.items.length) }]} />
          )}

          {ready && rolls.items.length === 0 && (
            <EmptyState title="No roll yet">
              A roll gathers the recipes you want in the camera together, one per slot, under a name
              of your own.
            </EmptyState>
          )}

          {ready && rolls.items.length > 0 && (
            <ul className={css.rolls}>
              {rolls.items.map(roll => {
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
                      <RollStrip contents={slotContents(slots, recipes, photoOf)} />
                    </Link>
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
