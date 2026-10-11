import { useState } from 'react';
import { Link, NavLink, useParams } from 'react-router';

import {
  CAMERA_DEFAULTS,
  CAMERA_FIELDS,
  cameraCollection,
  FILM_DEFAULTS,
  FILM_FIELDS,
  filmCollection,
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
};

const SECTIONS: Record<string, Section> = {
  cameras: {
    title: 'Cameras',
    singular: 'camera',
    collection: cameraCollection as unknown as Collection<GearRow>,
    fields: CAMERA_FIELDS,
    defaults: CAMERA_DEFAULTS,
    summary: (_item, label) => [label('kind'), label('ownership'), label('status')].join(' · '),
  },
  lenses: {
    title: 'Lenses',
    singular: 'lens',
    collection: lensCollection as unknown as Collection<GearRow>,
    fields: LENS_FIELDS,
    defaults: LENS_DEFAULTS,
    summary: (item, label) =>
      [item.mount, label('ownership'), label('status')].filter(Boolean).join(' · '),
  },
  films: {
    title: 'Films',
    singular: 'film',
    collection: filmCollection as unknown as Collection<GearRow>,
    fields: FILM_FIELDS,
    defaults: FILM_DEFAULTS,
    summary: (item, label) =>
      [item.format, item.iso ? `ISO ${item.iso}` : '', label('kind'), label('usage')]
        .filter(Boolean)
        .join(' · '),
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
      await onDelete();
      onDone();
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
 * Gear library: lists registered cameras, lenses and films, and hosts the form for adding or
 * editing one. Gear you no longer use keeps its place in the record: change its status rather
 * than deleting it. Delete exists for entries made by mistake.
 */
export const LibraryPage = () => {
  const { kind = 'cameras', id } = useParams();
  const goBack = useGoBack(`/library/${kind}`);
  const section = SECTIONS[kind] ?? SECTIONS.cameras!;
  const { items, status, save, remove } = useCollection(section.collection);

  const editing = id !== undefined;
  const current = id && id !== 'new' ? items.find(item => item.id === id) : undefined;
  const waitingForItem = editing && id !== 'new' && !current;

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
        {editing ? (
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
                onDelete={current ? () => remove(current.id) : undefined}
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
              <ul className={css.list}>
                {items.map(item => (
                  <li key={item.id}>
                    <Link to={`/library/${kind}/${item.id}`} className={css.row}>
                      <span className={css.rowTitle}>{item.name}</span>
                      <span className={labelText}>
                        {section.summary(item, optionLabel(section.fields, item))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </SignInGate>
    </PageShell>
  );
};
