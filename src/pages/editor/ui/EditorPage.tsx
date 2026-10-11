import { useSession } from '@/features/auth';
import { FrameEditor } from '@/features/frame-photo';
import { AppBar } from '@/widgets/app-bar';

import * as css from './EditorPage.css';

/** Frame editing screen. Composes the app bar and the editor, and tells it whether anyone is signed in. */
export const EditorPage = () => {
  const { state } = useSession();
  return (
    <div className={css.page}>
      <AppBar />
      <FrameEditor signedIn={state.status === 'signed-in'} />
    </div>
  );
};
