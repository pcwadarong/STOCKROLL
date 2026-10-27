import { Snackbar, useSnackbarAdapter } from '@seed-design/react';
import { useEffect, useRef } from 'react';

import { useAppUpdated } from '../model/use-app-updated';

// The largest delay setTimeout keeps (about 24 days); anything above it fires at once.
const UNTIL_ANSWERED = 2 ** 31 - 1;

/**
 * Offers a reload once a newer release has taken over. The service worker answers from its cache,
 * so the first visit after a deploy still shows the previous release. Reloading is left to the
 * visitor because an opened photo lives only in memory and a reload clears it.
 *
 * Renders nothing itself; the notice goes to the snackbar region, so it needs
 * `Snackbar.RootProvider` above it.
 */
export const UpdateNotice = () => {
  const adapter = useSnackbarAdapter();
  const updated = useAppUpdated();
  // The adapter changes whenever a snackbar opens or closes; without this a dismissed notice
  // would come straight back.
  const offered = useRef(false);

  useEffect(() => {
    if (!updated || offered.current) return;
    offered.current = true;
    adapter.create({
      timeout: UNTIL_ANSWERED,
      render: () => (
        <Snackbar.Root>
          <Snackbar.Content>
            <Snackbar.Message>A new version is ready.</Snackbar.Message>
            <Snackbar.ActionButton onClick={() => window.location.reload()}>
              Reload
            </Snackbar.ActionButton>
          </Snackbar.Content>
          <Snackbar.HiddenCloseButton>Dismiss</Snackbar.HiddenCloseButton>
        </Snackbar.Root>
      ),
    });
  }, [adapter, updated]);

  return null;
};
