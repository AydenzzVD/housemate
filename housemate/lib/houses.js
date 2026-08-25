/**
 * lib/houses.js
 * House & member queries.
 */
import { createBrowserClient } from '@supabase/ssr';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Get the current user's house (null if no house membership).
 * @returns {Promise<{id, name, currency, join_code, created_by, created_at}|null>}
 */
export async function getUserHouse() {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('house_members')
    .select('role, houses(id, name, currency, join_code, created_by, created_at)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('getUserHouse error:', error.message);
    return null;
  }
  if (!data) return null;

  return { ...data.houses, myRole: data.role };
}

/**
 * Get all members of the current user's house.
 * @returns {Promise<Array<{id, user_id, role, joined_at, profiles: {full_name, avatar_url}}>>}
 */
export async function getHouseMembers(houseId) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('house_members')
    .select('id, user_id, role, joined_at, profiles(full_name, avatar_url)')
    .eq('house_id', houseId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('getHouseMembers error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Create a new house and set the current user as admin.
 * Calls the create_house_with_admin RPC (atomic, SECURITY DEFINER).
 * @param {string} name
 * @param {string} currency
 * @returns {Promise<{data: {house_id, join_code, name, role}|null, error: string|null}>}
 */
export async function createHouse(name, currency = '$') {
  const supabase = getClient();

  const { data, error } = await supabase.rpc('create_house_with_admin', {
    p_name: name.trim(),
    p_currency: currency,
  });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Join an existing house by code.
 * Calls the join_house_by_code RPC (atomic, SECURITY DEFINER).
 * @param {string} code - 6-character join code (will be uppercased)
 * @returns {Promise<{data: {house_id, name, role}|null, error: string|null}>}
 */
export async function joinHouse(code) {
  const supabase = getClient();

  const { data, error } = await supabase.rpc('join_house_by_code', {
    p_join_code: code.toUpperCase().trim(),
  });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Remove a roommate from the house (Admin only).
 * Calls the remove_house_member RPC (atomic, SECURITY DEFINER).
 * @param {string} targetUserId
 * @returns {Promise<{data: any, error: string|null}>}
 */
export async function removeMember(targetUserId) {
  const supabase = getClient();

  const { data, error } = await supabase.rpc('remove_house_member', {
    p_target_user_id: targetUserId,
  });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Leave the current house.
 * Calls the leave_house RPC (atomic, SECURITY DEFINER).
 * @returns {Promise<{data: any, error: string|null}>}
 */
export async function leaveHouse() {
  const supabase = getClient();

  const { data, error } = await supabase.rpc('leave_house');

  if (error) return { data: null, error: error.message };

  // Clear house membership cookie
  await fetch('/api/house/set-cookie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'clear' }),
  });

  return { data, error: null };
}

