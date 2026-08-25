/**
 * lib/bills.js
 * House bill CRUD operations.
 * All mutations are admin-only (enforced by RLS + RPC).
 */
import { createBrowserClient } from '@supabase/ssr';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Get all active bills for a given house.
 * @param {string} houseId
 * @returns {Promise<Array>}
 */
export async function getHouseBills(houseId) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('bills')
    .select('id, name, total_amount_cents, frequency, due_day_of_month, category, is_active, created_at')
    .eq('house_id', houseId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getHouseBills error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Get all bills (including inactive) for a given house.
 * @param {string} houseId
 * @returns {Promise<Array>}
 */
export async function getAllHouseBills(houseId) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('bills')
    .select('id, name, total_amount_cents, frequency, due_day_of_month, category, is_active, created_at')
    .eq('house_id', houseId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getAllHouseBills error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Get a single bill by ID, plus its latest bill_cycle and payments.
 * @param {string} billId
 * @returns {Promise<{bill, latestCycle, payments}|null>}
 */
export async function getBillById(billId) {
  const supabase = getClient();

  // Fetch bill
  const { data: bill, error: billError } = await supabase
    .from('bills')
    .select('id, name, total_amount_cents, frequency, due_day_of_month, category, is_active, house_id, created_at')
    .eq('id', billId)
    .single();

  if (billError || !bill) {
    console.error('getBillById error:', billError?.message);
    return null;
  }

  // Fetch latest open cycle
  const { data: cycles } = await supabase
    .from('bill_cycles')
    .select('id, period_start, period_end, due_date, total_amount_cents, status')
    .eq('bill_id', billId)
    .order('period_start', { ascending: false })
    .limit(1);

  const latestCycle = cycles?.[0] ?? null;

  // Fetch payments for that cycle
  let payments = [];
  if (latestCycle) {
    const { data: paymentData } = await supabase
      .from('bill_payments')
      .select('id, user_id, share_amount_cents, status, paid_at, profiles(full_name, avatar_url)')
      .eq('bill_cycle_id', latestCycle.id)
      .order('user_id', { ascending: true });

    payments = paymentData ?? [];
  }

  return { bill, latestCycle, payments };
}

/**
 * Create a new bill and immediately create its first billing cycle.
 * Admin only (enforced by create_bill_cycle RPC).
 * @param {Object} params
 * @returns {Promise<{data: {billId, cycleId}|null, error: string|null}>}
 */
export async function createBill({ houseId, name, totalAmountCents, frequency, dueDayOfMonth, category }) {
  const supabase = getClient();

  // Insert the bill
  const { data: bill, error: billError } = await supabase
    .from('bills')
    .insert({
      house_id: houseId,
      name: name.trim(),
      total_amount_cents: totalAmountCents,
      frequency,
      due_day_of_month: dueDayOfMonth,
      category: category || 'general',
    })
    .select('id')
    .single();

  if (billError) return { data: null, error: billError.message };

  // Create first bill cycle via RPC (admin enforced, frozen shares)
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDayOfMonth);

  const fmt = (d) => d.toISOString().split('T')[0];

  const { data: cycleData, error: cycleError } = await supabase.rpc('create_bill_cycle', {
    p_bill_id: bill.id,
    p_period_start: fmt(periodStart),
    p_period_end: fmt(periodEnd),
    p_due_date: fmt(dueDate),
  });

  if (cycleError) {
    console.error('create_bill_cycle error:', cycleError.message);
    // Bill was created but cycle failed — still return the bill ID
    return { data: { billId: bill.id, cycleId: null }, error: `Bill created but cycle failed: ${cycleError.message}` };
  }

  return { data: { billId: bill.id, cycleId: cycleData?.cycle_id }, error: null };
}

/**
 * Update a bill's definition (name, amount, due day, category).
 * Does NOT modify existing bill_cycles or bill_payments.
 * Admin only (RLS enforced).
 * @param {string} billId
 * @param {Object} updates - { name, totalAmountCents, dueDayOfMonth, category }
 * @returns {Promise<{error: string|null}>}
 */
export async function updateBill(billId, { name, totalAmountCents, dueDayOfMonth, category }) {
  const supabase = getClient();

  const { error } = await supabase
    .from('bills')
    .update({
      name: name.trim(),
      total_amount_cents: totalAmountCents,
      due_day_of_month: dueDayOfMonth,
      category,
    })
    .eq('id', billId);

  return { error: error?.message ?? null };
}

/**
 * Deactivate a bill (soft delete). Preserves all history.
 * Admin only.
 * @param {string} billId
 * @returns {Promise<{error: string|null}>}
 */
export async function deactivateBill(billId) {
  const supabase = getClient();

  const { error } = await supabase
    .from('bills')
    .update({ is_active: false })
    .eq('id', billId);

  return { error: error?.message ?? null };
}

/**
 * Hard delete a bill. Only allowed if zero bill_cycles exist.
 * Admin only.
 * @param {string} billId
 * @returns {Promise<{error: string|null}>}
 */
export async function deleteBill(billId) {
  const supabase = getClient();

  // Safety check: ensure no cycles exist
  const { count } = await supabase
    .from('bill_cycles')
    .select('id', { count: 'exact', head: true })
    .eq('bill_id', billId);

  if (count > 0) {
    return { error: 'Cannot delete a bill that has payment history. Use "Deactivate" instead.' };
  }

  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', billId);

  return { error: error?.message ?? null };
}

/**
 * Count how many bill_cycles exist for a bill (to determine if delete is safe).
 * @param {string} billId
 * @returns {Promise<number>}
 */
export async function getBillCycleCount(billId) {
  const supabase = getClient();
  const { count } = await supabase
    .from('bill_cycles')
    .select('id', { count: 'exact', head: true })
    .eq('bill_id', billId);
  return count ?? 0;
}
