import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Resolves once `worker` has finished activating (or been replaced). */
const settled = (worker: ServiceWorker) =>
  new Promise<void>(resolve => {
    const done = () => worker.state === 'activated' || worker.state === 'redundant';
    if (done()) return resolve();
    const onChange = () => {
      if (!done()) return;
      worker.removeEventListener('statechange', onChange);
      resolve();
    };
    worker.addEventListener('statechange', onChange);
  });

/**
 * Whether the service worker cache no longer holds the script this page runs from. A new worker
 * deletes the previous release's files while it activates, so the check waits for that to finish;
 * a takeover is announced before it does. Hashed files are cached under their own URL, which
 * `import.meta.url` gives back.
 */
const isRunningOldRelease = async () => {
  const worker = navigator.serviceWorker?.controller;
  if (!worker || !('caches' in window)) return false;
  await settled(worker);
  return (await caches.match(import.meta.url)) === undefined;
};

/** Calls `mark` when the page runs an old release. */
const markIfOld = (mark: () => void) => {
  void isRunningOldRelease().then(old => {
    if (old) mark();
  });
};

/**
 * Registers the service worker and tells whether a newer release has taken over the page.
 *
 * The worker takes over on its own (`registerType: 'autoUpdate'`); this hook only keeps the page
 * from reloading itself, since an opened photo lives only in memory. The plugin's own signal
 * misses a release that installs while the page is still loading (a reload checks for a new
 * worker before this script runs), so the cache is also checked on mount and on every takeover.
 *
 * @returns `true` once the page is running a release older than the active service worker.
 */
export const useAppUpdated = () => {
  const [updated, setUpdated] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);

  useRegisterSW({
    // Given this, the plugin calls it instead of reloading the page.
    onNeedReload: () => markIfOld(() => setUpdated(true)),
    onRegisteredSW: (_url, registered) => {
      registration.current = registered;
    },
  });

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const check = () => markIfOld(() => setUpdated(true));
    // Browsers look for a new worker only on navigation. An installed app brought back to the
    // front is not navigated, so look again whenever the page becomes visible.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void registration.current?.update();
      check();
    };
    check();
    navigator.serviceWorker.addEventListener('controllerchange', check);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', check);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return updated;
};
