/**
 * lib/expenses.js
 * Private personal expense CRUD.
 * All RLS policies ensure users can only access their own expenses.
 */
import { createBrowserClient } from '@supabase/ssr';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Get the current user's expenses, optionally filtered by month.
 * @param {string|null} monthYear - 'YYYY-MM' format, or null for all
 * @returns {Promise<Array<{id, title, amount_cents, category, date, note}>>}
 */
export async function getMyExpenses(monthYear = null) {
  const supabase = getClient();

  let query = supabase
    .from('expenses')
    .select('id, title, amount_cents, category, date, note, created_at')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (monthYear) {
    const [year, month] = monthYear.split('-');
    const start = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    const end = endDate.toISOString().split('T')[0];
    query = query.gte('date', start).lte('date', end);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getMyExpenses error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Add a new personal expense.
 * MUST include user_id = auth.uid() to satisfy RLS WITH CHECK policy.
 * @param {{title, amountCents, category, date, note}} params
 * @returns {Promise<{data: {id}|null, error: string|null}>}
 */
export async function addExpense({ title, amountCents, category, date, note }) {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id, // REQUIRED for RLS WITH CHECK (user_id = auth.uid())
      title: title.trim(),
      amount_cents: amountCents,
      category,
      date,
      note: note?.trim() || null,
    })
    .select('id')
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Update an existing personal expense (own only — RLS enforced).
 * @param {string} expenseId
 * @param {{title, amountCents, category, date, note}} updates
 * @returns {Promise<{error: string|null}>}
 */
export async function updateExpense(expenseId, { title, amountCents, category, date, note }) {
  const supabase = getClient();

  const { error } = await supabase
    .from('expenses')
    .update({
      title: title.trim(),
      amount_cents: amountCents,
      category,
      date,
      note: note?.trim() || null,
    })
    .eq('id', expenseId);

  return { error: error?.message ?? null };
}

/**
 * Delete a personal expense (own only — RLS enforced).
 * @param {string} expenseId
 * @returns {Promise<{error: string|null}>}
 */
export async function deleteExpense(expenseId) {
  const supabase = getClient();

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  return { error: error?.message ?? null };
}

/**
 * Get a single expense by ID (own only — RLS enforced).
 * @param {string} expenseId
 * @returns {Promise<Object|null>}
 */
export async function getExpenseById(expenseId) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('expenses')
    .select('id, title, amount_cents, category, date, note')
    .eq('id', expenseId)
    .single();

  if (error) {
    console.error('getExpenseById error:', error.message);
    return null;
  }
  return data;
}

/**
 * Get total expense spending for a given month.
 * @param {string} monthYear - 'YYYY-MM'
 * @returns {Promise<number>} total in cents
 */
export async function getMonthlyExpenseTotal(monthYear) {
  const expenses = await getMyExpenses(monthYear);
  return expenses.reduce((sum, e) => sum + e.amount_cents, 0);
}
