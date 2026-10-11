import type { ReactNode } from 'react';

import { Button } from '@/shared/ui/Button';
import { ErrorText } from '@/shared/ui/ErrorText';
import { card, labelText } from '@/shared/ui/label.css';

import { useSession } from '../model/use-session';

import * as css from './SignInGate.css';

/**
 * Shows its children only to signed-in users. Everyone else gets a sign-in card instead.
 * Framing needs no account; anything that is saved (gear, films, recipes) does.
 * @param props `what` names the gated thing for the card's copy; children are the gated content
 */
export const SignInGate = ({ what, children }: { what: string; children: ReactNode }) => {
  const { state, error, signInWithGoogle } = useSession();

  if (state.status === 'signed-in') return children;
  if (state.status === 'loading') return null;

  return (
    <section className={`${card} ${css.root}`}>
      <p className={`${labelText} ${css.title}`}>Sign in required</p>
      <p className={css.body}>
        {state.status === 'unavailable'
          ? `Sign-in is not set up on this build, so ${what} are unavailable.`
          : `${what[0]?.toUpperCase()}${what.slice(1)} are saved to your account. Sign in to register and use them. Framing a photo works without an account.`}
      </p>
      {error && <ErrorText>{error}</ErrorText>}
      <div className={css.actions}>
        {state.status === 'signed-out' && (
          <Button variant="primary" onClick={() => void signInWithGoogle()}>
            Sign in with Google
          </Button>
        )}
      </div>
    </section>
  );
};
