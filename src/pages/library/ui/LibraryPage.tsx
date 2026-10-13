import { useState } from 'react';
import { Navigate, NavLink, useNavigate, useParams } from 'react-router';

import {
  CAMERA_DEFAULTS,
  CAMERA_FIELDS,
  CAMERA_FILTERS,
  cameraCollection,
  FILM_DEFAULTS,
  FILM_FIELDS,
  FILM_FILTERS,
  FILM_ORDER,
  filmCollection,
  GEAR_ORDER,
  LENS_DEFAULTS,
  LENS_FIELDS,
  LENS_FILTERS,
  lensCollection,
  statusNote,
} from '@/entities/gear';
import { SignInGate } from '@/features/auth';
import type { Collection, ListOrder, Row } from '@/shared/api/collection';
import { MESSAGES } from '@/shared/config/messages';
import { activePicks, type ListFilter } from '@/shared/lib/pick-filter';
import {
  missingRequired,
  normalizeRecord,
  type RecordField,
  type RecordValues,
} from '@/shared/lib/record-field';
import { useCollectionPage } from '@/shared/lib/use-collection-page';
import { useDebounced } from '@/shared/lib/use-debounced';
import { useGoBack } from '@/shared/lib/use-go-back';
import { useRecord } from '@/shared/lib/use-record';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { formatCount, MetaList } from '@/shared/ui/MetaList';
import { NoteText } from '@/shared/ui/NoteText';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { RecordForm } from '@/shared/ui/RecordForm';
import { PageShell } from '@/widgets/page-shell';

import { LIST_STEP, SEARCH_DELAY_MS } from '../model/list-steps';

import { ItemList, type ListFact, ListFilters, ListMore } from './LibraryList';

import * as css from './LibraryPage.css';

type GearRow = Row & RecordValues & { name: string };

type Section = {
  title: string;
  singular: string;
  collection: Collection<GearRow>;
  fields: readonly RecordField[];
  defaults: RecordValues;
  /** Facts shown under the name in the list. */
  facts: (item: GearRow, label: (key: string) => string) => ListFact[];
  /** Dropdowns that narrow this section's list. */
  filters: readonly ListFilter[];
  order: readonly ListOrder[];
  /** Second line of the summary: gear counts what is in use, film counts favorites. */
  count: { label: string; holding: Readonly<Record<string, string>> };
};

const LIST_ID = 'gear-list';

const IN_USE = { label: 'In use', holding: { status: 'active' } };

const SECTIONS: Record<string, Section> = {
  cameras: {
    title: 'Cameras',
    singular: 'camera',
    collection: cameraCollection as unknown as Collection<GearRow>,
    fields: CAMERA_FIELDS,
    defaults: CAMERA_DEFAULTS,
    facts: (item, label) => [
      label('kind'),
      label('bodyType'),
      item.filmFormat && String(item.filmFormat),
      item.mount && String(item.mount),
    ],
    filters: CAMERA_FILTERS,
    order: GEAR_ORDER,
    count: IN_USE,
  },
  lenses: {
    title: 'Lenses',
    singular: 'lens',
    collection: lensCollection as unknown as Collection<GearRow>,
    fields: LENS_FIELDS,
    defaults: LENS_DEFAULTS,
    facts: item => [item.mount && `${item.mount} mount`],
    filters: LENS_FILTERS,
    order: GEAR_ORDER,
    count: IN_USE,
  },
  films: {
    title: 'Films',
    singular: 'film',
    collection: filmCollection as unknown as Collection<GearRow>,
    fields: FILM_FIELDS,
    defaults: FILM_DEFAULTS,
    facts: (item, label) => [
      String(item.format ?? ''),
      item.iso && `ISO ${item.iso}`,
      label('kind'),
    ],
    filters: FILM_FILTERS,
    order: FILM_ORDER,
    count: { label: 'Favorites', holding: { isFavorite: 'true' } },
  },
};

const optionLabel = (fields: readonly RecordField[], item: GearRow) => (key: string) => {
  const value = item[key];
  return (
    fields.find(field => field.key === key)?.options?.find(o => o.value === value)?.label ?? ''
  );
};

type GearFormProps = {
  section: Section;
  initial: RecordValues;
  onSave: (values: RecordValues) => Promise<unknown>;
  /** Present only when editing an existing item; a new one has nothing to delete. */
  onDelete?: () => Promise<void>;
  onDone: () => void;
};

