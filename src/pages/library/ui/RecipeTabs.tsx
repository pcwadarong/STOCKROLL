import { NavLink } from 'react-router';

import * as css from './LibraryPage.css';

const TABS = [
  { to: '/recipes', label: 'Recipes' },
  { to: '/recipes/strips', label: 'Strips' },
];

/** Switches between the recipe list and the strips built from it. */
export const RecipeTabs = () => (
  <nav className={css.tabs} aria-label="Recipes and strips">
    {TABS.map(({ to, label }) => (
      <NavLink key={to} to={to} end className={css.tab}>
        {label}
      </NavLink>
    ))}
  </nav>
);
