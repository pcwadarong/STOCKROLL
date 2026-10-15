import { useSession } from '@/features/auth';
import { FrameEditor } from '@/features/frame-photo';
import * as css from '@/shared/ui/workbench.css';
import { AppBar } from '@/widgets/app-bar';
import { TabBar } from '@/widgets/tab-bar';

/**
 * Frame editing screen. Composes the app bar, the editor and the tab bar, and tells the editor
 * whether anyone is signed in.
 */
export const EditorPage = () => {
  const { state } = useSession();
  return (
    <div className={css.page}>
      <AppBar title="Frame" />
      <FrameEditor signedIn={state.status === 'signed-in'} />
      <TabBar />
    </div>
  );
};
