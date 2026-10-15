import { Text } from '@seed-design/react';

import { Button } from '@/shared/ui/Button';
import { ErrorText } from '@/shared/ui/ErrorText';
import { MetaList } from '@/shared/ui/MetaList';
import { Panel } from '@/shared/ui/Panel';

import { useSession } from '../model/use-session';

/**
 * The account as a panel of its own, for the Me screen: who is signed in and a way out, or a way
 * in. The title bar's `AccountMenu` does the same on wide screens.
 */
export const AccountPanel = () => {
  const { state, error, signInWithGoogle, signOut } = useSession();

  if (state.status === 'loading') return null;

  return (
    <Panel
      title="Account"
      action={
        state.status === 'signed-in' ? (
          <Button size="small" onClick={() => void signOut()}>
            Sign out
          </Button>
        ) : (
          state.status === 'signed-out' && (
            <Button variant="primary" size="small" onClick={() => void signInWithGoogle()}>
              Sign in with Google
            </Button>
          )
        )
      }
    >
      {state.status === 'signed-in' ? (
        <MetaList rows={[{ label: 'Signed in as', value: state.email }]} />
      ) : (
        <Text as="p" textStyle="t4Regular" color="fg.neutralMuted">
          {state.status === 'unavailable'
            ? 'Sign-in is not set up on this build.'
            : 'Gear, films and recipes are saved to your account. Framing a photo works without one.'}
        </Text>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </Panel>
  );
};
