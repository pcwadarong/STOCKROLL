import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * Turns the next in-app navigation into a full page load while `enabled`. Moving to another
 * screen drops that screen's state anyway, so loading the new release at that moment costs the
 * visitor nothing. Turning `enabled` on does not reload by itself; only a later navigation does.
 * @param enabled whether a newer release is waiting and nothing on the page needs to be kept
 */
export const useReloadOnNavigation = (enabled: boolean) => {
  const { key } = useLocation();
  const seen = useRef(key);

  // Before paint, so the old release's version of the new screen is not shown first.
  useLayoutEffect(() => {
    if (key === seen.current) return;
    seen.current = key;
    if (enabled) window.location.reload();
  }, [key, enabled]);
};
