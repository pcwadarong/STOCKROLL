import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import { AccountMenu } from '@/features/auth';
import { COMPACT_MEDIA_QUERY } from '@/shared/config/responsive';
import { useGoBack } from '@/shared/lib/use-go-back';
import { LegalNote } from '@/shared/ui/LegalNote';

import * as css from './AppBar.css';

const LINKS = [
  { to: '/frame', label: 'Frame' },
  { to: '/library', label: 'Gear' },
  { to: '/recipes', label: 'Recipes' },
];

/**
 * Title bar shared by every screen: wordmark, main navigation and the account menu.
 * On compact widths the navigation moves into a side drawer opened by a menu button, and a screen
 * below the top level shows a Back button in place of the wordmark.
 * @param props `pinned` fixes the bar to the top in the installed app on compact widths; `back` is
 * the screen above this one, used when there is no in-app history to go back through
 */
export const AppBar = ({ pinned = false, back }: { pinned?: boolean; back?: string }) => {
  const drawerRef = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();
  const goBack = useGoBack(back ?? '/');

  // Following a link inside the drawer changes the route; close the drawer when that happens.
  useEffect(() => drawerRef.current?.close(), [pathname]);

  // The drawer only exists for compact widths. If the window grows until the inline menu is back,
  // an open drawer would duplicate it, so close it.
  useEffect(() => {
    const compact = window.matchMedia(COMPACT_MEDIA_QUERY);
    const onChange = () => !compact.matches && drawerRef.current?.close();
    compact.addEventListener('change', onChange);
    return () => compact.removeEventListener('change', onChange);
  }, []);

  return (
    <header className={pinned ? `${css.bar} ${css.pinnedBar}` : css.bar}>
      {/* Labelled "Back", not with the parent's name: it returns to the previous screen, which is
          not always the parent (a strip's recipe goes back to the strip). */}
      {back && (
        <button type="button" className={`${css.menuButton} ${css.backButton}`} onClick={goBack}>
          <span aria-hidden="true">←</span>
          Back
        </button>
      )}
      <p className={back ? `${css.title} ${css.titleBesideBack}` : css.title}>
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
          {/* The bar's wordmark gives way to Back below the top level, so the way home is here. */}
          <Link to="/" className={`${css.title} ${css.titleLink}`}>
            STOCKROLL
          </Link>
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
          {/* The site footer is hidden on compact widths; its content lives here instead. */}
          <div className={css.drawerLegal}>
            <LegalNote />
          </div>
        </div>
      </dialog>
    </header>
  );
};
