'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMyExpenses } from '@/lib/expenses';
import { getMyBudget } from '@/lib/budgets';
import { getUserHouse } from '@/lib/houses';
import { formatCents, CATEGORY_ICONS, EXPENSE_CATEGORIES, currentMonthYear } from '@/lib/money';
import EmptyState from '@/components/EmptyState';

/**
 * Personal Expenses Log Page — live multi-user data (strictly private)
 * Matches Stitch design: my_expenses_housemate/screen.png
 */
export default function ExpensesPage() {
  const [house, setHouse] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('All');

  useEffect(() => {
    async function loadData() {
      const monthYear = currentMonthYear();
      const [hData, expData, bData] = await Promise.all([
        getUserHouse(),
        getMyExpenses(monthYear),
        getMyBudget(monthYear),
      ]);

      setHouse(hData);
      setExpenses(expData);
      setBudget(bData);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)' }}>
        <div className="skeleton" style={{ height: 40, width: 250, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const budgetCents = budget?.budget_cents ?? 0;
  const totalSpentCents = expenses.reduce((sum, e) => sum + e.amount_cents, 0);
  const remainingCents = Math.max(0, budgetCents - totalSpentCents);
  const budgetUsedPct = budgetCents > 0 ? Math.min(100, Math.round((totalSpentCents / budgetCents) * 100)) : 0;

  const filteredExpenses = expenses.filter(e => {
    if (selectedCat === 'All') return true;
    return e.category === selectedCat;
  });

  const monthName = new Date().toLocaleString('en-US', { month: 'long' });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <p className="text-label-md text-secondary" style={{ marginBottom: 2 }}>
            My Private Money / {monthName}
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
              {formatCents(totalSpentCents, house?.currency)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
              <div>
                <span className="text-label-sm text-secondary uppercase tracking-wider">Monthly Budget</span>
                <p className="text-headline-md text-on-surface">
                  {budgetCents > 0 ? formatCents(budgetCents, house?.currency) : 'Not set'}
                </p>
              </div>

              {budgetCents > 0 && (
                <>
                  <div style={{ width: 1, height: 32, backgroundColor: 'var(--color-surface-container-high)' }} />

                  <div>
                    <span className="text-label-sm text-secondary uppercase tracking-wider">Remaining</span>
                    <p className="text-headline-md text-primary font-bold">
                      {formatCents(remainingCents, house?.currency)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {budgetCents > 0 && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span className="text-secondary">{budgetUsedPct}% of budget used</span>
                <span className="text-primary font-semibold">{budgetUsedPct > 100 ? 'Over Budget' : 'On Track'}</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${budgetUsedPct}%`, backgroundColor: budgetUsedPct > 100 ? 'var(--color-error)' : undefined }} />
              </div>
            </div>
          )}

          {budgetCents === 0 && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Link href="/budget" className="text-label-md text-primary font-semibold" style={{ textDecoration: 'none' }}>
                Set a monthly budget →
              </Link>
            </div>
          )}
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
          <EmptyState
            icon="🛍️"
            title="No expenses logged yet"
            description="Log your daily coffee, transport, or groceries to see where your money goes."
            actionLabel="Add First Expense"
            actionHref="/expenses/add"
          />
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p className="text-headline-md" style={{ fontSize: 16 }}>{exp.title}</p>
                        <Link href={`/expenses/${exp.id}/edit`} style={{ color: 'var(--color-secondary)', fontSize: 14 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </Link>
                      </div>
                      <p className="text-label-sm text-secondary">
                        {exp.date} • {exp.category} {exp.note && `• ${exp.note}`}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p className="text-headline-md text-on-surface" style={{ fontSize: 18 }}>
                      {formatCents(exp.amount_cents, house?.currency)}
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
