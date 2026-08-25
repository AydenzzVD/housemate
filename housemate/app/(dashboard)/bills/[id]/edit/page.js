'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBillById, updateBill, deactivateBill, deleteBill, getBillCycleCount } from '@/lib/bills';
import { getUserHouse } from '@/lib/houses';
import { parseToCents, formatCents } from '@/lib/money';

/**
 * Edit / Deactivate / Delete Bill Page (Admin Only)
 * Allows updating future cycle parameters while leaving historical cycles frozen.
 */
export default function EditBillPage({ params }) {
  const unwrappedParams = use(params);
  const billId = unwrappedParams.id;
  const router = useRouter();

  const [house, setHouse] = useState(null);
  const [bill, setBill] = useState(null);
  const [cycleCount, setCycleCount] = useState(0);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDayOfMonth, setDueDayOfMonth] = useState(1);
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function loadBill() {
      const [hData, bData, count] = await Promise.all([
        getUserHouse(),
        getBillById(billId),
        getBillCycleCount(billId),
      ]);

      setHouse(hData);
      setCycleCount(count);

      if (bData && bData.bill) {
        const b = bData.bill;
        setBill(b);
        setName(b.name);
        setAmount((b.total_amount_cents / 100).toFixed(2));
        setDueDayOfMonth(b.due_day_of_month);
        setCategory(b.category || 'general');
      }
      setLoading(false);
    }
    loadBill();
  }, [billId]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)', maxWidth: 600, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!bill) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <h2>Bill not found</h2>
        <Link href="/house" className="btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
          Back to House
        </Link>
      </div>
    );
  }

  const totalCents = parseToCents(amount);

  async function handleUpdate(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Bill name cannot be empty.');
      return;
    }
    if (totalCents <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setError('');
    setSaving(true);

    const { error: updateErr } = await updateBill(bill.id, {
      name: name.trim(),
      totalAmountCents: totalCents,
      dueDayOfMonth: parseInt(dueDayOfMonth, 10),
      category,
    });

    if (updateErr) {
      setError(updateErr);
      setSaving(false);
      return;
    }

    router.push(`/bills/${bill.id}`);
    router.refresh();
  }

  async function handleDeactivate() {
    setSaving(true);
    const { error: deactErr } = await deactivateBill(bill.id);
    if (deactErr) {
      setError(deactErr);
      setSaving(false);
    } else {
      router.push('/house');
      router.refresh();
    }
  }

  async function handleDelete() {
    setSaving(true);
    const { error: delErr } = await deleteBill(bill.id);
    if (delErr) {
      setError(delErr);
      setSaving(false);
      setShowDeleteConfirm(false);
    } else {
      router.push('/house');
      router.refresh();
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Link href={`/bills/${bill.id}`} className="btn-icon" style={{ textDecoration: 'none' }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-headline-lg text-on-surface">Edit Bill</h1>
      </div>

      {error && (
        <div className="error-message">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
          {error}
        </div>
      )}

      <form onSubmit={handleUpdate} className="card" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <h2 className="text-headline-md text-on-surface">Bill Settings</h2>

        <div>
          <label htmlFor="edit-name" className="input-label">Bill Name</label>
          <input
            id="edit-name"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="edit-amount" className="input-label">Total Amount ({house?.currency})</label>
          <input
            id="edit-amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="input-field"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div>
            <label htmlFor="edit-day" className="input-label">Due Day of Month</label>
            <input
              id="edit-day"
              type="number"
              min="1"
              max="28"
              required
              value={dueDayOfMonth}
              onChange={e => setDueDayOfMonth(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="edit-cat" className="input-label">Category</label>
            <div className="select-wrapper">
              <select
                id="edit-cat"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="select-field"
              >
                <option value="general">General</option>
                <option value="rent">House Rent</option>
                <option value="electricity">Electricity</option>
                <option value="water">Water</option>
                <option value="wifi">Wi-Fi</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
          <Link href={`/bills/${bill.id}`} className="btn-secondary" style={{ flex: 1, textDecoration: 'none' }}>
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 2 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Danger Zone: Deactivate vs Delete */}
      <div className="card" style={{ padding: 'var(--space-xl)', border: '1px solid var(--color-outline-variant)' }}>
        <h3 className="text-headline-md text-on-surface" style={{ color: 'var(--color-error)', marginBottom: 'var(--space-xs)' }}>
          Danger Zone
        </h3>
        <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-md)' }}>
          Deactivating a bill hides it from future billing cycles while retaining all past payment history.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={saving}
            className="btn-secondary"
            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
          >
            Deactivate Bill (Preserve History)
          </button>

          {cycleCount === 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving}
              className="btn-secondary"
              style={{ backgroundColor: 'var(--color-error)', color: 'white', border: 'none' }}
            >
              Permanently Delete
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 400, padding: 'var(--space-xl)' }}>
            <h3 className="text-headline-md" style={{ color: 'var(--color-error)', marginBottom: 8 }}>
              Permanently Delete Bill?
            </h3>
            <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-md)' }}>
              This cannot be undone. This bill has 0 payment cycles.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={handleDelete} className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--color-error)' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
