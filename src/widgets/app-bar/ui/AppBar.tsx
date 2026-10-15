import IconChevronLeftLine from '@karrotmarket/react-monochrome-icon/IconChevronLeftLine';
import { Icon } from '@seed-design/react';
import { Link, NavLink } from 'react-router';

import { AccountMenu } from '@/features/auth';
import { useGoBack } from '@/shared/lib/use-go-back';

import * as css from './AppBar.css';

const LINKS = [
  { to: '/frame', label: 'Frame' },
  { to: '/library', label: 'Gear' },
  { to: '/recipes', label: 'Recipes' },
];

type AppBarProps = {
  /** Fixes the bar to the top in the installed app on compact widths. */
  pinned?: boolean;
  /** The screen above this one, for Back when there is no in-app history to go back through. */
  back?: string;
  /** The screen's name, shown in place of the wordmark on compact widths. */
  title?: string;
};

/**
 * Title bar shared by every screen.
 * Wide screens show the wordmark, the main navigation and the account menu. Compact widths show
 * the screen's name (the wordmark on the front page) and, below the top level, a Back button; the
 * main navigation is the tab bar there, and the account lives on the Me screen.
 * @param props `pinned`, `back` and `title`, see {@link AppBarProps}
 */
export const AppBar = ({ pinned = false, back, title }: AppBarProps) => {
  const goBack = useGoBack(back ?? '/');

  return (
    <header className={pinned ? `${css.bar} ${css.pinnedBar}` : css.bar}>
      {/* Named "Back", not after the parent: it returns to the previous screen, which is not
          always the parent (a strip's recipe goes back to the strip). */}
      {back && (
        <button type="button" className={css.backButton} aria-label="Back" onClick={goBack}>
          <Icon svg={<IconChevronLeftLine />} size="x6" />
        </button>
      )}
      <p className={title ? `${css.title} ${css.titleBesideName}` : css.title}>
        <Link to="/" className={css.titleLink}>
          STOCKROLL
        </Link>
      </p>
      {title && (
        <p className={css.screenName} aria-hidden="true">
          {title}
        </p>
      )}

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
    </header>
  );
};
