import { useLocation, useNavigate } from 'react-router';

/**
 * Returns a function that leaves the current screen.
 * It goes back in history when the user arrived from inside the app, and to `fallback` when the
 * screen was opened directly (history back would then leave the app or land somewhere unrelated).
 * @param fallback path to go to when there is no in-app history
 * @returns a function that navigates away
 */
export const useGoBack = (fallback: string) => {
  const navigate = useNavigate();
  const { key } = useLocation();
  return () => void (key === 'default' ? navigate(fallback, { replace: true }) : navigate(-1));
};
