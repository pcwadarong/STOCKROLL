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
  slotOfRecipe,
  type Strip,
  STRIP_SYSTEM,
  stripCollection,
  type StripSlot,
  systemOf,
  SYSTEMS,
} from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { MESSAGES } from '@/shared/config/messages';
import { useCollection } from '@/shared/lib/use-collection';
import { useGoBack, useReplaceEdit } from '@/shared/lib/use-go-back';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';
import { TextField, TextFieldInput, TextFieldTextarea } from 'seed-design/ui/text-field';

import { useRecipeLibrary } from '../model/use-recipe-library';
import { useRecipePhotos } from '../model/use-recipe-photos';

import { FilmStrip, slotContents } from './FilmStrip';
import { RecipeGallery } from './RecipeGallery';

import * as css from './FilmStrip.css';
import * as page from './LibraryPage.css';

type FormProps = {
  /** Panel heading: what the form is making. */
  title: string;
  initialName: string;
  initialNote: string;
  /** Slots the form starts from: the strip being edited, or the one being copied. */
  initialSlots: Strip['slots'];
  /** Recipes a strip can hold. */
  recipes: readonly Recipe[];
  onSave: (name: string, slots: Strip['slots'], note: string | null) => Promise<unknown>;
  onCancel: () => void;
};

const StripEditForm = ({
  title,
  initialName,
  initialNote,
  initialSlots,
  recipes,
  onSave,
  onCancel,
}: FormProps) => {
  const photoOf = useRecipePhotos(recipes);
  const [name, setName] = useState(initialName);
  const [note, setNote] = useState(initialNote);
  const [slots, setSlots] = useState(initialSlots);
  const [selected, setSelected] = useState<StripSlot>(() =>
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
    if (!name.trim()) return setError(MESSAGES.fillIn(['Strip name']));
    setBusy(true);
    setError('');
    try {
      await onSave(name.trim(), slots, note.trim() || null);
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
        <TextField label="Strip name" value={name} onValueChange={({ value }) => setName(value)}>
          <TextFieldInput onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} />
        </TextField>
        <TextField
          label="Note"
          indicator="Optional"
          value={note}
          onValueChange={({ value }) => setNote(value)}
        >
          <TextFieldTextarea
            autoresize
            onFocus={() => setTyping(true)}
            onBlur={() => setTyping(false)}
          />
        </TextField>
        <p className={page.note}>
          A strip is a plan kept here. Saving it does not change the camera or the recipes.
        </p>
      </Panel>

      <section
        className={typing ? `${css.dock} ${css.dockLoose}` : css.dock}
        aria-label="Slots of this strip"
      >
        <div className={css.dockCard}>
          <FilmStrip
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
              Save strip
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
          title={`${SYSTEMS[STRIP_SYSTEM].label} recipes`}
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
              Strips are built from your {SYSTEMS[STRIP_SYSTEM].label} recipes. Register one first.
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
 * Form for building a strip or changing one: a name, the film of slots, and the recipes to tap
 * into them — by picture or by name. The route decides what it makes: `/recipes/strips/new`
 * (optionally `?from=<strip>` to start from a copy, which leaves that strip as it is) and
 * `/recipes/strips/:id/edit`.
 */
export const StripEditPage = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { recipes, ready: recipesReady } = useRecipeLibrary();
  const strips = useCollection(stripCollection);

  const ready = recipesReady && strips.status === 'ready';
  const strip = id ? strips.items.find(item => item.id === id) : undefined;
  const original = id ? undefined : strips.items.find(item => item.id === params.get('from'));
  const missing = Boolean(id) && !strip;
  const goBack = useGoBack(strip ? `/recipes/strips/${strip.id}` : '/recipes/strips');
  const showSaved = useReplaceEdit();

  return (
    <PageShell
      wide
      back={strip ? `/recipes/strips/${strip.id}` : '/recipes/strips'}
      title={strip ? 'Edit strip' : 'New strip'}
      tabs={false}
    >
      <PageHeader
        title={strip?.name ?? 'New strip'}
        lead={
          original
            ? `Starts from ${original.name}. That strip stays as it is.`
            : 'A recipe for each of C1–C7, a film simulation for each of FS1–FS3.'
        }
      />

      <SignInGate what="strips">
        {!ready || missing ? (
          <Panel>
            <EmptyState title={ready ? 'Not found' : 'Loading'}>
              {ready ? 'This strip no longer exists.' : 'One moment.'}
            </EmptyState>
          </Panel>
        ) : (
          <StripEditForm
            key={strip?.id ?? original?.id ?? 'new'}
            title={strip ? 'Edit strip' : original ? 'Copy to a new strip' : 'New strip'}
            initialName={strip?.name ?? (original ? copyName(original.name) : '')}
            initialNote={(strip ?? original)?.note ?? ''}
            initialSlots={liveSlots(
              (strip ?? original)?.slots,
              new Set(recipes.map(recipe => recipe.id)),
            )}
            recipes={recipes.filter(recipe => systemOf(recipe) === STRIP_SYSTEM)}
            onSave={(name, slots, note) =>
              strips.save({ id: strip?.id, name, slots, note }).then(saved =>
                // A new strip or a copy has no screen of its own behind the form.
                strip
                  ? showSaved(`/recipes/strips/${saved.id}`)
                  : navigate(`/recipes/strips/${saved.id}`, { replace: true }),
              )
            }
            onCancel={goBack}
          />
        )}
      </SignInGate>
    </PageShell>
  );
};
