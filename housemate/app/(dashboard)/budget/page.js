'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMyBudget, upsertBudget } from '@/lib/budgets';
import { getMyExpenses } from '@/lib/expenses';
import { getUserHouse } from '@/lib/houses';
import { formatCents, parseToCents, daysRemainingInMonth, currentMonthYear } from '@/lib/money';
import { useLanguage } from '@/lib/lang/useLanguage';

/**
 * Personal Budget Page — live multi-user data (strictly private)
 * Matches Stitch design: budget_housemate/screen.png
 */
export default function BudgetPage() {
  const { t, lang } = useLanguage();
  const [house, setHouse] = useState(null);
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState('500.00');
  const [toast, setToast] = useState('');

  const monthYear = currentMonthYear();

  useEffect(() => {
    async function loadData() {
      const [hData, bData, expData] = await Promise.all([
        getUserHouse(),
        getMyBudget(monthYear),
        getMyExpenses(monthYear),
      ]);

      setHouse(hData);
      setBudget(bData);
      setExpenses(expData);

      if (bData && bData.budget_cents) {
        setBudgetInput((bData.budget_cents / 100).toFixed(2));
      }
      setLoading(false);
    }
    loadData();
  }, [monthYear]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)', maxWidth: 880, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 40, width: 250, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const budgetCents = budget?.budget_cents ?? 0;
  const totalSpentCents = expenses.reduce((sum, e) => sum + e.amount_cents, 0);
  const remainingCents = Math.max(0, budgetCents - totalSpentCents);
  const percentUsed = budgetCents > 0 ? Math.min(100, Math.round((totalSpentCents / budgetCents) * 100)) : 0;

  const daysLeft = Math.max(1, daysRemainingInMonth());
  const dailyAllowanceCents = Math.round(remainingCents / daysLeft);

  async function handleSaveBudget(e) {
    e.preventDefault();
    const newBudgetCents = parseToCents(budgetInput);
    if (newBudgetCents <= 0) return;

    const { error } = await upsertBudget(monthYear, newBudgetCents);
    if (error) {
      setToast(`❌ ${error}`);
    } else {
      setEditing(false);
      setToast(t('budget.toast_saved'));
      const updated = await getMyBudget(monthYear);
      setBudget(updated);
    }
    setTimeout(() => setToast(''), 3000);
  }

  const monthName = new Date().toLocaleString(lang === 'km' ? 'km-KH' : 'en-US', { month: 'long' });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: 880, margin: '0 auto' }}>
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 4 }}>
            <Link href="/expenses" className="btn-icon" style={{ width: 32, height: 32, textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            </Link>
            <h1 className="text-headline-lg text-on-surface">{t('budget.page_title', { month: monthName })}</h1>
          </div>
          <p className="text-body-md text-secondary">
            {t('budget.page_subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="btn-secondary"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
          {editing ? t('budget.cancel_btn') : budgetCents > 0 ? t('budget.edit_btn') : t('budget.set_btn')}
        </button>
      </div>

      {/* Edit Form Drawer */}
      {editing && (
        <div className="card fade-in" style={{ padding: 'var(--space-lg)', border: '2px solid var(--color-primary-fixed-dim)' }}>
          <form onSubmit={handleSaveBudget} style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label htmlFor="budget-input" className="input-label">
                {t('budget.input_label', { currency: house?.currency || '$' })}
              </label>
              <input
                id="budget-input"
                type="number"
                step="1"
                min="10"
                required
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                className="input-field"
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary">
              {t('budget.save_btn')}
            </button>
          </form>
        </div>
      )}

      {/* Bento Grid */}
      <div className="bento-grid bento-grid-12">
        {/* Main Budget Health Card (8 cols) */}
        <div className="card col-span-8" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 260 }}>
          <div className="glow-primary" />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xs)' }}>
              <span className="text-label-md text-secondary">{t('budget.budget_status', { month: monthName })}</span>
              <span className={`badge ${percentUsed > 90 ? 'badge-overdue' : 'badge-paid'}`}>
                {budgetCents === 0 ? t('status.no_target') : percentUsed > 90 ? t('status.near_limit') : t('status.healthy')}
              </span>
            </div>

            <div className="text-display-financial text-on-surface" style={{ margin: 'var(--space-xs) 0 var(--space-lg)' }}>
              {budgetCents > 0 ? formatCents(remainingCents, house?.currency) : formatCents(totalSpentCents, house?.currency)}{' '}
              <span className="text-body-md text-secondary" style={{ fontWeight: 400 }}>
                {budgetCents > 0 ? t('budget.remaining') : t('budget.spent')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
              <div>
                <span className="text-label-sm text-secondary uppercase tracking-wider">{t('budget.total_target')}</span>
                <p className="text-headline-md text-on-surface font-semibold">
                  {budgetCents > 0 ? formatCents(budgetCents, house?.currency) : t('common.not_set')}
                </p>
              </div>

              <div>
                <span className="text-label-sm text-secondary uppercase tracking-wider">{t('budget.total_spent')}</span>
                <p className="text-headline-md text-secondary">
                  {formatCents(totalSpentCents, house?.currency)}
                </p>
              </div>
            </div>
          </div>

          {budgetCents > 0 && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span className="text-secondary">{t('budget.percent_used', { pct: percentUsed })}</span>
                <span className="text-primary font-semibold">{t('budget.percent_remaining', { pct: 100 - percentUsed })}</span>
              </div>
              <div className="progress-bar-track" style={{ height: 8 }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${percentUsed}%`,
                    backgroundColor: percentUsed > 90 ? 'var(--color-danger)' : 'var(--color-primary)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Daily Allowance Card (4 cols) */}
        <div
          className="col-span-4"
          style={{
            backgroundColor: 'var(--color-secondary-container)',
            color: 'var(--color-on-secondary-container)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-md)',
              }}
            >
              <span className="material-symbols-outlined">calendar_today</span>
            </div>

            <h3 className="text-headline-md" style={{ marginBottom: 4 }}>
              {t('budget.daily_allowance')}
            </h3>
            <p className="text-body-md" style={{ fontSize: 14, opacity: 0.85 }}>
              {t('budget.daily_desc', { days: daysLeft, month: monthName })}
            </p>
          </div>

          <div style={{ marginTop: 'var(--space-xl)' }}>
            <div className="text-display-financial font-bold" style={{ fontSize: 32 }}>
              {budgetCents > 0 ? formatCents(dailyAllowanceCents, house?.currency) : '$0.00'}
            </div>
            <span className="text-label-sm" style={{ opacity: 0.8 }}>
              {budgetCents > 0 ? t('budget.per_day') : t('budget.set_first')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
