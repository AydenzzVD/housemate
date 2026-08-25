'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMyExpenses } from '@/lib/expenses';
import { getUserHouse } from '@/lib/houses';
import { formatCents, CATEGORY_ICONS, currentMonthYear } from '@/lib/money';
import EmptyState from '@/components/EmptyState';

/**
 * Monthly Spending Analysis Page — live multi-user data (strictly private)
 * Matches Stitch design: monthly_spending_housemate/screen.png
 */
export default function MonthlySpendingPage() {
  const [house, setHouse] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const monthYear = currentMonthYear();

  useEffect(() => {
    async function loadData() {
      const [hData, expData] = await Promise.all([
        getUserHouse(),
        getMyExpenses(monthYear),
      ]);
      setHouse(hData);
      setExpenses(expData);
      setLoading(false);
    }
    loadData();
  }, [monthYear]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)', maxWidth: 1000, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 40, width: 250, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  // Group personal spending by category
  const categoryTotals = {};
  let totalCents = 0;

  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount_cents;
    totalCents += e.amount_cents;
  });

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const monthName = new Date().toLocaleString('en-US', { month: 'long' });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 4 }}>
            <Link href="/expenses" className="btn-icon" style={{ width: 32, height: 32, textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            </Link>
            <h1 className="text-headline-md text-on-surface">{monthName} Spending Analysis</h1>
          </div>
          <div className="text-display-financial text-primary">
            {formatCents(totalCents, house?.currency)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Link href="/budget" className="btn-secondary" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>account_balance_wallet</span>
            Budget Settings
          </Link>
          <Link href="/expenses/add" className="btn-primary" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
            Add Expense
          </Link>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <EmptyState
            icon="📊"
            title="No expenses to analyze"
            description="Start logging personal purchases to see your category breakdown."
            actionLabel="Add Expense"
            actionHref="/expenses/add"
          />
        </div>
      ) : (
        /* Bento Grid Layout */
        <div className="bento-grid bento-grid-12">
          {/* Category Breakdown (8 cols) */}
          <div className="card col-span-8" style={{ padding: 'var(--space-xl)' }}>
            <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-lg)' }}>
              Where did my money go?
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-xl)',
                alignItems: 'center',
              }}
            >
              {/* Donut Style Radial Representation */}
              <div
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: 'var(--radius-full)',
                  border: '14px solid var(--color-surface-container)',
                  borderTopColor: 'var(--color-primary)',
                  borderRightColor: 'var(--color-primary-container)',
                  borderBottomColor: 'var(--color-tertiary-container)',
                  borderLeftColor: 'var(--color-secondary-container)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <span className="text-label-sm text-secondary uppercase tracking-wider">Total</span>
                <span className="text-headline-md text-on-surface font-bold">
                  {formatCents(totalCents, house?.currency)}
                </span>
              </div>

              {/* Category Bars List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {categoryEntries.map(([cat, amountCents]) => {
                  const pct = totalCents > 0 ? Math.round((amountCents / totalCents) * 100) : 0;
                  const icon = CATEGORY_ICONS[cat] || '💡';

                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span className="text-body-md text-on-surface font-medium" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{icon}</span> {cat}
                        </span>
                        <span className="text-label-md font-semibold text-on-surface">
                          {formatCents(amountCents, house?.currency)}{' '}
                          <span className="text-secondary" style={{ fontSize: 12, fontWeight: 400 }}>({pct}%)</span>
                        </span>
                      </div>

                      <div className="progress-bar-track" style={{ height: 6 }}>
                        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Insights (4 cols) */}
          <div className="card col-span-4" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-lg)' }}>
                Spending Insights
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <span className="text-label-sm text-secondary uppercase tracking-wider">Top Category</span>
                  <div className="text-headline-md text-primary font-bold" style={{ marginTop: 2 }}>
                    {categoryEntries[0] ? `${CATEGORY_ICONS[categoryEntries[0][0]]} ${categoryEntries[0][0]}` : 'N/A'}
                  </div>
                </div>

                <div className="divider" />

                <div>
                  <span className="text-label-sm text-secondary uppercase tracking-wider">Total Transactions</span>
                  <div className="text-headline-md text-on-surface font-semibold" style={{ marginTop: 2 }}>
                    {expenses.length} logged
                  </div>
                </div>

                <div className="divider" />

                <div>
                  <span className="text-label-sm text-secondary uppercase tracking-wider">Daily Average</span>
                  <div className="text-headline-md text-on-surface font-semibold" style={{ marginTop: 2 }}>
                    {formatCents(Math.round(totalCents / new Date().getDate()), house?.currency)} / day
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
