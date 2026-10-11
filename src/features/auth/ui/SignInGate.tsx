import type { ReactNode } from 'react';

import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { Panel } from '@/shared/ui/Panel';

import { useSession } from '../model/use-session';

/**
 * Shows its children only to signed-in users. Everyone else gets a sign-in notice instead.
 * Framing needs no account; anything that is saved (gear, films, recipes) does.
 * @param props `what` names the gated thing for the notice's copy; children are the gated content
 */
export const SignInGate = ({ what, children }: { what: string; children: ReactNode }) => {
  const { state, error, signInWithGoogle } = useSession();

  if (state.status === 'signed-in') return children;
  if (state.status === 'loading') return null;

  const subject = `${what[0]?.toUpperCase()}${what.slice(1)}`;

  return (
    <Panel>
      <EmptyState
        title="Sign in required"
        action={
          state.status === 'signed-out' && (
            <Button variant="primary" onClick={() => void signInWithGoogle()}>
              Sign in with Google
            </Button>
          )
        }
      >
        {state.status === 'unavailable'
          ? `Sign-in is not set up on this build, so ${what} are unavailable.`
          : `${subject} are saved to your account. Sign in to register and use them. Framing a photo works without an account.`}
      </EmptyState>
      {error && <ErrorText>{error}</ErrorText>}
    </Panel>
  );
};
