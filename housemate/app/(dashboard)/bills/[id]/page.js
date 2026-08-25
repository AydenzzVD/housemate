'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getBillById } from '@/lib/bills';
import { getMySavings, addSavingDeposit } from '@/lib/savings';
import { getUserHouse } from '@/lib/houses';
import { formatCents } from '@/lib/money';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Bill Details Page — live multi-user data
 * Matches Stitch design: bill_details_housemate/screen.png
 */
export default function BillDetailsPage({ params }) {
  const unwrappedParams = use(params);
  const billId = unwrappedParams.id;

  const [billData, setBillData] = useState(null);
  const [house, setHouse] = useState(null);
  const [savings, setSavings] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingsDeposit, setSavingsDeposit] = useState('3.00');
  const [showSavingModal, setShowSavingModal] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function loadData() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const [bData, hData, sData] = await Promise.all([
        getBillById(billId),
        getUserHouse(),
        getMySavings(billId),
      ]);

      setBillData(bData);
      setHouse(hData);
      setSavings(sData);
      setLoading(false);
    }
    loadData();
  }, [billId]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)', maxWidth: 880, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 250, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!billData || !billData.bill) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <h2>Bill not found</h2>
        <Link href="/house" className="btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
          Back to House
        </Link>
      </div>
    );
  }

  const { bill, latestCycle, payments } = billData;
  const isAdmin = house?.myRole === 'admin';

  // Per-member share from frozen bill_payments
  const myPayment = payments.find(p => p.user_id === currentUserId);
  const shareCents = myPayment?.share_amount_cents || (payments.length > 0 ? payments[0].share_amount_cents : Math.round(bill.total_amount_cents / 1));

  const isWifi = bill.category === 'wifi' || bill.name.toLowerCase().includes('wifi') || bill.name.toLowerCase().includes('wi-fi') || bill.frequency === 'quarterly';
  const monthlyTargetCents = isWifi ? Math.round(shareCents / 3) : 0;

  // Actual saved cents by current user for this bill
  const actualSavedCents = savings.reduce((sum, s) => sum + s.amount_cents, 0);
  const remainingNeededCents = Math.max(0, shareCents - actualSavedCents);
  const savingPercentage = shareCents > 0 ? Math.min(100, Math.round((actualSavedCents / shareCents) * 100)) : 0;

  async function handleRecordSaving(e) {
    e.preventDefault();
    const depositCents = Math.round(parseFloat(savingsDeposit || '0') * 100);
    if (depositCents <= 0) return;

    const { error } = await addSavingDeposit({
      billId: bill.id,
      amountCents: depositCents,
      savedDate: new Date().toISOString().split('T')[0],
      note: 'Wi-Fi saving deposit',
    });

    if (error) {
      setToast(`❌ ${error}`);
    } else {
      setShowSavingModal(false);
      setToast(`✓ Recorded ${formatCents(depositCents, house?.currency)} towards ${bill.name}!`);
      // Refresh savings list
      const updatedSavings = await getMySavings(bill.id);
      setSavings(updatedSavings);
    }
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: 880, margin: '0 auto' }}>
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Link href="/house" className="btn-icon" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <span style={{ fontSize: 32 }}>{isWifi ? '📶' : '⚡'}</span>
          <h1 className="text-headline-lg text-on-surface">{bill.name}</h1>
        </div>

        {isAdmin && (
          <Link href={`/bills/${bill.id}/edit`} className="btn-secondary" style={{ padding: '6px 16px', borderRadius: 'var(--radius-full)', textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
            Edit Bill
          </Link>
        )}
      </div>

      {/* Bento Grid Top Area */}
      <div className="bento-grid bento-grid-2">
        {/* Bill Summary Card */}
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <p className="text-label-sm text-secondary uppercase tracking-wider mb-xs">
            Bill Summary
          </p>
          <div className="text-display-financial text-primary" style={{ marginBottom: 'var(--space-md)' }}>
            {formatCents(bill.total_amount_cents, house?.currency)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-surface-container)' }}>
              <span className="text-body-md text-secondary">Frequency</span>
              <span className="text-label-md font-semibold text-on-surface">
                {bill.frequency === 'quarterly' ? 'Every 3 months' : bill.frequency === 'monthly' ? 'Monthly' : bill.frequency}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-surface-container)' }}>
              <span className="text-body-md text-secondary">Next Due Date</span>
              <span className="text-label-md font-semibold text-on-surface">
                {latestCycle ? new Date(latestCycle.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Day ${bill.due_day_of_month} of month`}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span className="text-body-md text-secondary">Split</span>
              <span className="text-label-md font-semibold text-on-surface">{payments.length || 1} roommates</span>
            </div>
          </div>
        </div>

        {/* Right Stack: Your Share + Wi-Fi Saving Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Your Share Card */}
          <div
            style={{
              backgroundColor: 'var(--color-primary-container)',
              color: 'var(--color-on-primary-container)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              boxShadow: 'var(--shadow-level-1)',
            }}
          >
            <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85 }}>
              Your Share
            </span>
            <div className="text-display-financial" style={{ color: '#ffffff', margin: '4px 0' }}>
              {formatCents(shareCents, house?.currency)}
            </div>
            <p className="text-body-md" style={{ opacity: 0.9 }}>
              {latestCycle ? `Due by ${new Date(latestCycle.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : `Due on Day ${bill.due_day_of_month}`}
            </p>
          </div>

          {/* Wi-Fi Saving Tracker Card */}
          {isWifi && (
            <div className="card" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                <h3 className="text-headline-md text-on-surface" style={{ fontSize: 18 }}>
                  Wi-Fi Saving Tracker
                </h3>
                <span className="badge badge-member" style={{ backgroundColor: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)' }}>
                  Save: {formatCents(monthlyTargetCents, house?.currency)}/mo
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '8px 0 6px' }}>
                <span className="text-primary font-bold">
                  Saved {formatCents(actualSavedCents, house?.currency)}
                </span>
                <span className="text-secondary">
                  Remaining {formatCents(remainingNeededCents, house?.currency)}
                </span>
              </div>

              <div className="progress-bar-track" style={{ height: 8, marginBottom: 'var(--space-md)' }}>
                <div className="progress-bar-fill" style={{ width: `${savingPercentage}%` }} />
              </div>

              <button
                type="button"
                onClick={() => setShowSavingModal(true)}
                className="btn-secondary"
                style={{ width: '100%', minHeight: 38, fontSize: 13 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>savings</span>
                Record Saved Deposit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Status Section */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <h3 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>
          Roommate Payment Status ({latestCycle ? 'Current Cycle' : 'No cycle open'})
        </h3>

        {payments.length === 0 ? (
          <p className="text-body-md text-secondary">No payment records found for this bill cycle.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {payments.map(p => {
              const isMe = p.user_id === currentUserId;
              const pPaid = p.status === 'paid';
              const name = p.profiles?.full_name || 'Member';

              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-surface-container-low)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div
                      className="avatar avatar-sm"
                      style={{
                        backgroundColor: isMe ? 'var(--color-primary-container)' : 'var(--color-surface-container)',
                        color: isMe ? 'var(--color-on-primary-container)' : 'var(--color-on-surface)',
                      }}
                    >
                      {name[0].toUpperCase()}
                    </div>
                    <span className="text-body-md text-on-surface font-medium">
                      {name} {isMe && '(You)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <span className="text-body-md font-semibold text-on-surface">
                      {formatCents(p.share_amount_cents, house?.currency)}
                    </span>
                    <span className={`badge ${pPaid ? 'badge-paid' : 'badge-overdue'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        {pPaid ? 'check_circle' : 'hourglass_empty'}
                      </span>
                      {pPaid ? 'Paid' : 'Waiting'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showSavingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-md)',
          }}
        >
          <div className="card fade-in" style={{ width: '100%', maxWidth: 400, padding: 'var(--space-xl)' }}>
            <h3 className="text-headline-md text-on-surface" style={{ marginBottom: 4 }}>
              Record Wi-Fi Savings
            </h3>
            <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-md)' }}>
              Log how much you have set aside for this bill.
            </p>

            <form onSubmit={handleRecordSaving} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label htmlFor="deposit" className="input-label">Deposit Amount ($)</label>
                <input
                  id="deposit"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={savingsDeposit}
                  onChange={e => setSavingsDeposit(e.target.value)}
                  className="input-field"
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button
                  type="button"
                  onClick={() => setShowSavingModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Save Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
