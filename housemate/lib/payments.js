/**
 * lib/payments.js
 * Bill payment queries and status toggling.
 */
import { createBrowserClient } from '@supabase/ssr';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Get all payment records for the latest open bill cycle in a house.
 * Returns grouped by bill — { bill, cycle, payments[] }
 * @param {string} houseId
 * @returns {Promise<Array<{bill, cycle, payments}>>}
 */
export async function getCurrentCyclePayments(houseId) {
  const supabase = getClient();

  // Get the most recent open cycle for each bill in this house
  const { data: cycles, error } = await supabase
    .from('bill_cycles')
    .select(`
      id, period_start, period_end, due_date, total_amount_cents, status,
      bills(id, name, category, frequency),
      bill_payments(id, user_id, share_amount_cents, status, paid_at, profiles(full_name, avatar_url))
    `)
    .eq('house_id', houseId)
    .eq('status', 'open')
    .order('due_date', { ascending: true });

  if (error) {
    console.error('getCurrentCyclePayments error:', error.message);
    return [];
  }

  return (cycles ?? []).map(cycle => ({
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
}

/**
 * Toggle the current user's payment status for a specific bill_payment record.
 * Uses the mark_my_payment_status RPC (SECURITY DEFINER — only own payments can be toggled).
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
 * Get all payment history for the current user across all cycles.
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
      bill_cycles(period_start, due_date, bills(name, category))
    `)
    .eq('user_id', user.id)
    .order('paid_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('getMyPaymentHistory error:', error.message);
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
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('bill_cycles')
    .select(`
      id, due_date, total_amount_cents, status,
      bills(id, name, category, frequency)
    `)
    .eq('house_id', houseId)
    .gte('due_date', today)
    .order('due_date', { ascending: true })
    .limit(20);

  if (error) {
    console.error('getUpcomingBillCycles error:', error.message);
    return [];
  }
  return data ?? [];
}
