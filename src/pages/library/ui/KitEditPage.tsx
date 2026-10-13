import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import {
  assignSlot,
  clearSlot,
  FUJI_SIMULATIONS,
  isSimulationSlot,
  type Kit,
  KIT_SYSTEM,
  kitCollection,
  type KitSlot,
  liveSlots,
  nextEmptySlot,
  type Recipe,
  slotOfRecipe,
  systemOf,
  SYSTEMS,
} from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
import { useCollection } from '@/shared/lib/use-collection';
import { useGoBack } from '@/shared/lib/use-go-back';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';
import { TextField, TextFieldInput, TextFieldTextarea } from 'seed-design/ui/text-field';

import { useRecipeLibrary } from '../model/use-recipe-library';
import { useRecipePhotos } from '../model/use-recipe-photos';

import { KitStrip, slotContents } from './KitStrip';
import { RecipeGallery } from './RecipeGallery';

import * as css from './LibraryPage.css';

type FormProps = {
  kit: Kit | undefined;
  /** Recipes a kit can hold. */
  recipes: readonly Recipe[];
  onSave: (name: string, slots: Kit['slots'], note: string | null) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  onCancel: () => void;
};

const KitEditForm = ({ kit, recipes, onSave, onDelete, onCancel }: FormProps) => {
  const photoOf = useRecipePhotos(recipes);
  const [name, setName] = useState(kit?.name ?? '');
  const [note, setNote] = useState(kit?.note ?? '');
  const [slots, setSlots] = useState(() =>
    liveSlots(kit?.slots, new Set(recipes.map(recipe => recipe.id))),
  );
  const [selected, setSelected] = useState<KitSlot>(() =>
    slots.C1 ? nextEmptySlot(slots, 'C1') : 'C1',
  );
  const [layout, setLayout] = useState<'photos' | 'names'>('photos');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const onDial = isSimulationSlot(selected);

  const pick = (value: string) => {
    const next = assignSlot(slots, selected, value);
    setSlots(next);
    // Move on to the next free slot, so a set is gathered by tapping one recipe after another.
    setSelected(nextEmptySlot(next, selected));
  };

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch {
      setError(failure);
      setBusy(false);
    }
  };

  const save = () =>
    name.trim()
      ? void run(() => onSave(name.trim(), slots, note.trim() || null), MESSAGES.saveFailed)
      : setError(MESSAGES.fillIn(['Kit name']));

  return (
    <>
      <Panel title={kit ? 'Edit kit' : 'New kit'}>
        {error && <ErrorText>{error}</ErrorText>}
        <TextField label="Kit name" value={name} onValueChange={({ value }) => setName(value)}>
          <TextFieldInput placeholder="Five days in Tokyo" />
        </TextField>
        <TextField
          label="Note"
          indicator="Optional"
          value={note}
          onValueChange={({ value }) => setNote(value)}
        >
          <TextFieldTextarea autoresize />
        </TextField>

        <KitStrip
          contents={slotContents(slots, recipes, photoOf)}
          selected={selected}
          onSelect={setSelected}
        />
        <div className={css.toolbar}>
          {/* Announced, because picking a recipe moves the selection to another slot. */}
          <p className={css.note} role="status">
            Choosing for {selected}. Tap a {onDial ? 'film simulation' : 'recipe'} below to put it
            there.
          </p>
          {slots[selected] && (
            <Button variant="plain" onClick={() => setSlots(clearSlot(slots, selected))}>
              Empty {selected}
            </Button>
          )}
        </div>
        <p className={css.note}>
          A kit is a plan kept here. Saving it does not change the camera or the recipes.
        </p>

        <div className={css.actions}>
          {kit && (
            <Button className={css.destructive} variant="plain" onClick={() => setConfirming(true)}>
              Delete kit
            </Button>
          )}
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={save}>
            Save kit
          </Button>
        </div>
      </Panel>

      {onDial ? (
        // The dial stores a film simulation and nothing else, so these slots offer the list of
        // simulations rather than recipes.
        <Panel title="Film simulations">
          <RecipeGallery
            layout="names"
            onPick={pick}
            items={FUJI_SIMULATIONS.map(simulation => ({
              id: simulation,
              title: simulation,
              pressed: slots[selected] === simulation,
            }))}
          />
        </Panel>
      ) : (
        <Panel
          title={`${SYSTEMS[KIT_SYSTEM].label} recipes`}
          action={
            <div className={css.toolbar}>
              <Button
                size="small"
                pressed={layout === 'photos'}
                onClick={() => setLayout('photos')}
              >
                Photos
              </Button>
              <Button size="small" pressed={layout === 'names'} onClick={() => setLayout('names')}>
                Names
              </Button>
            </div>
          }
        >
          {recipes.length === 0 ? (
            <EmptyState
              title="No recipe to choose"
              action={<Button to="/recipes/new">+ New recipe</Button>}
            >
              Kits are built from your {SYSTEMS[KIT_SYSTEM].label} recipes. Register one first.
            </EmptyState>
          ) : (
            <RecipeGallery
              layout={layout}
              onPick={pick}
              items={recipes.map(recipe => {
                const slot = slotOfRecipe(slots, recipe.id);
                return {
                  id: recipe.id,
                  title: recipe.name,
                  sub: recipe.baseSimulation,
                  photoUrl: photoOf(recipe),
                  badge: slot,
                  pressed: slot === selected,
                };
              })}
            />
          )}
        </Panel>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this kit?"
        actions={[
          {
            label: 'Delete',
            primary: true,
            onSelect: () => void run(onDelete, MESSAGES.deleteFailed),
          },
        ]}
      >
        Only the kit goes: the recipes in it stay as they are. Deleting cannot be undone.
      </ConfirmDialog>
    </>
  );
};

/**
 * Form for building a kit (`/recipes/kits/new`) or changing one (`/recipes/kits/:id/edit`): a
 * name, the slots, and the recipes to tap into them — by picture or by name.
 */
export const KitEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipes, ready: recipesReady } = useRecipeLibrary();
  const kits = useCollection(kitCollection);
  const goBack = useGoBack('/recipes/kits');

  const ready = recipesReady && kits.status === 'ready';
  const kit = id ? kits.items.find(item => item.id === id) : undefined;
  const missing = Boolean(id) && !kit;
  const done = () => navigate('/recipes/kits', { replace: true });

  return (
    <PageShell wide>
      <PageHeader
        title={kit?.name ?? 'New kit'}
        lead="A recipe for each of C1–C7, a film simulation for each of FS1–FS3."
      />

      <SignInGate what="kits">
        {!ready || missing ? (
          <Panel>
            <EmptyState title={ready ? 'Not found' : 'Loading'}>
              {ready ? 'This kit no longer exists.' : 'One moment.'}
            </EmptyState>
          </Panel>
        ) : (
          <KitEditForm
            key={kit?.id ?? 'new'}
            kit={kit}
            recipes={recipes.filter(recipe => systemOf(recipe) === KIT_SYSTEM)}
            onSave={(name, slots, note) => kits.save({ id: kit?.id, name, slots, note }).then(done)}
            onDelete={() => (kit ? kits.remove(kit.id).then(done) : Promise.resolve())}
            onCancel={goBack}
          />
        )}
      </SignInGate>
    </PageShell>
  );
};
