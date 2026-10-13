import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import {
  filledSlots,
  liveSlots,
  RECIPE_SLOTS,
  ROLL_SLOTS,
  rollCollection,
  SIMULATION_SLOTS,
} from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
import { useCollection } from '@/shared/lib/use-collection';
import { ActionMenu } from '@/shared/ui/ActionMenu';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { MetaList } from '@/shared/ui/MetaList';
import { NoteText } from '@/shared/ui/NoteText';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';

import { useRecipeLibrary } from '../model/use-recipe-library';
import { useRecipePhotos } from '../model/use-recipe-photos';

import { slotContents } from './RollStrip';

import * as page from './LibraryPage.css';
import * as css from './RecipeGallery.css';

/**
 * One roll, read-only (`/recipes/rolls/:id`): the recipes in C1–C7 at full size, each leading to
 * its recipe, and the film simulations on the dial. Changing the roll, copying it into a new one
 * and deleting it are chosen from the menu, before any editing starts.
 */
export const RollDetailPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { recipes, ready: recipesReady } = useRecipeLibrary();
  const rolls = useCollection(rollCollection);
  const photoOf = useRecipePhotos(recipes);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const ready = recipesReady && rolls.status === 'ready';
  const roll = rolls.items.find(item => item.id === id);

  if (!ready || !roll)
    return (
      <PageShell wide>
        <PageHeader title="Roll" />
        <SignInGate what="rolls">
          <Panel>
            <EmptyState title={ready ? 'Not found' : 'Loading'}>
              {ready ? 'This roll no longer exists.' : 'One moment.'}
            </EmptyState>
          </Panel>
        </SignInGate>
      </PageShell>
    );

  const slots = liveSlots(roll.slots, new Set(recipes.map(recipe => recipe.id)));
  const contents = slotContents(slots, recipes, photoOf);

  return (
    <PageShell wide>
      <div className={page.detailHeader}>
        <PageHeader
          title={roll.name}
          lead={`${filledSlots(slots)} / ${ROLL_SLOTS.length} filled · A plan kept here: set the camera by hand.`}
        />
        <ActionMenu
          label="Change"
          variant="primary"
          items={[
            {
              label: 'Edit this roll',
              hint: 'Rename it or change what a slot holds.',
              to: `/recipes/rolls/${roll.id}/edit`,
            },
            {
              label: 'Copy to a new roll',
              hint: 'Starts a separate roll from these slots. This one stays.',
              to: `/recipes/rolls/new?from=${roll.id}`,
            },
            {
              label: 'Delete roll',
              hint: 'The recipes in it stay.',
              tone: 'danger',
              onSelect: () => setConfirming(true),
            },
          ]}
        />
      </div>

      <SignInGate what="rolls">
        {error && <ErrorText>{error}</ErrorText>}
        {roll.note && <NoteText>{roll.note}</NoteText>}

        <Panel title="Custom settings">
          <ol className={css.slotSheet}>
            {RECIPE_SLOTS.map(slot => {
              const content = contents[slot];
              const body = (
                <>
                  <span className={content ? css.frame : css.emptyFrame}>
                    {content?.photoUrl ? (
                      <img className={css.image} src={content.photoUrl} alt="" loading="lazy" />
                    ) : (
                      <span className={css.placeholder}>{content ? 'No photo' : 'Empty'}</span>
                    )}
                  </span>
                  <span className={css.slotLabel}>{slot}</span>
                  {content && <span className={css.slotName}>{content.name}</span>}
                </>
              );
              return (
                <li key={slot}>
                  {content?.recipeId ? (
                    <Link to={`/recipes/${content.recipeId}`} className={css.tile}>
                      {body}
                    </Link>
                  ) : (
                    <span className={css.stillTile}>{body}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel title="Film simulation dial">
          <MetaList
            rows={SIMULATION_SLOTS.map(slot => ({ label: slot, value: slots[slot] ?? 'Empty' }))}
          />
        </Panel>
      </SignInGate>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this roll?"
        actions={[
          {
            label: 'Delete',
            primary: true,
            onSelect: () => {
              setError('');
              rolls
                .remove(roll.id)
                .then(() => navigate('/recipes/rolls', { replace: true }))
                .catch(() => setError(MESSAGES.deleteFailed));
            },
          },
        ]}
      >
        Only the roll goes: the recipes in it stay as they are. Deleting cannot be undone.
      </ConfirmDialog>
    </PageShell>
  );
};
