import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import {
  assignSlot,
  clearSlot,
  copyName,
  FUJI_SIMULATIONS,
  isSimulationSlot,
  liveSlots,
  nextEmptySlot,
  type Recipe,
  type Roll,
  ROLL_SYSTEM,
  rollCollection,
  type RollSlot,
  slotOfRecipe,
  systemOf,
  SYSTEMS,
} from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
import { useCollection } from '@/shared/lib/use-collection';
import { useGoBack } from '@/shared/lib/use-go-back';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';
import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import { useRecipeLibrary } from '../model/use-recipe-library';
import { useRecipePhotos } from '../model/use-recipe-photos';

import { RecipeGallery } from './RecipeGallery';
import { RollStrip, slotContents } from './RollStrip';

import * as page from './LibraryPage.css';
import * as css from './RollStrip.css';

type FormProps = {
  /** Panel heading: what the form is making. */
  title: string;
  initialName: string;
  /** Slots the form starts from: the roll being edited, or the one being copied. */
  initialSlots: Roll['slots'];
  /** Recipes a roll can hold. */
  recipes: readonly Recipe[];
  onSave: (name: string, slots: Roll['slots']) => Promise<unknown>;
  onCancel: () => void;
};

const RollEditForm = ({
  title,
  initialName,
  initialSlots,
  recipes,
  onSave,
  onCancel,
}: FormProps) => {
  const photoOf = useRecipePhotos(recipes);
  const [name, setName] = useState(initialName);
  const [slots, setSlots] = useState(initialSlots);
  const [selected, setSelected] = useState<RollSlot>(() =>
    slots.C1 ? nextEmptySlot(slots, 'C1') : 'C1',
  );
  const [layout, setLayout] = useState<'photos' | 'names'>('photos');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);

  const onDial = isSimulationSlot(selected);

  const pick = (value: string) => {
    // Tapping what the slot already holds takes it out again, as the pressed tile suggests.
    if (slots[selected] === value) return setSlots(clearSlot(slots, selected));
    const next = assignSlot(slots, selected, value);
    setSlots(next);
    // Move on to the next free slot, so a set is gathered by tapping one recipe after another.
    setSelected(nextEmptySlot(next, selected));
  };

  const save = async () => {
    if (!name.trim()) return setError(MESSAGES.fillIn(['Roll name']));
    setBusy(true);
    setError('');
    try {
      await onSave(name.trim(), slots);
    } catch {
      setError(MESSAGES.saveFailed);
      setBusy(false);
    }
  };

  return (
    <>
      <Panel
        title={title}
        action={
          <Button size="small" onClick={onCancel}>
            Cancel
          </Button>
        }
      >
        <TextField label="Roll name" value={name} onValueChange={({ value }) => setName(value)}>
          <TextFieldInput onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} />
        </TextField>
        <p className={page.note}>
          A roll is a plan kept here. Saving it does not change the camera or the recipes.
        </p>
      </Panel>

      <section
        className={typing ? `${css.dock} ${css.dockLoose}` : css.dock}
        aria-label="Slots of this roll"
      >
        <div className={css.dockCard}>
          <RollStrip
            contents={slotContents(slots, recipes, photoOf)}
            selected={selected}
            onSelect={setSelected}
          />
          {error && <ErrorText>{error}</ErrorText>}
          <div className={css.dockRow}>
            {/* Announced, because picking a recipe moves the selection to another slot. */}
            <p className={css.dockStatus} role="status">
              Filling <span className={css.dockSlot}>{selected}</span>
            </p>
            {slots[selected] && (
              <Button variant="plain" onClick={() => setSlots(clearSlot(slots, selected))}>
                Empty {selected}
              </Button>
            )}
            <Button variant="primary" size="small" loading={busy} onClick={() => void save()}>
              Save roll
            </Button>
          </div>
        </div>
      </section>

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
          title={`${SYSTEMS[ROLL_SYSTEM].label} recipes`}
          action={
            <div className={page.toolbar}>
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
              Rolls are built from your {SYSTEMS[ROLL_SYSTEM].label} recipes. Register one first.
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
    </>
  );
};

/**
 * Form for building a roll or changing one: a name, the strip of slots, and the recipes to tap
 * into them — by picture or by name. The route decides what it makes: `/recipes/rolls/new`
 * (optionally `?from=<roll>` to start from a copy, which leaves that roll as it is) and
 * `/recipes/rolls/:id/edit`.
 */
export const RollEditPage = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { recipes, ready: recipesReady } = useRecipeLibrary();
  const rolls = useCollection(rollCollection);

  const ready = recipesReady && rolls.status === 'ready';
  const roll = id ? rolls.items.find(item => item.id === id) : undefined;
  const original = id ? undefined : rolls.items.find(item => item.id === params.get('from'));
  const missing = Boolean(id) && !roll;
  const goBack = useGoBack(roll ? `/recipes/rolls/${roll.id}` : '/recipes/rolls');

  return (
    <PageShell wide>
      <PageHeader
        title={roll?.name ?? 'New roll'}
        lead={
          original
            ? `Starts from ${original.name}. That roll stays as it is.`
            : 'A recipe for each of C1–C7, a film simulation for each of FS1–FS3.'
        }
      />

      <SignInGate what="rolls">
        {!ready || missing ? (
          <Panel>
            <EmptyState title={ready ? 'Not found' : 'Loading'}>
              {ready ? 'This roll no longer exists.' : 'One moment.'}
            </EmptyState>
          </Panel>
        ) : (
          <RollEditForm
            key={roll?.id ?? original?.id ?? 'new'}
            title={roll ? 'Edit roll' : original ? 'Copy to a new roll' : 'New roll'}
            initialName={roll?.name ?? (original ? copyName(original.name) : '')}
            initialSlots={liveSlots(
              (roll ?? original)?.slots,
              new Set(recipes.map(recipe => recipe.id)),
            )}
            recipes={recipes.filter(recipe => systemOf(recipe) === ROLL_SYSTEM)}
            onSave={(name, slots) =>
              rolls
                .save({ id: roll?.id, name, slots })
                .then(saved => navigate(`/recipes/rolls/${saved.id}`, { replace: true }))
            }
            onCancel={goBack}
          />
        )}
      </SignInGate>
    </PageShell>
  );
};
