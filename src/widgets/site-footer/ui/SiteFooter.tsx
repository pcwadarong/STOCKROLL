import { labelText } from '@/shared/ui/label.css';
import { LegalNote } from '@/shared/ui/LegalNote';

import * as css from './SiteFooter.css';

/**
 * Footer with the legal links and the brand line. Shown on wide screens, on every screen except
 * the editor; on compact widths the Me screen carries the same content instead.
 */
export const SiteFooter = () => (
  <footer className={`${css.footer} ${labelText}`}>
    <LegalNote />
  </footer>
);