const GearForm = ({ section, initial, onSave, onDelete, onDone }: GearFormProps) => {
  const [values, setValues] = useState<RecordValues>(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const remove = async () => {
    if (!onDelete) return;
    setSaving(true);
    setError('');
    try {
      // The caller navigates away itself: going "back" would land on the deleted item.
      await onDelete();
    } catch {
      setError(MESSAGES.deleteFailed);
      setSaving(false);
    }
  };

  const submit = async () => {
    const normalized = normalizeRecord(section.fields, values);
    const missing = missingRequired(section.fields, normalized);
    if (missing.length > 0) return setError(MESSAGES.fillIn(missing));

    setSaving(true);
    setError('');
    try {
      await onSave({ ...values, ...normalized });
      onDone();
    } catch {
      setError(MESSAGES.saveFailed);
      setSaving(false);
    }
  };

  return (
    <>
      {error && <ErrorText>{error}</ErrorText>}
      <RecordForm
        fields={section.fields}
        values={values}
        onChange={(key, value) => setValues(prev => ({ ...prev, [key]: value }))}
      />
      <div className={css.actions}>
        {onDelete && (
          <Button className={css.destructive} variant="plain" onClick={() => setConfirming(true)}>
            Delete {section.singular}
          </Button>
        )}
        <Button onClick={onDone}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={() => void submit()}>
          Save {section.singular}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete this ${section.singular}?`}
        actions={[{ label: 'Delete', primary: true, onSelect: () => void remove() }]}
      >
        Use this for an entry made by mistake. If you simply stopped using it, change its status
        instead so it stays in your record. Deleting cannot be undone.
      </ConfirmDialog>
    </>
  );
};

/** What a section's list is narrowed to. It belongs to the section it was set in. */
type Narrowing = { kind: string; values: Record<string, string>; query: string };

const Waiting = ({ status }: { status: 'loading' | 'missing' | 'error' }) =>
  status === 'error' ? (
    <ErrorText>{MESSAGES.loadFailed}</ErrorText>
  ) : (
    <EmptyState title={status === 'loading' ? 'Loading' : 'Not found'}>
      {status === 'loading' ? 'One moment.' : 'This item no longer exists.'}
    </EmptyState>
  );

type GearListProps = {
  kind: string;
  section: Section;
  picks: Record<string, string>;
  query: string;
  onPick: (key: string, value: string) => void;
  onSearch: (query: string) => void;
};

const GearList = ({ kind, section, picks, query, onPick, onSearch }: GearListProps) => {
  const list = useCollectionPage(section.collection, {
    filters: activePicks(picks),
    search: useDebounced(query, SEARCH_DELAY_MS),
    order: section.order,
    step: LIST_STEP,
    tallies: { counted: section.count.holding },
  });
  const [listError, setListError] = useState('');
  const registered = list.counts.total ?? 0;

  const toggleFavorite = (itemId: string) => {
    const item = list.rows.find(candidate => candidate.id === itemId);
    if (!item) return;
    setListError('');
    list
      .save({ ...item, isFavorite: item.isFavorite !== true })
      .catch(() => setListError(MESSAGES.saveFailed));
  };

  return (
    <Panel
      title={section.title}
      action={
        registered > 0 && (
          <Button variant="primary" size="small" to={`/library/${kind}/new`}>
            + Add {section.singular}
          </Button>
        )
      }
    >
      {list.status === 'error' && <ErrorText>{MESSAGES.loadFailed}</ErrorText>}

      {list.status === 'ready' && (
        <MetaList
          rows={[
            { label: 'Registered', value: formatCount(registered) },
            { label: section.count.label, value: formatCount(list.counts.counted ?? 0) },
          ]}
        />
      )}

      {list.status === 'ready' && registered === 0 && (
        <EmptyState
          title={`No ${section.singular} registered`}
          action={
            <Button variant="primary" to={`/library/${kind}/new`}>
              + Add {section.singular}
            </Button>
          }
        >
          Your {section.title.toLowerCase()} will appear here. Register a {section.singular} to use
          it in Frame.
        </EmptyState>
      )}

      {registered > 0 && (
        <>
          <ListFilters
            filters={section.filters}
            picks={picks}
            onPick={onPick}
            search={{
              label: `Search ${section.title.toLowerCase()}`,
              value: query,
              onChange: onSearch,
            }}
          />

          {listError && <ErrorText>{listError}</ErrorText>}

          {list.status === 'ready' && list.total === 0 && (
            <EmptyState title="Nothing here">No {section.singular} matches this view.</EmptyState>
          )}

          {list.rows.length > 0 && (
            <ItemList
              id={LIST_ID}
              rows={list.rows.map(item => ({
                id: item.id,
                to: `/library/${kind}/${item.id}`,
                title: item.name,
                facts: section.facts(item, optionLabel(section.fields, item)),
                note: statusNote(item),
                favorite: item.isFavorite === true,
              }))}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {list.moreFailed && <ErrorText>{MESSAGES.loadFailed}</ErrorText>}
          <ListMore
            listId={LIST_ID}
            shown={list.rows.length}
            total={list.total}
            step={list.step}
            loading={list.loadingMore}
            onMore={() => void list.more()}
          />
        </>
      )}
    </Panel>
  );
};

const GearDetail = ({ kind, section, id }: { kind: string; section: Section; id: string }) => {
  const { item, status } = useRecord(section.collection, id);

  return (
    <Panel
      title={item?.name ?? section.title}
      action={
        item && (
          <Button variant="primary" size="small" to={`/library/${kind}/${item.id}/edit`}>
            Edit
          </Button>
        )
      }
    >
      {item ? (
        <>
          <MetaList
            rows={section.fields.flatMap(field => {
              const value = item[field.key];
              // The note is shown whole below: a row here would cut it to one line.
              if (field.type === 'multiline') return [];
              if (value === null || value === undefined || value === '') return [];
              return [
                {
                  label: field.label,
                  value: optionLabel(section.fields, item)(field.key) || String(value),
                },
              ];
            })}
          />
          {typeof item.note === 'string' && item.note && <NoteText>{item.note}</NoteText>}
          <div className={css.actions}>
            <Button to={`/library/${kind}`}>All {section.title.toLowerCase()}</Button>
          </div>
        </>
      ) : (
        status !== 'ready' && <Waiting status={status} />
      )}
    </Panel>
  );
};

type GearEditProps = { kind: string; section: Section; id: string; onDone: () => void };

const GearEdit = ({ kind, section, id, onDone }: GearEditProps) => {
  const navigate = useNavigate();
  const isNew = id === 'new';
  const { item, status } = useRecord(section.collection, isNew ? undefined : id);

  return (
    <Panel title={isNew ? `Add ${section.singular}` : `Edit ${section.singular}`}>
      {!isNew && !item ? (
        status !== 'ready' && <Waiting status={status} />
      ) : (
        <GearForm
          key={`${kind}:${id}`}
          section={section}
          initial={item ?? section.defaults}
          onSave={values => section.collection.save(values as GearRow)}
          onDelete={
            item
              ? () =>
                  section.collection
                    .remove(item.id)
                    .then(() => navigate(`/library/${kind}`, { replace: true }))
              : undefined
          }
          onDone={onDone}
        />
      )}
    </Panel>
  );
};

/**
 * Gear library: lists registered cameras, lenses and films, shows one read-only, and hosts the
 * form for adding or editing one. Opening an item never lands in the form directly.
 * Gear you no longer use keeps its place in the record: change its status rather than deleting
 * it. Delete exists for entries made by mistake.
 * @param props `editing` is set by the `/:id/edit` route
 */
export const LibraryPage = ({ editing: editRoute = false }: { editing?: boolean }) => {
  const { kind: kindParam = 'cameras', id } = useParams();
  // The kind comes from the URL. Accept only real sections: a plain lookup would also "find"
  // inherited keys such as `toString`, and an unknown kind would produce broken links.
  const known = Object.hasOwn(SECTIONS, kindParam);
  const kind = known ? kindParam : 'cameras';
  // Leaving the form of an existing item returns to its detail; a new item returns to the list.
  const goBack = useGoBack(id && id !== 'new' ? `/library/${kind}/${id}` : `/library/${kind}`);
  const section = SECTIONS[kind]!;
  // Kept here rather than in the list, so the filters and the search are still set when the
  // user comes back from an item. Another section starts unfiltered.
  const [narrowing, setNarrowing] = useState<Narrowing>({ kind, values: {}, query: '' });
  const { values: picks, query } = narrowing.kind === kind ? narrowing : { values: {}, query: '' };

  const narrow = (change: (current: Narrowing) => Partial<Narrowing>) =>
    setNarrowing(previous => {
      const current = previous.kind === kind ? previous : { kind, values: {}, query: '' };
      return { ...current, ...change(current) };
    });

  // `/library/:kind/:id` shows an item read-only; the form is `/new` or `/:id/edit`.
  const editing = id === 'new' || (id !== undefined && editRoute);

  if (!known) return <Navigate to="/library/cameras" replace />;

  return (
    <PageShell>
      <PageHeader title="Gear log" lead="Your cameras, lenses and films." />

      <nav className={css.tabs} aria-label="Gear type">
        {Object.entries(SECTIONS).map(([key, { title }], index) => (
          <NavLink key={key} to={`/library/${key}`} className={css.tab}>
            <span aria-hidden="true">{formatCount(index + 1)}</span>
            {title}
          </NavLink>
        ))}
      </nav>

      <SignInGate what="cameras, lenses and films">
        {id === undefined ? (
          <GearList
            key={kind}
            kind={kind}
            section={section}
            picks={picks}
            query={query}
            onPick={(key, value) =>
              narrow(current => ({ values: { ...current.values, [key]: value } }))
            }
            onSearch={next => narrow(() => ({ query: next }))}
          />
        ) : editing ? (
          <GearEdit key={`${kind}:${id}`} kind={kind} section={section} id={id} onDone={goBack} />
        ) : (
          <GearDetail key={`${kind}:${id}`} kind={kind} section={section} id={id} />
        )}
      </SignInGate>
    </PageShell>
  );
};
