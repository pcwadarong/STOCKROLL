import type { ReactNode } from 'react';

import { AppBar } from '@/widgets/app-bar';
import { SiteFooter } from '@/widgets/site-footer';
import { TabBar } from '@/widgets/tab-bar';

import * as css from './PageShell.css';

type PageShellProps = {
  /** Widens the content column. */
  wide?: boolean;
  /** The screen above this one, for the app bar's Back. Leave it out on top-level screens. */
  back?: string;
  /** The screen's name in the app bar on compact widths. Leave it out on the front page. */
  title?: string;
  /** Shows the tab bar on compact widths. Off for forms, which end with their own Save or Cancel. */
  tabs?: boolean;
  children: ReactNode;
};

/**
 * Standard screen frame: app bar on top, scrolling content column, footer at the bottom on wide
 * screens and the tab bar at the bottom on compact ones.
 * @param props `wide`, `back`, `title`, `tabs` (see {@link PageShellProps}) and the screen's content
 */
export const PageShell = ({ wide = false, back, title, tabs = true, children }: PageShellProps) => (
  <div className={css.page}>
    <AppBar pinned back={back} title={title} />
    <div className={css.scroller}>
      <main className={wide ? `${css.content} ${css.wide}` : css.content}>{children}</main>
      <SiteFooter />
    </div>
    {tabs && <TabBar />}
  </div>
);
