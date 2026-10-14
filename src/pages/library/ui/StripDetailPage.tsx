import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import {
  filledSlots,
  liveSlots,
  RECIPE_SLOTS,
  SIMULATION_SLOTS,
  STRIP_SLOTS,
  stripCollection,
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

import { slotContents } from './FilmStrip';

import * as page from './LibraryPage.css';
import * as css from './RecipeGallery.css';

/**
 * One strip, read-only (`/recipes/strips/:id`): the recipes in C1–C7 at full size, each leading to
 * its recipe, and the film simulations on the dial. Changing the strip, copying it into a new one
 * and deleting it are chosen from the menu, before any editing starts.
 */
export const StripDetailPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { recipes, ready: recipesReady } = useRecipeLibrary();
  const strips = useCollection(stripCollection);
  const photoOf = useRecipePhotos(recipes);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const ready = recipesReady && strips.status === 'ready';
  const strip = strips.items.find(item => item.id === id);

  if (!ready || !strip)
    return (
      <PageShell wide back="/recipes/strips">
        <PageHeader title="Strip" />
        <SignInGate what="strips">
          <Panel>
            <EmptyState title={ready ? 'Not found' : 'Loading'}>
              {ready ? 'This strip no longer exists.' : 'One moment.'}
            </EmptyState>
          </Panel>
        </SignInGate>
      </PageShell>
    );

  const slots = liveSlots(strip.slots, new Set(recipes.map(recipe => recipe.id)));
  const contents = slotContents(slots, recipes, photoOf);

  return (
    <PageShell wide back="/recipes/strips">
      <div className={page.detailHeader}>
        <PageHeader
          title={strip.name}
          lead={`${filledSlots(slots)} / ${STRIP_SLOTS.length} filled · A plan kept here: set the camera by hand.`}
        />
        <ActionMenu
          label="Change"
          variant="primary"
          items={[
            {
              label: 'Edit this strip',
              hint: 'Rename it or change what a slot holds.',
              to: `/recipes/strips/${strip.id}/edit`,
            },
            {
              label: 'Copy to a new strip',
              hint: 'Starts a separate strip from these slots. This one stays.',
              to: `/recipes/strips/new?from=${strip.id}`,
            },
            {
              label: 'Delete strip',
              hint: 'The recipes in it stay.',
              tone: 'danger',
              onSelect: () => setConfirming(true),
            },
          ]}
        />
      </div>

      <SignInGate what="strips">
        {error && <ErrorText>{error}</ErrorText>}
        {strip.note && <NoteText>{strip.note}</NoteText>}

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
        title="Delete this strip?"
        actions={[
          {
            label: 'Delete',
            primary: true,
            onSelect: () => {
              setError('');
              strips
                .remove(strip.id)
                .then(() => navigate('/recipes/strips', { replace: true }))
                .catch(() => setError(MESSAGES.deleteFailed));
            },
          },
        ]}
      >
        Only the strip goes: the recipes in it stay as they are. Deleting cannot be undone.
      </ConfirmDialog>
    </PageShell>
  );
};
