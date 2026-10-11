import { Text } from '@seed-design/react';

import { Button } from '@/shared/ui/Button';

import { useSession } from '../model/use-session';

import * as css from './AccountMenu.css';

/**
 * Sign-in entry point for the title bar.
 * Shows a Google sign-in button when signed out, and the account email with a sign-out button
 * when signed in. Renders nothing when Supabase is not configured or the session is still loading.
 */
export const AccountMenu = () => {
  const { state, error, signInWithGoogle, signOut } = useSession();

  if (state.status === 'unavailable' || state.status === 'loading') return null;

  return (
    <div className={css.root}>
      {error && (
        <Text role="alert" textStyle="t3Regular">
          {error}
        </Text>
      )}
      {state.status === 'signed-in' ? (
        <>
          <Text className={css.email} textStyle="t3Regular">
            {state.email}
          </Text>
          <Button variant="inverse" size="small" onClick={() => void signOut()}>
            Sign out
          </Button>
        </>
      ) : (
        <Button
          variant="inverse"
          size="small"
          aria-label="Sign in with Google"
          onClick={() => void signInWithGoogle()}
        >
          Sign in
        </Button>
      )}
    </div>
  );
};
