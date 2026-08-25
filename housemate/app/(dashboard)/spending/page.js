'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLocalStore } from '@/lib/store';
import { formatCents, CATEGORY_ICONS } from '@/lib/money';

/**
 * Monthly Spending Analysis Page
 *
 * Matches Stitch design: monthly_spending_housemate/screen.png
 *
 * - Total Monthly Spending ($327.50)
 * - Category breakdown donut / percentage list
 * - Comparison with previous month (July vs August, +17%)
 * - Daily average spend
 */
export default function MonthlySpendingPage() {
  const [store, setStore] = useState(null);

  useEffect(() => {
    setStore(getLocalStore());
  }, []);

  if (!store) return null;

  const { house, expenses } = store;

  // Group personal spending by category
  const categoryTotals = {};
  let totalCents = 0;

  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount_cents;
    totalCents += e.amount_cents;
  });

  // Default demonstration breakdown if few expenses
  if (totalCents === 0) {
    categoryTotals['Food'] = 9600;
    categoryTotals['Shopping'] = 6150;
    categoryTotals['Bills'] = 17000;
    totalCents = 32750;
  }

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const julyTotalCents = 28000; // $280.00
  const diffCents = totalCents - julyTotalCents;
  const diffPercent = Math.round((diffCents / julyTotalCents) * 100);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 4 }}>
            <Link href="/expenses" className="btn-icon" style={{ width: 32, height: 32, textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            </Link>
            <h1 className="text-headline-md text-on-surface">August Spending Analysis</h1>
          </div>
          <div className="text-display-financial text-primary">
            {formatCents(totalCents, house.currency)}
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

      {/* Bento Grid Layout */}
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
                {formatCents(totalCents, house.currency)}
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
                        {formatCents(amountCents, house.currency)}{' '}
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

        {/* Comparison with Previous Month (4 cols) */}
        <div className="card col-span-4" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-lg)' }}>
              Compared with July
            </h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-md)' }}>
              <div>
                <span className="text-label-sm text-secondary uppercase tracking-wider">July</span>
                <div className="text-headline-md text-secondary" style={{ marginTop: 2 }}>
                  {formatCents(julyTotalCents, house.currency)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="text-label-sm text-primary uppercase tracking-wider font-bold">August</span>
                <div className="text-headline-md text-primary font-bold" style={{ marginTop: 2 }}>
                  {formatCents(totalCents, house.currency)}
                </div>
              </div>
            </div>

            {/* Comparison Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', margin: 'var(--space-md) 0' }}>
              <div className="progress-bar-track" style={{ height: 16 }}>
                <div className="progress-bar-fill" style={{ width: '75%', backgroundColor: 'var(--color-secondary)' }} />
              </div>
              <div className="progress-bar-track" style={{ height: 16 }}>
                <div className="progress-bar-fill" style={{ width: '90%', backgroundColor: 'var(--color-primary)' }} />
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: diffCents > 0 ? 'var(--color-danger)' : 'var(--color-success)',
              fontWeight: 600,
              fontSize: 15,
              paddingTop: 'var(--space-md)',
              borderTop: '1px solid var(--color-surface-container)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {diffCents > 0 ? 'trending_up' : 'trending_down'}
            </span>
            <span>
              {diffCents > 0 ? '+' : ''}{formatCents(diffCents, house.currency)} ({diffPercent > 0 ? '+' : ''}{diffPercent}%) vs last month
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
