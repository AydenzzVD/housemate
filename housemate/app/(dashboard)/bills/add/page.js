'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getLocalStore, saveLocalStore } from '@/lib/store';
import { parseToCents, formatCents } from '@/lib/money';

/**
 * Add New Shared Bill Page
 *
 * Matches Stitch design: add_bill_housemate/screen.png
 *
 * Form area:
 * - Bill Name (e.g. Wi-Fi, Electricity, Rent)
 * - Amount ($)
 * - Frequency (One time, Monthly, Every 3 months, Yearly)
 * - Due Date
 * - Split Method: Equally
 *
 * Live Bento Preview:
 * - Total Amount
 * - Split among N people
 * - Your Share ($X.XX)
 * - Savings tip
 */
export default function AddBillPage() {
  const router = useRouter();
  const [store, setStore] = useState(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('45.00');
  const [frequency, setFrequency] = useState('monthly');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setStore(getLocalStore());
    // Default due date = 1st of next month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    setDueDate(nextMonth.toISOString().split('T')[0]);
  }, []);

  if (!store) return null;

  const { house, members, bills } = store;
  const memberCount = members.length || 5;

  // Live calculation
  const totalCents = parseToCents(amount);
  const shareCents = memberCount > 0 ? Math.round(totalCents / memberCount) : totalCents;
  const monthlySavingCents = frequency === 'quarterly' ? Math.round(shareCents / 3) : 0;

  async function handleSaveBill(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a bill name.');
      return;
    }

    if (totalCents <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);

    const newBill = {
      id: `bill-${Date.now()}`,
      name: name.trim(),
      total_amount_cents: totalCents,
      frequency,
      due_day_of_month: parseInt(dueDate.split('-')[2] || '1', 10),
      category: name.toLowerCase().includes('rent')
        ? 'rent'
        : name.toLowerCase().includes('electr')
        ? 'electricity'
        : name.toLowerCase().includes('water')
        ? 'water'
        : name.toLowerCase().includes('wifi') || name.toLowerCase().includes('wi-fi')
        ? 'wifi'
        : 'general',
      is_active: true,
    };

    const nextBills = [...bills, newBill];
    const nextStore = { ...store, bills: nextBills };
    saveLocalStore(nextStore);

    router.push('/house');
    router.refresh();
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Link href="/house" className="btn-icon" style={{ textDecoration: 'none' }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-headline-lg text-on-surface">Add New Bill</h1>
      </div>

      {error && (
        <div className="error-message">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
          {error}
        </div>
      )}

      {/* 2-Column Bento Form + Preview */}
      <div className="bento-grid bento-grid-12">
        {/* Left Column: Bill Inputs (7 cols) */}
        <form onSubmit={handleSaveBill} className="col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-lg)' }}>
              Bill Details
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Bill Name */}
              <div>
                <label htmlFor="bill-name" className="input-label">
                  Bill Name
                </label>
                <input
                  id="bill-name"
                  type="text"
                  required
                  placeholder="e.g., Wi-Fi, Electricity, House Rent"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field"
                  autoFocus
                />
              </div>

              {/* Total Amount */}
              <div>
                <label htmlFor="bill-amount" className="input-label">
                  Total Amount ({house.currency})
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 'var(--space-md)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 20,
                      fontWeight: 600,
                      color: 'var(--color-secondary)',
                    }}
                  >
                    {house.currency}
                  </span>
                  <input
                    id="bill-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input-field"
                    style={{
                      paddingLeft: 'calc(var(--space-md) + 16px)',
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              {/* Grid: Frequency + Due Date */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                <div>
                  <label htmlFor="bill-freq" className="input-label">
                    Frequency
                  </label>
                  <div className="select-wrapper">
                    <select
                      id="bill-freq"
                      value={frequency}
                      onChange={e => setFrequency(e.target.value)}
                      className="select-field"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Every 3 months (Quarterly)</option>
                      <option value="semi_annual">Every 6 months</option>
                      <option value="yearly">Yearly</option>
                      <option value="one_time">One time</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="bill-date" className="input-label">
                    Due Date
                  </label>
                  <input
                    id="bill-date"
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Split Details Section */}
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-sm)' }}>
              Split Details
            </h2>
            <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-md)' }}>
              Automatically split equally among all {memberCount} active housemates.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              {members.map(m => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface-container-low)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div className="avatar avatar-sm">{m.avatar || m.full_name[0]}</div>
                    <span className="text-body-md text-on-surface">{m.full_name}</span>
                  </div>
                  <span className="text-label-md text-primary font-semibold">
                    {formatCents(shareCents, house.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons for Mobile Form */}
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <Link href="/house" className="btn-secondary" style={{ flex: 1, textDecoration: 'none' }}>
              Cancel
            </Link>
            <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>save</span>
              {loading ? 'Saving Bill...' : 'Save Bill'}
            </button>
          </div>
        </form>

        {/* Right Column: Live Bento Preview (5 cols) */}
        <div className="col-span-5">
          <div
            style={{
              position: 'sticky',
              top: 'var(--space-xl)',
              background: 'linear-gradient(135deg, var(--color-primary-container), var(--color-primary))',
              color: 'var(--color-on-primary)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-xl)',
              boxShadow: 'var(--shadow-level-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="text-headline-md" style={{ color: '#ffffff' }}>
                Bill Preview
              </h3>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
            </div>

            {/* Total Amount Big Display */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>
                Total Amount
              </span>
              <div className="text-display-financial" style={{ color: '#ffffff', margin: '4px 0' }}>
                {formatCents(totalCents, house.currency)}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>sync</span>
                {frequency === 'quarterly' ? 'Every 3 months' : frequency === 'monthly' ? 'Monthly' : frequency}
              </div>
            </div>

            {/* Split Breakdown Box */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-md)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.9, fontSize: 14 }}>Split amongst</span>
                <span className="font-semibold">{memberCount} people</span>
              </div>

              <div className="divider" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.9, fontSize: 14 }}>Your Share</span>
                <span className="text-headline-lg font-bold" style={{ color: '#ffffff' }}>
                  {formatCents(shareCents, house.currency)}
                </span>
              </div>
            </div>

            {/* Wi-Fi Quarterly Saving Banner */}
            {monthlySavingCents > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--color-tertiary-fixed)',
                  color: 'var(--color-on-tertiary-fixed)',
                  padding: 'var(--space-sm) var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  fontSize: 'var(--text-label-sm-size)',
                  fontWeight: 600,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>savings</span>
                <span>Save {formatCents(monthlySavingCents, house.currency)}/month towards this bill</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
