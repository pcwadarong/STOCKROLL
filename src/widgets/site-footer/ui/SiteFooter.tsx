import { Link } from 'react-router';

import { labelText } from '@/shared/ui/label.css';

import * as css from './SiteFooter.css';

/** Footer with the legal links and the brand line. Shown on every screen except the editor. */
export const SiteFooter = () => (
  <footer className={`${css.footer} ${labelText}`}>
    <span>© 2026 STOCKROLL — Film, camera, print and good days</span>
    <nav className={css.links} aria-label="Legal">
      <Link to="/privacy" className={css.link}>
        Privacy
      </Link>
      <Link to="/terms" className={css.link}>
        Terms
      </Link>
    </nav>
  </footer>
);
