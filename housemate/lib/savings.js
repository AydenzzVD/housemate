/**
 * lib/savings.js
 * Wi-Fi (quarterly bill) saving deposit records.
 */
import { createBrowserClient } from '@supabase/ssr';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Get all saving deposits for the current user for a specific bill.
 * @param {string} billId
 * @returns {Promise<Array<{id, amount_cents, saved_date, note}>>}
 */
export async function getMySavings(billId) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('bill_savings')
    .select('id, amount_cents, saved_date, note, created_at')
    .eq('bill_id', billId)
    .order('saved_date', { ascending: true });

  if (error) {
    console.error('getMySavings error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Add a saving deposit for a bill.
 * @param {{billId, amountCents, savedDate, note}} params
 * @returns {Promise<{data: {id}|null, error: string|null}>}
 */
export async function addSavingDeposit({ billId, amountCents, savedDate, note }) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('bill_savings')
    .insert({
      bill_id: billId,
      amount_cents: amountCents,
      saved_date: savedDate || new Date().toISOString().split('T')[0],
      note: note?.trim() || null,
    })
    .select('id')
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Delete a saving deposit (own only — RLS enforced).
 * @param {string} savingId
 * @returns {Promise<{error: string|null}>}
 */
export async function deleteSavingDeposit(savingId) {
  const supabase = getClient();

  const { error } = await supabase
    .from('bill_savings')
    .delete()
    .eq('id', savingId);

  return { error: error?.message ?? null };
}
