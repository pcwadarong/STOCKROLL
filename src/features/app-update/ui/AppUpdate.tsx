import { Snackbar, useSnackbarAdapter } from '@seed-design/react';
import { useEffect, useRef, useState } from 'react';

import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

import { useAppUpdated } from '../model/use-app-updated';
import { useReloadOnNavigation } from '../model/use-reload-on-navigation';

// The largest delay setTimeout keeps (about 24 days); anything above it fires at once.
const UNTIL_ANSWERED = 2 ** 31 - 1;

type AppUpdateProps = {
  /** Something on the page would be lost by a reload, such as photos open in the editor. */
  holdReload: boolean;
};

/**
 * Brings the page up to the newest release. The service worker answers from its cache, so the
 * first visit after a deploy still shows the previous release. Once a newer one has taken over,
 * the next in-app navigation loads it. While `holdReload` is set, navigation is left alone and a
 * snackbar offers the reload instead, asking first because the reload loses that work.
 *
 * Needs a router and `Snackbar.RootProvider` above it; the notice renders in the snackbar region.
 * @param props whether a reload has to wait
 */
export const AppUpdate = ({ holdReload }: AppUpdateProps) => {
  const adapter = useSnackbarAdapter();
  const updated = useAppUpdated();
  const [asking, setAsking] = useState(false);
  // The snackbar's click handler is created once; it reads the current answer from here.
  const hold = useRef(holdReload);
  // The adapter changes whenever a snackbar opens or closes; without this a dismissed notice
  // would come straight back.
  const offered = useRef(false);

  useEffect(() => {
    hold.current = holdReload;
  }, [holdReload]);

  useReloadOnNavigation(updated && !holdReload);

  useEffect(() => {
    if (!updated || !holdReload || offered.current) return;
    offered.current = true;
    adapter.create({
      timeout: UNTIL_ANSWERED,
      render: () => (
        <Snackbar.Root>
          <Snackbar.Content>
            <Snackbar.Message>A new version is ready.</Snackbar.Message>
            <Snackbar.ActionButton
              onClick={() => (hold.current ? setAsking(true) : window.location.reload())}
            >
              Reload
            </Snackbar.ActionButton>
          </Snackbar.Content>
          <Snackbar.HiddenCloseButton>Dismiss</Snackbar.HiddenCloseButton>
        </Snackbar.Root>
      ),
    });
  }, [adapter, updated, holdReload]);

  return (
    <ConfirmDialog
      open={asking}
      onOpenChange={setAsking}
      title="Reload now?"
      actions={[{ label: 'Reload', primary: true, onSelect: () => window.location.reload() }]}
    >
      The photos open in the editor will close. The files stay on your device, so you can open them
      again.
    </ConfirmDialog>
  );
};
