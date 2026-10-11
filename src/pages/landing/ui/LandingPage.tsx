import { Link } from 'react-router';

import { Button } from '@/shared/ui/Button';
import { PageShell } from '@/widgets/page-shell';

import * as css from './LandingPage.css';

const SECTIONS = [
  {
    to: '/frame',
    title: 'Frame',
    body: 'Add camera, lens and exposure to a finished photo. Export for any ratio without cropping.',
  },
  {
    to: '/library',
    title: 'Gear',
    body: 'Keep every camera, lens and film you have shot — in use, in repair or on the shelf.',
  },
  {
    to: '/recipes',
    title: 'Recipes',
    body: 'Store your film simulation recipes and tweak them without losing the original.',
  },
];

/** Front page: the wordmark, what the app is in one breath, and an index of where to go. */
export const LandingPage = () => (
  <PageShell wide>
    <section className={css.hero}>
      <p className={css.overline}>Analog / Film / Everyday</p>
      <h1 className={css.wordmark}>STOCKROLL</h1>
      <p className={css.tagline}>
        <span>Good light</span>
        <span>Good film</span>
        <span>Good days</span>
      </p>
      <Button variant="primary" to="/frame">
        Open the frame editor
      </Button>
    </section>

    <ul className={css.index}>
      {SECTIONS.map(({ to, title, body }) => (
        <li key={to}>
          <Link to={to} className={css.row}>
            <h2 className={css.rowTitle}>{title}</h2>
            <p className={css.rowBody}>{body}</p>
            <span className={css.arrow} aria-hidden="true">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </PageShell>
);
