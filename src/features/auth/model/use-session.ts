import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/shared/api/supabase';

export type SessionState =
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; email: string };

const toState = (session: Session | null): SessionState =>
  session ? { status: 'signed-in', email: session.user.email ?? '' } : { status: 'signed-out' };

/**
 * Tracks the current Supabase session.
 * Framing works without an account, so `unavailable` (no Supabase env) is a normal state, not an error.
 * @returns the session state plus sign-in and sign-out actions
 */
export const useSession = () => {
  const [state, setState] = useState<SessionState>(
    supabase ? { status: 'loading' } : { status: 'unavailable' },
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    // Fires once with the initial session, then on every sign-in, sign-out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(toState(session));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  /** Starts the Google OAuth redirect. The page navigates away on success. */
  const signInWithGoogle = async () => {
    if (!supabase) return;
    setError('');
    const { error: failure } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (failure) setError('Sign-in failed. Please try again.');
  };

  /** Signs out on this device only. */
  const signOut = async () => {
    if (!supabase) return;
    setError('');
    const { error: failure } = await supabase.auth.signOut({ scope: 'local' });
    if (failure) setError('Sign-out failed. Please try again.');
  };

  return { state, error, signInWithGoogle, signOut };
};
