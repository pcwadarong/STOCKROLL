import { Link } from 'react-router';

import * as css from './LegalNote.css';

/**
 * The brand line and the legal links, as two siblings with no box of their own. The site footer
 * shows them on wide screens and the menu drawer on compact ones; each lays them out and sets the
 * color and type.
 */
export const LegalNote = () => (
  <>
    <span>© 2026 STOCKROLL — Film, camera, print and good days</span>
    <nav className={css.links} aria-label="Legal">
      <Link to="/privacy" className={css.link}>
        Privacy
      </Link>
      <Link to="/terms" className={css.link}>
        Terms
      </Link>
    </nav>
  </>
);
