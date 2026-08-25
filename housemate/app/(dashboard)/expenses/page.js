'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLocalStore } from '@/lib/store';
import { formatCents, CATEGORY_ICONS, EXPENSE_CATEGORIES } from '@/lib/money';

/**
 * Personal Expenses Log Page
 *
 * Matches Stitch design: my_expenses_housemate/screen.png
 *
 * - Strictly private personal expenses
 * - Total spending this month ($247.50)
 * - Budget vs Remaining balance ($500 budget, $252.50 remaining)
 * - Quick "Record a Purchase" CTA card
 * - Category filter chips
 * - Recent expenses list
 */
export default function ExpensesPage() {
  const [store, setStore] = useState(null);
  const [selectedCat, setSelectedCat] = useState('All');

  useEffect(() => {
    setStore(getLocalStore());
  }, []);

  if (!store) return null;

  const { house, expenses, budget_cents = 50000 } = store;

  const totalSpentCents = expenses.reduce((sum, e) => sum + e.amount_cents, 0);
  const remainingCents = Math.max(0, budget_cents - totalSpentCents);
  const budgetUsedPct = budget_cents > 0 ? Math.min(100, Math.round((totalSpentCents / budget_cents) * 100)) : 0;

  const filteredExpenses = expenses.filter(e => {
    if (selectedCat === 'All') return true;
    return e.category === selectedCat;
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <p className="text-label-md text-secondary" style={{ marginBottom: 2 }}>
            My Private Money / August
          </p>
          <h1 className="text-headline-lg text-on-surface">Personal Spending</h1>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Link href="/spending" className="btn-secondary" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>analytics</span>
            Analysis
          </Link>
          <Link href="/expenses/add" className="btn-primary" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
            Add Expense
          </Link>
        </div>
      </div>

      {/* Top Bento Cards */}
      <div className="bento-grid bento-grid-12">
        {/* Summary Card (8 cols) */}
        <div
          className="card col-span-8"
          style={{
            padding: 'var(--space-xl)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 240,
          }}
        >
          <div className="glow-primary" />

          <div>
            <p className="text-label-md text-secondary" style={{ marginBottom: 4 }}>
              Total personal spending this month
            </p>
            <div className="text-display-financial text-on-surface" style={{ marginBottom: 'var(--space-lg)' }}>
              {formatCents(totalSpentCents, house.currency)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
              <div>
                <span className="text-label-sm text-secondary uppercase tracking-wider">Budget</span>
                <p className="text-headline-md text-on-surface">
                  {formatCents(budget_cents, house.currency)}
                </p>
              </div>

              <div style={{ width: 1, height: 32, backgroundColor: 'var(--color-surface-container-high)' }} />

              <div>
                <span className="text-label-sm text-secondary uppercase tracking-wider">Remaining</span>
                <p className="text-headline-md text-primary font-bold">
                  {formatCents(remainingCents, house.currency)}
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span className="text-secondary">{budgetUsedPct}% of budget used</span>
              <span className="text-primary font-semibold">On Track</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${budgetUsedPct}%` }} />
            </div>
          </div>
        </div>

        {/* Quick Action CTA Card (4 cols) */}
        <div
          className="col-span-4"
          style={{
            backgroundColor: 'var(--color-primary-container)',
            color: 'var(--color-on-primary-container)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxShadow: 'var(--shadow-level-1)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-md)',
            }}
          >
            <span className="material-symbols-outlined filled" style={{ fontSize: 32, color: '#ffffff' }}>
              add_card
            </span>
          </div>

          <h3 className="text-headline-md" style={{ color: '#ffffff', marginBottom: 4 }}>
            Record a Purchase
          </h3>
          <p className="text-body-md" style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14, marginBottom: 'var(--space-lg)' }}>
            Keep your personal spending accurate by logging expenses quickly.
          </p>

          <Link
            href="/expenses/add"
            className="btn-primary"
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
            Add Expense
          </Link>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div style={{ display: 'flex', gap: 'var(--space-xs)', overflowX: 'auto', paddingBottom: 4 }}>
        <button
          type="button"
          onClick={() => setSelectedCat('All')}
          className={`badge ${selectedCat === 'All' ? 'badge-admin' : 'badge-member'}`}
          style={{ padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
        >
          All ({expenses.length})
        </button>
        {EXPENSE_CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCat(cat)}
            className={`badge ${selectedCat === cat ? 'badge-admin' : 'badge-member'}`}
            style={{ padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
          >
            {CATEGORY_ICONS[cat]} {cat}
          </button>
        ))}
      </div>

      {/* Recent Expenses List */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>
          Recent Transactions
        </h2>

        {filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state-icon">receipt_long</span>
            <h3>No expenses in this category</h3>
            <p>Log a purchase to start tracking your personal finances.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredExpenses.map((exp, idx) => {
              const icon = CATEGORY_ICONS[exp.category] || '💡';
              return (
                <div
                  key={exp.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-md) 0',
                    borderBottom: idx === filteredExpenses.length - 1 ? 'none' : '1px solid var(--color-surface-container-low)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-surface-container)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      {icon}
                    </div>

                    <div>
                      <p className="text-headline-md" style={{ fontSize: 16 }}>{exp.title}</p>
                      <p className="text-label-sm text-secondary">
                        {exp.date} • {exp.category} {exp.note && `• ${exp.note}`}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p className="text-headline-md text-on-surface" style={{ fontSize: 18 }}>
                      {formatCents(exp.amount_cents, house.currency)}
                    </p>
                    <span className="badge badge-member" style={{ fontSize: 10, marginTop: 2 }}>
                      Personal
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
