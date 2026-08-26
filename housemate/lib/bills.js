/**
 * lib/bills.js
 * House bill CRUD operations.
 * All mutations are admin-only (enforced by RLS + RPC).
 */
import { createBrowserClient } from '@supabase/ssr';
import { calculateCycleFromStartDate, getTodayInHouseTimezone } from '@/lib/dates';

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
 * Get a single bill by ID, plus all its bill_cycles (for history) and the latest cycle's payments.
 * @param {string} billId
 * @returns {Promise<{bill, cycles, latestCycle, payments}|null>}
 */
export async function getBillById(billId) {
  const supabase = getClient();

  const { data: bill, error: billError } = await supabase
    .from('bills')
    .select('id, name, total_amount_cents, frequency, due_day_of_month, category, is_active, house_id, created_at')
    .eq('id', billId)
    .single();

  if (billError || !bill) {
    console.error('getBillById error:', billError?.message);
    return null;
  }

  const { data: cycles } = await supabase
    .from('bill_cycles')
    .select('id, period_start, period_end, due_date, total_amount_cents, status')
    .eq('bill_id', billId)
    .order('period_start', { ascending: false });

  const latestCycle = cycles?.[0] ?? null;

  let payments = [];
  if (latestCycle) {
    const { data: paymentData } = await supabase
      .from('bill_payments')
      .select('id, user_id, share_amount_cents, status, paid_at, profiles(full_name, avatar_url)')
      .eq('bill_cycle_id', latestCycle.id)
      .order('user_id', { ascending: true });

    payments = paymentData ?? [];
  }

  return { bill, cycles: cycles ?? [], latestCycle, payments };
}

/**
 * Create a new bill with an explicit start date and due timing.
 * Features automatic fallback if start_date/due_timing columns are not yet added to Supabase DB.
 *
 * @param {Object} params
 * @returns {Promise<{data: {billId, cycleId}|null, error: string|null}>}
 */
export async function createBill({
  houseId,
  name,
  totalAmountCents,
  frequency,
  dueDayOfMonth,
  startDate,
  dueTiming = 'end_of_period',
  category,
}) {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const effectiveStartDate = startDate || getTodayInHouseTimezone();
  const dayFromDate = parseInt(effectiveStartDate.split('-')[2], 10);
  const dueDay = dueDayOfMonth || dayFromDate;

  const insertPayload = {
    house_id: houseId,
    created_by: user.id,
    name: name.trim(),
    total_amount_cents: totalAmountCents,
    frequency,
    due_day_of_month: dueDay,
    start_date: effectiveStartDate,
    due_timing: dueTiming,
    category: category || 'general',
  };

  // Try insert with new columns
  let { data: bill, error: billError } = await supabase
    .from('bills')
    .insert(insertPayload)
    .select('id')
    .single();

  // Fallback: If DB schema doesn't have start_date or due_timing columns yet, strip them and retry
  if (billError && (billError.message?.includes('due_timing') || billError.message?.includes('start_date') || billError.code === 'PGRST204')) {
    delete insertPayload.start_date;
    delete insertPayload.due_timing;

    const retry = await supabase
      .from('bills')
      .insert(insertPayload)
      .select('id')
      .single();

    bill = retry.data;
    billError = retry.error;
  }

  if (billError) return { data: null, error: billError.message };

  // Calculate cycle dates from the explicit start date
  const { periodStart, periodEnd, dueDate } = calculateCycleFromStartDate(
    effectiveStartDate,
    frequency,
    dueTiming
  );

  const { data: cycleData, error: cycleError } = await supabase.rpc('create_bill_cycle', {
    p_bill_id:      bill.id,
    p_period_start: periodStart,
    p_period_end:   periodEnd,
    p_due_date:     dueDate,
  });

  if (cycleError) {
    console.error('create_bill_cycle error:', cycleError.message);
    return {
      data: { billId: bill.id, cycleId: null },
      error: `Bill created but first cycle failed: ${cycleError.message}`,
    };
  }

  return { data: { billId: bill.id, cycleId: cycleData?.cycle_id }, error: null };
}

/**
 * Update a bill's definition.
 * Features automatic fallback if DB schema cache does not have start_date/due_timing columns.
 *
 * @param {string} billId
 * @param {Object} updates
 * @returns {Promise<{error: string|null}>}
 */
export async function updateBill(billId, {
  name,
  totalAmountCents,
  dueDayOfMonth,
  startDate,
  dueTiming,
  category,
  frequency,
}) {
  const supabase = getClient();

  const updateData = {
    name: name.trim(),
    total_amount_cents: totalAmountCents,
    category: category || 'general',
  };

  if (dueDayOfMonth) updateData.due_day_of_month = dueDayOfMonth;
  if (startDate) updateData.start_date = startDate;
  if (dueTiming) updateData.due_timing = dueTiming;
  if (frequency) updateData.frequency = frequency;

  let { error } = await supabase
    .from('bills')
    .update(updateData)
    .eq('id', billId);

  // Fallback: If DB schema doesn't have start_date/due_timing, strip them and retry
  if (error && (error.message?.includes('due_timing') || error.message?.includes('start_date') || error.code === 'PGRST204')) {
    delete updateData.start_date;
    delete updateData.due_timing;

    const retry = await supabase
      .from('bills')
      .update(updateData)
      .eq('id', billId);

    error = retry.error;
  }

  return { error: error?.message ?? null };
}

/**
 * Deactivate a bill (soft delete). Preserves all history.
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
 * Reactivate a previously deactivated bill.
 * @param {string} billId
 * @returns {Promise<{error: string|null}>}
 */
export async function reactivateBill(billId) {
  const supabase = getClient();

  const { error } = await supabase
    .from('bills')
    .update({ is_active: true })
    .eq('id', billId);

  return { error: error?.message ?? null };
}

/**
 * Hard delete a bill. Only allowed if zero bill_cycles exist.
 * @param {string} billId
 * @returns {Promise<{error: string|null}>}
 */
export async function deleteBill(billId) {
  const supabase = getClient();

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
 * Count how many bill_cycles exist for a bill.
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

/**
 * Get all historical bill cycles for a bill (sorted newest first).
 * @param {string} billId
 * @returns {Promise<Array>}
 */
export async function getBillCycleHistory(billId) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('bill_cycles')
    .select('id, period_start, period_end, due_date, total_amount_cents, status')
    .eq('bill_id', billId)
    .order('period_start', { ascending: false });

  if (error) return [];
  return data ?? [];
}
