import IconBookOpenFill from '@karrotmarket/react-monochrome-icon/IconBookOpenFill';
import IconCameraFill from '@karrotmarket/react-monochrome-icon/IconCameraFill';
import IconHouseFill from '@karrotmarket/react-monochrome-icon/IconHouseFill';
import IconPersonFill from '@karrotmarket/react-monochrome-icon/IconPersonFill';
import IconPictureFill from '@karrotmarket/react-monochrome-icon/IconPictureFill';
import { Icon, Snackbar } from '@seed-design/react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';

import * as css from './TabBar.css';

const TABS = [
  { to: '/', label: 'Home', icon: <IconHouseFill />, end: true },
  { to: '/frame', label: 'Frame', icon: <IconPictureFill />, end: false },
  { to: '/library', label: 'Gear', icon: <IconCameraFill />, end: false },
  { to: '/recipes', label: 'Recipes', icon: <IconBookOpenFill />, end: false },
  { to: '/me', label: 'Me', icon: <IconPersonFill />, end: false },
];

/** The tab `pathname` belongs to, the way `NavLink` marks it current; -1 for none. */
const tabOf = (pathname: string) =>
  TABS.findIndex(({ to, end }) =>
    end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`),
  );

// Every screen renders its own bar, so a new one mounts on each tab change. The indicator starts
// where the last bar left it and slides over from there.
let lastShown = -1;

/**
 * The main navigation on compact widths: five tabs along the bottom edge, after SEED's Bottom
 * Navigation guideline (filled icon and label, a hairline on top). A rule over the current tab
 * slides to the next one. Wide screens keep the navigation in the app bar and show nothing here.
 * Screens that finish with their own Save or Cancel (forms, the recipe card) leave it out.
 */
export const TabBar = () => {
  const current = tabOf(useLocation().pathname);
  const [shown, setShown] = useState(lastShown === -1 ? current : lastShown);

  useEffect(() => {
    if (current === -1) return;
    lastShown = current;
    // A frame after mounting, so the indicator is drawn at its old place first and then moves.
    const frame = requestAnimationFrame(() => setShown(current));
    return () => cancelAnimationFrame(frame);
  }, [current]);

  return (
    // Keeps a notice above the bar instead of over the tabs.
    <Snackbar.AvoidOverlap>
      <nav className={css.bar} aria-label="Main">
        <div className={css.tabs}>
          {TABS.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end} className={css.tab}>
              <Icon svg={icon} size="x6" />
              {label}
            </NavLink>
          ))}
          <span
            className={css.indicator}
            aria-hidden="true"
            style={{
              width: `${100 / TABS.length}%`,
              transform: `translateX(${Math.max(shown, 0) * 100}%)`,
              opacity: current === -1 ? 0 : 1,
            }}
          />
        </div>
      </nav>
    </Snackbar.AvoidOverlap>
  );
};
