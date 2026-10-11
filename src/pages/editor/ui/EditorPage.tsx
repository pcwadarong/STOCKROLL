import { FrameEditor } from '@/features/frame-photo';
import { AppBar } from '@/widgets/app-bar';

import * as css from './EditorPage.css';

/** Frame editing screen. Composes the app bar and the editor. */
export const EditorPage = () => (
  <div className={css.page}>
    <AppBar />
    <FrameEditor />
  </div>
);
