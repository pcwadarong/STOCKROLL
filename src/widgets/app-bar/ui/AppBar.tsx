import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import { AccountMenu } from '@/features/auth';

import * as css from './AppBar.css';

const LINKS = [
  { to: '/frame', label: 'Frame' },
  { to: '/library', label: 'Gear' },
  { to: '/recipes', label: 'Recipes' },
];

/**
 * Title bar shared by every screen: wordmark, main navigation and the account menu.
 * On compact widths the navigation moves into a side drawer opened by a menu button.
 */
export const AppBar = () => {
  const drawerRef = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();

  // Following a link inside the drawer changes the route; close the drawer when that happens.
  useEffect(() => drawerRef.current?.close(), [pathname]);

  return (
    <header className={css.bar}>
      <p className={css.title}>
        <Link to="/" className={css.titleLink}>
          STOCKROLL
        </Link>
      </p>

      <div className={css.inline}>
        <nav className={css.nav} aria-label="Main">
          {LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={css.link}>
              {label}
            </NavLink>
          ))}
        </nav>
        <AccountMenu />
      </div>

      <button
        type="button"
        className={css.menuButton}
        aria-haspopup="dialog"
        onClick={() => drawerRef.current?.showModal()}
      >
        <span className={css.menuIcon} aria-hidden="true" />
        Menu
      </button>

      {/* A native modal dialog gives focus trapping, Escape to close and a backdrop for free.
          The click handler only adds backdrop dismissal for pointer users; keyboard users already
          have Escape and the Close button, so no key handler is missing. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={drawerRef}
        className={css.drawer}
        aria-label="Menu"
        // Clicking the backdrop lands on the dialog element itself, not on its content.
        onClick={event => event.target === event.currentTarget && event.currentTarget.close()}
      >
        <div className={css.drawerHead}>
          <span className={css.title}>STOCKROLL</span>
          <button
            type="button"
            className={css.menuButton}
            onClick={() => drawerRef.current?.close()}
          >
            Close
          </button>
        </div>
        <nav className={css.drawerNav} aria-label="Main">
          {LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={css.drawerLink}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={css.drawerFoot}>
          <AccountMenu />
        </div>
      </dialog>
    </header>
  );
};
