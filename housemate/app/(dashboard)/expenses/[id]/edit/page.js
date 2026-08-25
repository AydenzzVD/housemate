'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getExpenseById, updateExpense, deleteExpense } from '@/lib/expenses';
import { getUserHouse } from '@/lib/houses';
import { parseToCents, CATEGORY_ICONS, EXPENSE_CATEGORIES } from '@/lib/money';

/**
 * Edit / Delete Personal Expense Page (Own Only — RLS Enforced)
 */
export default function EditExpensePage({ params }) {
  const unwrappedParams = use(params);
  const expenseId = unwrappedParams.id;
  const router = useRouter();

  const [house, setHouse] = useState(null);
  const [expense, setExpense] = useState(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      const [hData, expData] = await Promise.all([
        getUserHouse(),
        getExpenseById(expenseId),
      ]);

      setHouse(hData);
      if (expData) {
        setExpense(expData);
        setTitle(expData.title);
        setAmount((expData.amount_cents / 100).toFixed(2));
        setCategory(expData.category);
        setDate(expData.date);
        setNote(expData.note || '');
      }
      setLoading(false);
    }
    loadData();
  }, [expenseId]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)', maxWidth: 640, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 350, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!expense) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <h2>Expense not found</h2>
        <Link href="/expenses" className="btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
          Back to Expenses
        </Link>
      </div>
    );
  }

  async function handleUpdate(e) {
    e.preventDefault();
    const cents = parseToCents(amount);
    if (cents <= 0) {
      setError('Please enter a valid expense amount.');
      return;
    }

    setError('');
    setSaving(true);

    const { error: updateErr } = await updateExpense(expenseId, {
      title: title.trim() || `${category} Expense`,
      amountCents: cents,
      category,
      date,
      note: note.trim() || null,
    });

    if (updateErr) {
      setError(updateErr);
      setSaving(false);
      return;
    }

    router.push('/expenses');
    router.refresh();
  }

  async function handleDelete() {
    setSaving(true);
    const { error: delErr } = await deleteExpense(expenseId);
    if (delErr) {
      setError(delErr);
      setSaving(false);
    } else {
      router.push('/expenses');
      router.refresh();
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Link href="/expenses" className="btn-icon" style={{ textDecoration: 'none' }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-headline-lg text-on-surface">Edit Expense</h1>
      </div>

      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        {error && (
          <div className="error-message" style={{ marginBottom: 'var(--space-md)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Amount Display */}
          <div>
            <label htmlFor="edit-exp-amount" className="input-label">Amount ({house?.currency || '$'})</label>
            <input
              id="edit-exp-amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="input-field"
              style={{ fontSize: 20, fontWeight: 700 }}
            />
          </div>

          <div>
            <label htmlFor="edit-exp-title" className="input-label">Title / Description</label>
            <input
              id="edit-exp-title"
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="input-label" style={{ marginBottom: 'var(--space-sm)' }}>Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 'var(--space-xs)' }}>
              {EXPENSE_CATEGORIES.map(cat => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: 'var(--space-sm)',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-outline-variant)',
                      backgroundColor: isSelected ? 'rgba(0, 74, 198, 0.08)' : 'transparent',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{CATEGORY_ICONS[cat]}</span>
                    <span className="text-label-sm">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="edit-exp-date" className="input-label">Date</label>
            <input
              id="edit-exp-date"
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="edit-exp-note" className="input-label">Note (Optional)</label>
            <textarea
              id="edit-exp-note"
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="btn-secondary"
              style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
            >
              Delete
            </button>

            <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
