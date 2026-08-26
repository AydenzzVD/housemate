/**
 * lib/payments.js
 * Bill payment queries and status toggling.
 *
 * KEY DESIGN:
 * - Monthly bills (rent, electricity, water) → returned as "What I Owe Now"
 * - Quarterly/savings bills (Wi-Fi) → returned separately as "savings" unless in due period
 * - Individual per-bill payment status via mark_my_payment_status RPC
 */
import { createBrowserClient } from '@supabase/ssr';
import { isSavingsCycle, getTodayInHouseTimezone } from '@/lib/dates';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Trigger idempotent cycle generation for the current user's house.
 * Calls ensure_house_bill_cycles RPC with today's date.
 * Safe to call multiple times — won't duplicate cycles.
 * @param {string} houseId
 */
export async function ensureActiveCycles(houseId) {
  const supabase = getClient();
  const today = getTodayInHouseTimezone();

  const { error } = await supabase.rpc('ensure_house_bill_cycles', {
    p_house_id:    houseId,
    p_target_date: today,
  });

  if (error) {
    console.error('ensureActiveCycles error:', error.message);
  }
}

/**
 * Get all open/overdue bill cycle payment groups for a house.
 *
 * Returns two separate arrays:
 *   - regularCycles: monthly bills (rent, electricity, water, etc.)
 *   - savingsCycles: quarterly/semi_annual/yearly bills not yet in their due period
 *   - dueSavingsCycles: quarterly bills that ARE in their due period (real payment obligations)
 *
 * @param {string} houseId
 * @returns {Promise<{regularCycles: Array, savingsCycles: Array, dueSavingsCycles: Array}>}
 */
export async function getCurrentCyclePayments(houseId) {
  const supabase = getClient();

  // Get all open + overdue cycles (NOT fully_paid, NOT cancelled, NOT upcoming)
  const { data: cycles, error } = await supabase
    .from('bill_cycles')
    .select(`
      id, period_start, period_end, due_date, total_amount_cents, status,
      bills(id, name, category, frequency, is_active),
      bill_payments(id, user_id, share_amount_cents, status, paid_at, profiles(full_name, avatar_url))
    `)
    .eq('house_id', houseId)
    .in('status', ['open', 'overdue'])
    .order('due_date', { ascending: true });

  if (error) {
    console.error('getCurrentCyclePayments error:', error.message);
    return { regularCycles: [], savingsCycles: [], dueSavingsCycles: [] };
  }

  const mapped = (cycles ?? []).map(cycle => ({
    bill: cycle.bills,
    cycle: {
      id: cycle.id,
      period_start: cycle.period_start,
      period_end: cycle.period_end,
      due_date: cycle.due_date,
      total_amount_cents: cycle.total_amount_cents,
      status: cycle.status,
    },
    payments: cycle.bill_payments ?? [],
  }));

  // Separate into regular vs savings
  const regularCycles = [];
  const savingsCycles = [];
  const dueSavingsCycles = [];

  for (const group of mapped) {
    const freq = group.bill?.frequency ?? 'monthly';
    if (isSavingsCycle(freq, group.cycle.period_start, group.cycle.due_date)) {
      savingsCycles.push(group);
    } else if (freq !== 'monthly' && freq !== 'one_time') {
      // Quarterly/semi_annual in their DUE period → real obligation
      dueSavingsCycles.push(group);
    } else {
      regularCycles.push(group);
    }
  }

  return { regularCycles, savingsCycles, dueSavingsCycles };
}

/**
 * Toggle the current user's payment status for a specific bill_payment record.
 * Uses the mark_my_payment_status RPC (SECURITY DEFINER — only own payments can be toggled).
 * The RPC also auto-marks the cycle as fully_paid when all members have paid.
 *
 * @param {string} paymentId
 * @param {'paid'|'pending'} newStatus
 * @returns {Promise<{error: string|null}>}
 */
export async function toggleMyPayment(paymentId, newStatus) {
  const supabase = getClient();

  const { error } = await supabase.rpc('mark_my_payment_status', {
    p_payment_id: paymentId,
    p_status: newStatus,
  });

  return { error: error?.message ?? null };
}

/**
 * Get the current user's payment history across ALL bill cycles.
 * Returns records sorted by period_start descending.
 * Historical records are NEVER rewritten due to member changes.
 *
 * @returns {Promise<Array>}
 */
export async function getMyPaymentHistory() {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('bill_payments')
    .select(`
      id, share_amount_cents, status, paid_at,
      bill_cycles(id, period_start, period_end, due_date, status, total_amount_cents, bills(id, name, category, frequency))
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('getMyPaymentHistory error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Get payment history for all members of a house, grouped by bill cycle.
 * Used by admin views to see the full house payment history.
 *
 * @param {string} houseId
 * @returns {Promise<Array>}
 */
export async function getHousePaymentHistory(houseId) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('bill_cycles')
    .select(`
      id, period_start, period_end, due_date, total_amount_cents, status,
      bills(id, name, category, frequency),
      bill_payments(id, user_id, share_amount_cents, status, paid_at, profiles(full_name, avatar_url))
    `)
    .eq('house_id', houseId)
    .in('status', ['fully_paid', 'open', 'overdue'])
    .order('period_start', { ascending: false })
    .limit(50);

  if (error) {
    console.error('getHousePaymentHistory error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Get upcoming bill due dates for the current user's house.
 * @param {string} houseId
 * @returns {Promise<Array>}
 */
export async function getUpcomingBillCycles(houseId) {
  const supabase = getClient();
  const today = getTodayInHouseTimezone();

  const { data, error } = await supabase
    .from('bill_cycles')
    .select(`
      id, due_date, total_amount_cents, status, period_start,
      bills(id, name, category, frequency)
    `)
    .eq('house_id', houseId)
    .gte('due_date', today)
    .in('status', ['open', 'overdue', 'upcoming'])
    .order('due_date', { ascending: true })
    .limit(20);

  if (error) {
    console.error('getUpcomingBillCycles error:', error.message);
    return [];
  }
  return data ?? [];
}
