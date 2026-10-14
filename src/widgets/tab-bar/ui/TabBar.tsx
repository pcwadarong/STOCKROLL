import { NavLink } from 'react-router';

import * as css from './TabBar.css';

const TABS = [
  { to: '/', label: 'Home', end: true },
  { to: '/frame', label: 'Frame', end: false },
  { to: '/library', label: 'Gear', end: false },
  { to: '/recipes', label: 'Recipes', end: false },
  { to: '/me', label: 'Me', end: false },
];

/**
 * The main navigation on compact widths: one row of tabs along the bottom edge. Wide screens keep
 * the navigation in the app bar and show nothing here. Screens that finish with their own Save or
 * Cancel (forms, the recipe card) leave it out.
 */
export const TabBar = () => (
  <nav className={css.bar} aria-label="Main">
    {TABS.map(({ to, label, end }) => (
      <NavLink key={to} to={to} end={end} className={css.tab}>
        {label}
      </NavLink>
    ))}
  </nav>
);
