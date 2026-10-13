import { NavLink } from 'react-router';

import * as css from './LibraryPage.css';

const TABS = [
  { to: '/recipes', label: 'Recipes' },
  { to: '/recipes/rolls', label: 'Rolls' },
];

/** Switches between the recipe list and the rolls built from it. */
export const RecipeTabs = () => (
  <nav className={css.tabs} aria-label="Recipes and rolls">
    {TABS.map(({ to, label }) => (
      <NavLink key={to} to={to} end className={css.tab}>
        {label}
      </NavLink>
    ))}
  </nav>
);
