import { useState } from 'react';
import { Link, Navigate, NavLink, useNavigate, useParams } from 'react-router';

import {
  ANY,
  arrangeGear,
  CAMERA_DEFAULTS,
  CAMERA_FIELDS,
  cameraCollection,
  FILM_DEFAULTS,
  FILM_FIELDS,
  FILM_FILTERS,
  filmCollection,
  GEAR_FILTERS,
  type GearFilter,
  isCurrent,
  LENS_DEFAULTS,
  LENS_FIELDS,
  lensCollection,
} from '@/entities/gear';
import { SignInGate } from '@/features/auth';
import type { Collection, Row } from '@/shared/api/collection';
import { MESSAGES } from '@/shared/config/messages';
import {
  missingRequired,
  normalizeRecord,
  type RecordField,
  type RecordValues,
} from '@/shared/lib/record-field';
import { useCollection } from '@/shared/lib/use-collection';
import { useGoBack } from '@/shared/lib/use-go-back';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FilterChips } from '@/shared/ui/FilterChips';
import { labelText } from '@/shared/ui/label.css';
import { formatCount, MetaList } from '@/shared/ui/MetaList';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { RecordForm } from '@/shared/ui/RecordForm';
import { PageShell } from '@/widgets/page-shell';

import * as css from './LibraryPage.css';

type GearRow = Row & RecordValues & { name: string };

type Section = {
  title: string;
  singular: string;
  collection: Collection<GearRow>;
  fields: readonly RecordField[];
  defaults: RecordValues;
  /** Short second line shown under the name in the list. */
  summary: (item: GearRow, label: (key: string) => string) => string;
  /** Facts this section's list can be narrowed by, one row of chips each. */
  filters: readonly GearFilter[];
  /** Field whose label is shown at the end of a row that is not part of current shooting. */
  standingField: string;
};

