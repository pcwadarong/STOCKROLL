import { Text } from '@seed-design/react';
import { Fragment, useState } from 'react';
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
import type { Collection, Row } from '@/shared/api/collection';
import {
  missingRequired,
  normalizeRecord,
  type RecordField,
  type RecordValues,
} from '@/shared/lib/record-field';
import { useCollection } from '@/shared/lib/use-collection';
import { useGoBack } from '@/shared/lib/use-go-back';
import { Button } from '@/shared/ui/Button';
import { card, labelText } from '@/shared/ui/label.css';
import { RecordForm } from '@/shared/ui/RecordForm';
import { PageShell } from '@/widgets/page-shell';
import { Callout } from 'seed-design/ui/callout';

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

type MetaRow = { label: string; value: string };

/** Two-digit counter, as on a frame counter: 0 → "00". */
export const count = (value: number) => String(value).padStart(2, '0');

/** Label/value rows shown above a list, catalog style. */
export const MetaList = ({ rows }: { rows: readonly MetaRow[] }) => (
  <dl className={`${css.meta} ${labelText}`}>
    {rows.map(({ label, value }) => (
      <Fragment key={label}>
        <dt className={css.metaLabel}>{label}</dt>
        <dd className={css.metaValue}>{value}</dd>
      </Fragment>
    ))}
  </dl>
);

type GearFormProps = {
  section: Section;
  initial: RecordValues;
  onSave: (values: RecordValues) => Promise<unknown>;
  onDone: () => void;
};

const GearForm = ({ section, initial, onSave, onDone }: GearFormProps) => {
  const [values, setValues] = useState<RecordValues>(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const normalized = normalizeRecord(section.fields, values);
    const missing = missingRequired(section.fields, normalized);
    if (missing.length > 0) return setError(`Fill in: ${missing.join(', ')}`);

    setSaving(true);
    setError('');
    try {
      await onSave({ ...values, ...normalized });
      onDone();
    } catch {
      setError('Could not save. Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <>
      {error && <Callout tone="critical" role="alert" description={error} />}
      <RecordForm
        fields={section.fields}
        values={values}
        onChange={(key, value) => setValues(prev => ({ ...prev, [key]: value }))}
      />
      <div className={css.actions}>
        <Button onClick={onDone}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={() => void submit()}>
          Save {section.singular}
        </Button>
      </div>
    </>
  );
};

/**
 * Gear library: lists registered cameras, lenses and films, and hosts the form for adding or
 * editing one. Gear is never deleted — past photos refer to it — so status is changed instead.
 */
export const LibraryPage = () => {
  const { kind = 'cameras', id } = useParams();
  const goBack = useGoBack(`/library/${kind}`);
  const section = SECTIONS[kind] ?? SECTIONS.cameras!;
  const { items, status, save } = useCollection(section.collection);

  const editing = id !== undefined;
  const current = id && id !== 'new' ? items.find(item => item.id === id) : undefined;
  const waitingForItem = editing && id !== 'new' && !current;

  return (
    <PageShell>
      <div className={css.intro}>
        <h1 className={css.heading}>Gear log</h1>
        <Text as="p" color="fg.neutralMuted">
          Cameras, lenses and films you have shot with.
        </Text>
      </div>

      <nav className={css.tabs} aria-label="Gear type">
        {Object.entries(SECTIONS).map(([key, { title }], index) => (
          <NavLink key={key} to={`/library/${key}`} className={css.tab}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            {title}
          </NavLink>
        ))}
      </nav>

      <section className={`${card} ${css.panel}`}>
        {editing ? (
          <>
            <div className={css.header}>
              <h2 className={`${labelText} ${css.panelTitle}`}>
                {id === 'new' ? `Add ${section.singular}` : `Edit ${section.singular}`}
              </h2>
            </div>
            {waitingForItem ? (
              <Text as="p" color="fg.neutralMuted" aria-live="polite">
                {status === 'loading' ? 'Loading…' : 'This item no longer exists.'}
              </Text>
            ) : (
              <GearForm
                key={`${kind}:${id}`}
                section={section}
                initial={current ?? section.defaults}
                onSave={values => save(values as GearRow)}
                onDone={goBack}
              />
            )}
          </>
        ) : (
          <>
            <div className={css.header}>
              <h2 className={`${labelText} ${css.panelTitle}`}>{section.title}</h2>
              {items.length > 0 && (
                <Button variant="primary" size="small" to={`/library/${kind}/new`}>
                  + Add {section.singular}
                </Button>
              )}
            </div>

            {status === 'error' && (
              <Callout tone="critical" role="alert" description="Could not load. Try again." />
            )}
            {status === 'ready' && (
              <MetaList
                rows={[
                  { label: 'Status', value: items.length === 0 ? 'Empty' : 'Ready' },
                  { label: 'Registered', value: count(items.length) },
                  ...('status' in section.defaults
                    ? [
                        {
                          label: 'In use',
                          value: count(items.filter(item => item.status === 'active').length),
                        },
                      ]
                    : []),
                  { label: 'Last added', value: items.at(-1)?.name ?? '—' },
                ]}
              />
            )}

            {status === 'ready' && items.length === 0 && (
              <div className={css.empty}>
                <p className={`${labelText} ${css.panelTitle}`}>No {section.singular} registered</p>
                <Text as="p" color="fg.neutralMuted">
                  Your {section.title.toLowerCase()} will appear here. Register a {section.singular}{' '}
                  to use it in Frame.
                </Text>
                <Button variant="primary" to={`/library/${kind}/new`}>
                  + Add {section.singular}
                </Button>
              </div>
            )}

            {items.length > 0 && (
              <ul className={css.list}>
                {items.map(item => (
                  <li key={item.id}>
                    <Link to={`/library/${kind}/${item.id}`} className={css.row}>
                      <Text textStyle="t5Bold">{item.name}</Text>
                      <span className={labelText}>
                        {section.summary(item, optionLabel(section.fields, item))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </PageShell>
  );
};
