import { useNavigate } from 'react-router';

// React Router numbers the app's own history entries in `history.state.idx`, starting at 0 on the
// entry the app was opened on. A replace keeps the number, so a screen that replaced the first
// entry still knows there is nothing of the app behind it. (`location.key` is 'default' only until
// the first replace.)
const historyIndex = () => {
  const { idx } = (window.history.state ?? {}) as { idx?: number };
  return typeof idx === 'number' ? idx : 0;
};

/**
 * Returns a function that leaves the current screen.
 * It goes back in history when the user arrived from inside the app, and to `fallback` when the
 * screen was opened directly (history back would then leave the app or land somewhere unrelated).
 * @param fallback path to go to when there is no in-app history
 * @returns a function that navigates away
 */
export const useGoBack = (fallback: string) => {
  const navigate = useNavigate();
  return () => void (historyIndex() > 0 ? navigate(-1) : navigate(fallback, { replace: true }));
};

/**
 * Returns a function that leaves a saved edit form for the record's screen it was opened from.
 * The form's entry is dropped and the record's screen takes the place of the one behind it, so
 * history does not hold that screen twice in a row and Back leaves it in one step. Opened
 * directly, the form is replaced by the record's screen.
 * @returns a function taking the record's path
 */
export const useReplaceEdit = () => {
  const navigate = useNavigate();
  return (path: string) => {
    if (historyIndex() === 0) return void navigate(path, { replace: true });
    // The screen behind may show an older state of the record (`?v=` of the version edited), so
    // it is replaced once history has stepped back onto it.
    window.addEventListener('popstate', () => void navigate(path, { replace: true }), {
      once: true,
    });
    void navigate(-1);
  };
};
