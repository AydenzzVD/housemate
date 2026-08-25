'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLocalStore, saveLocalStore } from '@/lib/store';
import { formatCents, parseToCents, daysRemainingInMonth } from '@/lib/money';

/**
 * Personal Budget Page
 *
 * Matches Stitch design: budget_housemate/screen.png
 *
 * - Set and edit monthly budget ($500.00)
 * - Spent vs Remaining calculation
 * - Daily allowance estimator based on days left in month
 */
export default function BudgetPage() {
  const [store, setStore] = useState(null);
  const [editing, setEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState('500.00');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const s = getLocalStore();
    setStore(s);
    if (s?.budget_cents) {
      setBudgetInput((s.budget_cents / 100).toFixed(2));
    }
  }, []);

  if (!store) return null;

  const { house, expenses, budget_cents = 50000 } = store;

  const totalSpentCents = expenses.reduce((sum, e) => sum + e.amount_cents, 0) || 24750;
  const remainingCents = Math.max(0, budget_cents - totalSpentCents);
  const percentUsed = budget_cents > 0 ? Math.min(100, Math.round((totalSpentCents / budget_cents) * 100)) : 0;

  const daysLeft = Math.max(1, daysRemainingInMonth() || 6);
  const dailyAllowanceCents = Math.round(remainingCents / daysLeft);

  function handleSaveBudget(e) {
    e.preventDefault();
    const newBudgetCents = parseToCents(budgetInput);
    if (newBudgetCents <= 0) return;

    const nextStore = { ...store, budget_cents: newBudgetCents };
    setStore(nextStore);
    saveLocalStore(nextStore);

    setEditing(false);
    setToast('✓ Monthly budget updated successfully!');
    setTimeout(() => setToast(''), 3000);
  }

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
            <h1 className="text-headline-lg text-on-surface">Monthly Budget</h1>
          </div>
          <p className="text-body-md text-secondary">
            Keep your shared living and personal lifestyle in balance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="btn-secondary"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
          {editing ? 'Cancel' : 'Edit Budget Target'}
        </button>
      </div>

      {/* Edit Form Modal/Drawer if open */}
      {editing && (
        <div className="card" style={{ padding: 'var(--space-lg)', border: '2px solid var(--color-primary-fixed-dim)' }}>
          <form onSubmit={handleSaveBudget} style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label htmlFor="budget-input" className="input-label">
                Set Monthly Budget ({house.currency})
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
              Save Budget
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
              <span className="text-label-md text-secondary">August Budget Status</span>
              <span className={`badge ${percentUsed > 90 ? 'badge-overdue' : 'badge-paid'}`}>
                {percentUsed > 90 ? 'Near Limit' : 'Healthy'}
              </span>
            </div>

            <div className="text-display-financial text-on-surface" style={{ margin: 'var(--space-xs) 0 var(--space-lg)' }}>
              {formatCents(remainingCents, house.currency)}{' '}
              <span className="text-body-md text-secondary" style={{ fontWeight: 400 }}>remaining</span>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
              <div>
                <span className="text-label-sm text-secondary uppercase tracking-wider">Total Target</span>
                <p className="text-headline-md text-on-surface font-semibold">
                  {formatCents(budget_cents, house.currency)}
                </p>
              </div>

              <div>
                <span className="text-label-sm text-secondary uppercase tracking-wider">Total Spent</span>
                <p className="text-headline-md text-secondary">
                  {formatCents(totalSpentCents, house.currency)}
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span className="text-secondary">{percentUsed}% used</span>
              <span className="text-primary font-semibold">{100 - percentUsed}% remaining</span>
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
              Daily Safe Allowance
            </h3>
            <p className="text-body-md" style={{ fontSize: 14, opacity: 0.85 }}>
              Based on {daysLeft} days remaining in August.
            </p>
          </div>

          <div style={{ marginTop: 'var(--space-xl)' }}>
            <div className="text-display-financial font-bold" style={{ fontSize: 32 }}>
              {formatCents(dailyAllowanceCents, house.currency)}
            </div>
            <span className="text-label-sm" style={{ opacity: 0.8 }}>
              per day to stay on budget
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
