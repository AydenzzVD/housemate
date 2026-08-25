'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addExpense } from '@/lib/expenses';
import { getUserHouse } from '@/lib/houses';
import { parseToCents, CATEGORY_ICONS, EXPENSE_CATEGORIES } from '@/lib/money';
import { useLanguage } from '@/lib/lang/useLanguage';

/**
 * Add Personal Expense Page — live multi-user data
 * Matches Stitch design: add_expense_housemate/screen.png
 */
export default function AddExpensePage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [house, setHouse] = useState(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadHouse() {
      const hData = await getUserHouse();
      setHouse(hData);
    }
    loadHouse();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    const cents = parseToCents(amount);

    if (cents <= 0) {
      setError(t('bills.error_amount'));
      return;
    }

    setError('');
    setLoading(true);

    const { error: addError } = await addExpense({
      title: title.trim() || `${category} Expense`,
      amountCents: cents,
      category,
      date,
      note: note.trim() || null,
    });

    if (addError) {
      setError(addError);
      setLoading(false);
      return;
    }

    router.push('/expenses');
    router.refresh();
  }

  return (
    <div className="fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <Link href="/expenses" className="btn-icon" style={{ textDecoration: 'none' }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-headline-lg text-on-surface">{t('expenses.add_title')}</h1>
      </div>

      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        {error && (
          <div className="error-message" style={{ marginBottom: 'var(--space-md)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Big Amount Focal Display */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-lg) 0',
              borderBottom: '1px solid var(--color-surface-container)',
            }}
          >
            <span className="text-label-sm text-secondary uppercase tracking-wider" style={{ marginBottom: 4 }}>
              {t('expenses.amount_label')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary)' }}>
              <span className="text-display-financial" style={{ marginRight: 4 }}>
                {house?.currency || '$'}
              </span>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                style={{
                  width: 200,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  textAlign: 'center',
                  fontSize: 'var(--text-display-financial-size)',
                  fontWeight: 700,
                  color: 'var(--color-on-surface)',
                }}
              />
            </div>
          </div>

          {/* Title input */}
          <div>
            <label htmlFor="title" className="input-label">
              {t('expenses.expense_title_label')}
            </label>
            <input
              id="title"
              type="text"
              placeholder={t('expenses.expense_title_placeholder')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Category Grid */}
          <div>
            <label className="input-label" style={{ marginBottom: 'var(--space-sm)' }}>
              {t('expenses.category_label')}
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: 'var(--space-xs)',
              }}
            >
              {EXPENSE_CATEGORIES.map(cat => {
                const isSelected = category === cat;
                const translatedCat = t(`expense_categories.${cat}`) || cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 'var(--space-sm)',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-outline-variant)',
                      backgroundColor: isSelected ? 'rgba(0, 74, 198, 0.08)' : 'var(--color-surface-container-lowest)',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: 24, marginBottom: 4 }}>{CATEGORY_ICONS[cat]}</span>
                    <span className="text-label-sm" style={{ fontWeight: isSelected ? 700 : 500 }}>
                      {translatedCat}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label htmlFor="date" className="input-label">
              {t('expenses.date_label')}
            </label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Note Input */}
          <div>
            <label htmlFor="note" className="input-label">
              {t('expenses.note_label')}
            </label>
            <textarea
              id="note"
              rows={2}
              placeholder={t('expenses.note_placeholder')}
              value={note}
              onChange={e => setNote(e.target.value)}
              className="input-field"
              style={{ minHeight: 70, resize: 'none' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
            <Link href="/expenses" className="btn-secondary" style={{ flex: 1, textDecoration: 'none' }}>
              {t('common.cancel')}
            </Link>
            <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check</span>
              {loading ? t('expenses.saving') : t('expenses.save_btn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
