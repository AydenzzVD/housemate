/**
 * lib/savings.js
 * Wi-Fi (quarterly/periodic bill) saving deposit records.
 *
 * The bill_savings table tracks individual user deposits towards
 * a shared quarterly/periodic bill (e.g. Wi-Fi $45 / 3 months).
 *
 * The saving TARGET is calculated from the bill definition:
 *   target = bill.total_amount_cents / memberCount
 *
 * Monthly contribution = target / cycleMonths
 *
 * This table stores ACTUAL user-recorded deposits only.
 * Historical savings records are NEVER modified.
 */
import { createBrowserClient } from '@supabase/ssr';
import { frequencyToMonths } from '@/lib/dates';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Get all saving deposits for the current user for a specific bill.
 * @param {string} billId
 * @returns {Promise<Array<{id, amount_cents, saved_date, note, created_at}>>}
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
 * Get ALL members' saving deposits for a specific bill (house-wide view).
 * @param {string} billId
 * @returns {Promise<Array>}
 */
export async function getAllMemberSavings(billId) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('bill_savings')
    .select('id, user_id, amount_cents, saved_date, note, created_at, profiles(full_name, avatar_url)')
    .eq('bill_id', billId)
    .order('saved_date', { ascending: true });

  if (error) {
    console.error('getAllMemberSavings error:', error.message);
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

/**
 * Calculate Wi-Fi Fund progress metrics for a single user.
 *
 * @param {{
 *   totalBillCents: number,
 *   memberCount: number,
 *   frequency: string,
 *   savedDeposits: Array<{amount_cents: number}>
 * }} params
 * @returns {{
 *   targetCents: number,
 *   monthlyContributionCents: number,
 *   actualSavedCents: number,
 *   remainingCents: number,
 *   progressPercent: number,
 *   isReadyToPay: boolean,
 *   cycleMonths: number
 * }}
 */
export function calculateWifiFundProgress({ totalBillCents, memberCount, frequency, savedDeposits }) {
  const count = memberCount > 0 ? memberCount : 1;
  const cycleMonths = frequencyToMonths(frequency);

  // Personal share of the total bill
  const targetCents = Math.round(totalBillCents / count);

  // Monthly contribution target
  const monthlyContributionCents = Math.round(targetCents / cycleMonths);

  // Actual saved by this user
  const actualSavedCents = (savedDeposits ?? []).reduce((sum, d) => sum + (d.amount_cents ?? 0), 0);

  // Remaining to save
  const remainingCents = Math.max(0, targetCents - actualSavedCents);

  // Progress percentage (capped at 100%)
  const progressPercent = targetCents > 0
    ? Math.min(100, Math.round((actualSavedCents / targetCents) * 100))
    : 0;

  return {
    targetCents,
    monthlyContributionCents,
    actualSavedCents,
    remainingCents,
    progressPercent,
    isReadyToPay: actualSavedCents >= targetCents,
    cycleMonths,
  };
}
