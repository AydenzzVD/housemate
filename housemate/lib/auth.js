/**
 * lib/auth.js
 * Authentication & Profile queries.
 */
import { createBrowserClient } from '@supabase/ssr';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Get the currently authenticated Supabase user.
 * @returns {Promise<import('@supabase/supabase-js').User|null>}
 */
export async function getCurrentUser() {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

/**
 * Get the full profile row for the current user.
 * @returns {Promise<{id: string, full_name: string, avatar_url: string|null}|null>}
 */
export async function getProfile() {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('getProfile error:', error.message);
    return null;
  }
  return data;
}

/**
 * Update the current user's display name.
 * @param {string} fullName
 * @returns {Promise<{error: string|null}>}
 */
export async function updateProfile(fullName) {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
    .eq('id', user.id);

  return { error: error?.message ?? null };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const supabase = getClient();
  await supabase.auth.signOut();
}
