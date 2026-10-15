import { AccountPanel } from '@/features/auth';
import { LegalNote } from '@/shared/ui/LegalNote';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import { PageShell } from '@/widgets/page-shell';

import * as css from './MePage.css';

/**
 * The user's own screen: the account, and the legal links that the site footer carries on wide
 * screens (the footer is hidden on compact widths, where this screen is a tab).
 */
export const MePage = () => (
  <PageShell title="Me">
    <PageHeader title="Me" />
    <AccountPanel />
    <Panel title="About">
      <div className={css.legal}>
        <LegalNote />
      </div>
    </Panel>
  </PageShell>
);
