/**
 * lib/budgets.js
 * Private personal monthly budget CRUD.
 */
import { createBrowserClient } from '@supabase/ssr';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Get the current user's budget for a given month.
 * @param {string} monthYear - 'YYYY-MM'
 * @returns {Promise<{id, budget_cents, month_year}|null>}
 */
export async function getMyBudget(monthYear) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('budgets')
    .select('id, budget_cents, month_year')
    .eq('month_year', monthYear)
    .maybeSingle();

  if (error) {
    console.error('getMyBudget error:', error.message);
    return null;
  }
  return data ?? null;
}

/**
 * Create or update the user's budget for a given month.
 * Uses upsert with unique(user_id, month_year) constraint.
 * @param {string} monthYear - 'YYYY-MM'
 * @param {number} budgetCents - integer cents
 * @returns {Promise<{error: string|null}>}
 */
export async function upsertBudget(monthYear, budgetCents) {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('budgets')
    .upsert(
      { user_id: user.id, month_year: monthYear, budget_cents: budgetCents },
      { onConflict: 'user_id,month_year' }
    );

  return { error: error?.message ?? null };
}

/**
 * Get budgets for the last N months for trend analysis.
 * @param {number} months - how many months back to fetch
 * @returns {Promise<Array<{month_year, budget_cents}>>}
 */
export async function getRecentBudgets(months = 3) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('budgets')
    .select('id, month_year, budget_cents')
    .order('month_year', { ascending: false })
    .limit(months);

  if (error) {
    console.error('getRecentBudgets error:', error.message);
    return [];
  }
  return data ?? [];
}
