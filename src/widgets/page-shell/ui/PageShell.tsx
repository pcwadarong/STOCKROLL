import type { ReactNode } from 'react';

import { AppBar } from '@/widgets/app-bar';
import { SiteFooter } from '@/widgets/site-footer';

import * as css from './PageShell.css';

/**
 * Standard screen frame: app bar on top, scrolling content column, footer at the bottom on wide
 * screens.
 * @param props `wide` widens the content column; `back` is the screen above this one, for the app
 * bar's Back button (leave it out on top-level screens); children are the screen's content
 */
export const PageShell = ({
  wide = false,
  back,
  children,
}: {
  wide?: boolean;
  back?: string;
  children: ReactNode;
}) => (
  <div className={css.page}>
    <AppBar pinned back={back} />
    <div className={css.scroller}>
      <main className={wide ? `${css.content} ${css.wide}` : css.content}>{children}</main>
      <SiteFooter />
    </div>
  </div>
);
