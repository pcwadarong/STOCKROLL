import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client. Only gear, film, recipe and shot records (text) go through it — never photo files.
 * It is `null` when env vars are missing, because framing must work without login or network.
 */
export const supabase: SupabaseClient | null =
  url && publishableKey ? createClient(url, publishableKey) : null;

/**
 * Runs a callback whenever the user signs in or out.
 * @param callback invoked after the session changed
 * @returns a function that stops listening
 */
export const onAuthChange = (callback: () => void) => {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(event => {
    // Calling Supabase from inside this callback can deadlock, so defer to the next task.
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(callback, 0);
  });
  return () => data.subscription.unsubscribe();
};
