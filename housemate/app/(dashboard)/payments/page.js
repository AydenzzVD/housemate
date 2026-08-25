'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUserHouse } from '@/lib/houses';
import { getCurrentCyclePayments, toggleMyPayment } from '@/lib/payments';
import { formatCents } from '@/lib/money';
import EmptyState from '@/components/EmptyState';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Payment Status Matrix Page — live multi-user data
 * Matches Stitch design: payment_status_housemate/screen.png
 */
export default function PaymentsPage() {
  const [house, setHouse] = useState(null);
  const [cycleGroups, setCycleGroups] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function loadData() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const hData = await getUserHouse();
      setHouse(hData);

      if (hData) {
        const groups = await getCurrentCyclePayments(hData.id);
        setCycleGroups(groups);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)' }}>
        <div className="skeleton" style={{ height: 40, width: 250, marginBottom: 'var(--space-md)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-md)' }}>
          <div className="skeleton" style={{ height: 250, borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ height: 250, borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    );
  }

  if (!house) return null;

  // Flatten all payments across all active open cycles
  const allPayments = cycleGroups.flatMap(g => g.payments);
  const paidCount = allPayments.filter(p => p.status === 'paid').length;
  const totalCount = allPayments.length;
  const progressPercent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  const totalCents = allPayments.reduce((sum, p) => sum + p.share_amount_cents, 0);
  const collectedCents = allPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.share_amount_cents, 0);
  const remainingCents = totalCents - collectedCents;

  const myPayments = allPayments.filter(p => p.user_id === currentUserId);
  const isAllMyPaid = myPayments.length > 0 && myPayments.every(p => p.status === 'paid');

  async function handleToggleMyPayments() {
    const newStatus = isAllMyPaid ? 'pending' : 'paid';
    for (const p of myPayments) {
      await toggleMyPayment(p.id, newStatus);
    }
    setToast(newStatus === 'paid' ? '✓ All your shares marked as Paid!' : '↩ Shares marked as Unpaid');
    // Refresh
    const updated = await getCurrentCyclePayments(house.id);
    setCycleGroups(updated);
    setTimeout(() => setToast(''), 3000);
  }

  const monthName = new Date().toLocaleString('en-US', { month: 'long' });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 className="text-headline-lg text-on-surface" style={{ marginBottom: 4 }}>
            {monthName} Payment Matrix
          </h1>
          <p className="text-body-md text-secondary">
            Total commitment &amp; status for all open house bills
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {myPayments.length > 0 && (
            <button
              type="button"
              onClick={handleToggleMyPayments}
              className="btn-secondary"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {isAllMyPaid ? 'check_circle' : 'hourglass_empty'}
              </span>
              {isAllMyPaid ? 'Mark as Waiting' : 'Mark My Share as Paid'}
            </button>
          )}

          <Link href="/payment-message" className="btn-primary" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chat</span>
            Generate Payment Message
          </Link>
        </div>
      </div>

      {cycleGroups.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <EmptyState
            icon="💳"
            title="No active bill cycles"
            description="Active bill cycles will appear here when bills are generated."
            actionLabel={house.myRole === 'admin' ? "Add Bill" : null}
            actionHref="/bills/add"
          />
        </div>
      ) : (
        /* Main Grid */
        <div className="bento-grid bento-grid-12">
          {/* Left Column: Summary & Stats (4 cols) */}
          <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Total Amount Card */}
            <div
              className="card"
              style={{
                padding: 'var(--space-xl)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(0, 74, 198, 0.1)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-md)',
                }}
              >
                <span className="material-symbols-outlined filled">attach_money</span>
              </div>
              <p className="text-label-md text-secondary" style={{ marginBottom: 4 }}>
                Total House Commitment
              </p>
              <h2 className="text-display-financial text-on-surface">
                {formatCents(totalCents, house.currency)}
              </h2>
            </div>

            {/* Progress Card */}
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-md)' }}>
                <div>
                  <p className="text-label-md text-secondary">Payment Progress</p>
                  <p className="text-headline-md text-on-surface" style={{ marginTop: 2 }}>
                    {paidCount} / {totalCount} Paid
                  </p>
                </div>

                <span className="badge badge-admin">
                  {progressPercent}%
                </span>
              </div>

              <div className="progress-bar-track" style={{ marginBottom: 'var(--space-lg)' }}>
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', fontSize: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-success)' }}>
                      check_circle
                    </span>
                    Collected
                  </span>
                  <span className="font-semibold text-on-surface">
                    {formatCents(collectedCents, house.currency)}
                  </span>
                </div>

                <div className="divider" />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-warning)' }}>
                      pending
                    </span>
                    Remaining
                  </span>
                  <span className="font-semibold text-on-surface">
                    {formatCents(remainingCents, house.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Member Payment List (8 cols) */}
          <div className="col-span-8">
            <div className="card" style={{ padding: 'var(--space-xl)', minHeight: '100%' }}>
              <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-lg)' }}>
                Member Shares Breakdown
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {cycleGroups.map(group => (
                  <div key={group.cycle.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                      <h3 className="text-headline-md" style={{ fontSize: 16 }}>{group.bill?.name}</h3>
                      <span className="text-label-sm text-secondary">
                        Due: {new Date(group.cycle.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {group.payments.map(p => {
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
                            padding: 'var(--space-md)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: isMe ? 'rgba(0, 74, 198, 0.04)' : 'var(--color-surface-container-low)',
                            border: isMe ? '1.5px solid var(--color-primary-fixed-dim)' : '1px solid transparent',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <div
                              className="avatar avatar-md"
                              style={{
                                backgroundColor: isMe ? 'var(--color-primary-container)' : 'var(--color-secondary-container)',
                                color: isMe ? 'var(--color-on-primary-container)' : 'var(--color-on-secondary-container)',
                              }}
                            >
                              {name[0].toUpperCase()}
                            </div>

                            <div>
                              <p className="text-headline-md" style={{ fontSize: 16 }}>
                                {name} {isMe && '(You)'}
                              </p>
                              <p className="text-label-sm text-secondary">
                                Share of {group.bill?.name}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <span className="text-headline-md text-on-surface" style={{ fontSize: 18 }}>
                              {formatCents(p.share_amount_cents, house.currency)}
                            </span>

                            <span className={`badge ${pPaid ? 'badge-paid' : 'badge-overdue'}`}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                {pPaid ? 'check' : 'hourglass_empty'}
                              </span>
                              {pPaid ? 'Paid' : 'Waiting'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