const SECTIONS: Record<string, Section> = {
  cameras: {
    title: 'Cameras',
    singular: 'camera',
    collection: cameraCollection as unknown as Collection<GearRow>,
    fields: CAMERA_FIELDS,
    defaults: CAMERA_DEFAULTS,
    summary: (item, label) =>
      [label('kind'), item.filmFormat, item.mount].filter(Boolean).join(' · '),
    filters: GEAR_FILTERS,
    standingField: 'status',
  },
  lenses: {
    title: 'Lenses',
    singular: 'lens',
    collection: lensCollection as unknown as Collection<GearRow>,
    fields: LENS_FIELDS,
    defaults: LENS_DEFAULTS,
    summary: item => (item.mount ? `${item.mount} mount` : ''),
    filters: GEAR_FILTERS,
    standingField: 'status',
  },
  films: {
    title: 'Films',
    singular: 'film',
    collection: filmCollection as unknown as Collection<GearRow>,
    fields: FILM_FIELDS,
    defaults: FILM_DEFAULTS,
    summary: (item, label) =>
      [item.format, item.iso ? `ISO ${item.iso}` : '', label('kind')].filter(Boolean).join(' · '),
    filters: FILM_FILTERS,
    standingField: 'usage',
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

/**
 * Gear library: lists registered cameras, lenses and films, shows one read-only, and hosts the
 * form for adding or editing one. Opening an item never lands in the form directly.
 * @param props `editing` is set by the `/:id/edit` route Gear you no longer use keeps its place in the record: change its status rather
 * than deleting it. Delete exists for entries made by mistake.
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
  const { items, status, save, remove } = useCollection(section.collection);
  const navigate = useNavigate();
  // Picked chips belong to the section they were picked in; another section starts unfiltered.
  const [picked, setPicked] = useState<{ kind: string; values: Record<string, string> }>({
    kind,
    values: {},
  });
  const picks = picked.kind === kind ? picked.values : {};
  const shown = arrangeGear(items, picks);

  // `/library/:kind/:id` shows an item read-only; the form is `/new` or `/:id/edit`.
  const editing = id === 'new' || (id !== undefined && editRoute);
  const viewing = id !== undefined && !editing;
  const current = id && id !== 'new' ? items.find(item => item.id === id) : undefined;
  const waitingForItem = id !== undefined && id !== 'new' && !current;

  if (!known) return <Navigate to="/library/cameras" replace />;

  return (
    <PageShell>
      <PageHeader title="Gear log" lead="Cameras, lenses and films you have shot with." />

      <nav className={css.tabs} aria-label="Gear type">
        {Object.entries(SECTIONS).map(([key, { title }], index) => (
          <NavLink key={key} to={`/library/${key}`} className={css.tab}>
            <span aria-hidden="true">{formatCount(index + 1)}</span>
            {title}
          </NavLink>
        ))}
      </nav>

      <SignInGate what="cameras, lenses and films">
        {viewing ? (
          <Panel
            title={current?.name ?? section.title}
            action={
              current && (
                <Button variant="primary" size="small" to={`/library/${kind}/${current.id}/edit`}>
                  Edit
                </Button>
              )
            }
          >
            {current ? (
              <>
                <MetaList
                  rows={section.fields.flatMap(field => {
                    const value = current[field.key];
                    if (value === null || value === undefined || value === '') return [];
                    return [
                      {
                        label: field.label,
                        value: optionLabel(section.fields, current)(field.key) || String(value),
                      },
                    ];
                  })}
                />
                <div className={css.actions}>
                  <Button to={`/library/${kind}`}>All {section.title.toLowerCase()}</Button>
                </div>
              </>
            ) : (
              <EmptyState title={status === 'loading' ? 'Loading' : 'Not found'}>
                {status === 'loading' ? 'One moment.' : 'This item no longer exists.'}
              </EmptyState>
            )}
          </Panel>
        ) : editing ? (
          <Panel title={id === 'new' ? `Add ${section.singular}` : `Edit ${section.singular}`}>
            {waitingForItem ? (
              <EmptyState title={status === 'loading' ? 'Loading' : 'Not found'}>
                {status === 'loading' ? 'One moment.' : 'This item no longer exists.'}
              </EmptyState>
            ) : (
              <GearForm
                key={`${kind}:${id}`}
                section={section}
                initial={current ?? section.defaults}
                onSave={values => save(values as GearRow)}
                onDelete={
                  current
                    ? () =>
                        remove(current.id).then(() =>
                          navigate(`/library/${kind}`, { replace: true }),
                        )
                    : undefined
                }
                onDone={goBack}
              />
            )}
          </Panel>
        ) : (
          <Panel
            title={section.title}
            action={
              items.length > 0 && (
                <Button variant="primary" size="small" to={`/library/${kind}/new`}>
                  + Add {section.singular}
                </Button>
              )
            }
          >
            {status === 'error' && <ErrorText>{MESSAGES.loadFailed}</ErrorText>}

            {status === 'ready' && (
              <MetaList
                rows={[
                  { label: 'Status', value: items.length === 0 ? 'Empty' : 'Ready' },
                  { label: 'Registered', value: formatCount(items.length) },
                  ...('status' in section.defaults
                    ? [
                        {
                          label: 'In use',
                          value: formatCount(items.filter(item => item.status === 'active').length),
                        },
                      ]
                    : []),
                  { label: 'Last added', value: items.at(-1)?.name ?? '—' },
                ]}
              />
            )}

            {status === 'ready' && items.length === 0 && (
              <EmptyState
                title={`No ${section.singular} registered`}
                action={
                  <Button variant="primary" to={`/library/${kind}/new`}>
                    + Add {section.singular}
                  </Button>
                }
              >
                Your {section.title.toLowerCase()} will appear here. Register a {section.singular}{' '}
                to use it in Frame.
              </EmptyState>
            )}

            {items.length > 0 && (
              <>
                <div className={css.filters}>
                  {section.filters.map(filter => (
                    <FilterChips
                      key={filter.key}
                      label={filter.label}
                      showLabel
                      options={filter.options}
                      value={picks[filter.key] ?? ANY}
                      onChange={value =>
                        setPicked(previous => ({
                          kind,
                          values: {
                            ...(previous.kind === kind ? previous.values : {}),
                            [filter.key]: value,
                          },
                        }))
                      }
                    />
                  ))}
                </div>

                {shown.length === 0 && (
                  <EmptyState title="Nothing here">
                    No {section.singular} matches this view.
                  </EmptyState>
                )}

                {shown.length > 0 && (
                  <ul className={css.list}>
                    {shown.map(item => {
                      const label = optionLabel(section.fields, item);
                      // Rows outside current shooting are dimmed and say why at the end of the line.
                      const current = isCurrent(item);
                      // Ownership is a separate fact, so it gets its own tag whatever the status.
                      const tags = [
                        current ? '' : label(section.standingField),
                        item.ownership && item.ownership !== 'owned' ? label('ownership') : '',
                      ].filter(Boolean);
                      return (
                        <li key={item.id}>
                          <Link
                            to={`/library/${kind}/${item.id}`}
                            className={current ? css.row : `${css.row} ${css.rowDimmed}`}
                          >
                            <span className={css.rowHead}>
                              <span className={css.rowTitle}>{item.name}</span>
                              {tags.length > 0 && (
                                <span className={css.rowTags}>
                                  {tags.map(tag => (
                                    <span key={tag} className={`${labelText} ${css.rowTag}`}>
                                      {tag}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </span>
                            <span className={labelText}>{section.summary(item, label)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </Panel>
        )}
      </SignInGate>
    </PageShell>
  );
};
