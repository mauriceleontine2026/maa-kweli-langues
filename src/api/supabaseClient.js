import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}/login`;
  // Use redirect login so Supabase returns the OAuth response in the URL
  // fragment, where the app can complete the backend exchange on login.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
  if (data?.url) {
    window.location.href = data.url;
    return { token: null, data };
  }
  return { token: data?.session?.access_token || null, data };
}

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
      emailRedirectTo: 'https://maa-kweli-langues.vercel.app/login',
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export default supabase;
