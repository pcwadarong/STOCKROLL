import { Fragment } from 'react';

import * as css from './MetaList.css';

/**
 * Formats a count with two digits, as on a frame counter.
 * @param value number of items
 * @returns the number padded to two digits, e.g. 0 → "00"
 */
export const formatCount = (value: number) => String(value).padStart(2, '0');

/**
 * Label/value rows summarizing a collection, catalog style.
 * @param props rows to show, in order
 */
export const MetaList = ({ rows }: { rows: readonly { label: string; value: string }[] }) => (
  <dl className={css.root}>
    {rows.map(({ label, value }) => (
      <Fragment key={label}>
        <dt className={css.label}>{label}</dt>
        <dd className={css.value}>{value}</dd>
      </Fragment>
    ))}
  </dl>
);
