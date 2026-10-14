import { useEffect, useState } from 'react';

/**
 * Tells whether the page has scrolled further down than `offset` pixels.
 * When the page would end within `shrink` pixels after that point it reads as not scrolled: what
 * the caller does on scrolling (folding a pinned preview) makes the page that much shorter, and
 * a page too short for it would fold, lose its scroll, unfold, and so on.
 * @param offset scroll distance in CSS pixels past which the page counts as scrolled
 * @param shrink how many CSS pixels the page loses once it counts as scrolled
 * @returns true while the page is scrolled past `offset`
 */
export const useScrolledPast = (offset: number, shrink = 0) => {
  const [past, setPast] = useState(false);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const { scrollHeight } = document.documentElement;
      const room = scrollHeight - window.innerHeight;
      setPast(previous => window.scrollY > offset && (previous || room - shrink > offset + 1));
    };
    // At most one reading per frame, however many scroll events arrive.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [offset, shrink]);

  return past;
};
