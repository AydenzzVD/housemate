'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLocalStore, saveLocalStore } from '@/lib/store';
import { formatCents, daysUntil, formatDateShort, CATEGORY_ICONS } from '@/lib/money';

/**
 * Main Dashboard
 *
 * Matches Stitch design: dashboard_housemate_1 & dashboard_housemate_2
 */
export default function DashboardPage() {
  const [store, setStore] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setStore(getLocalStore());
  }, []);

  if (!store) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <div className="skeleton" style={{ height: 40, width: 250, margin: '0 auto var(--space-md)' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const { house, members, bills, payments, expenses, currentUser } = store;

  // Calculate my current payment share
  const myPayment = payments.find(p => p.member_id === currentUser.id) || payments[0];
  const isPaid = myPayment?.status === 'paid';

  // Calculate house payment stats
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const totalMembers = payments.length || 5;
  const paidPercentage = Math.round((paidCount / totalMembers) * 100);
  const totalHouseCents = payments.reduce((sum, p) => sum + p.amount_cents, 0) || 19250;
  const collectedCents = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount_cents, 0);
  const remainingCents = totalHouseCents - collectedCents;

  // Calculate my personal spending this month
  const totalPersonalCents = expenses.reduce((sum, e) => sum + e.amount_cents, 0);

  // Toggle my payment status
  function handleToggleMyPayment() {
    const updatedPayments = store.payments.map(p => {
      if (p.member_id === currentUser.id) {
        const nextStatus = p.status === 'paid' ? 'pending' : 'paid';
        return {
          ...p,
          status: nextStatus,
          paid_at: nextStatus === 'paid' ? new Date().toISOString() : null,
        };
      }
      return p;
    });

    const nextStore = { ...store, payments: updatedPayments };
    setStore(nextStore);
    saveLocalStore(nextStore);

    const isNowPaid = updatedPayments.find(p => p.member_id === currentUser.id)?.status === 'paid';
    setToast(isNowPaid ? '✓ Payment marked as Paid!' : 'Payment marked as Waiting');
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Toast Notification */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h1 className="text-headline-lg-mobile text-on-surface" style={{ fontSize: 28, marginBottom: 4 }}>
              Good morning, {currentUser.full_name} 👋
            </h1>
            <p className="text-body-md text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-primary)' }}>
                home
              </span>
              {house.name} ({members.length} members)
            </p>
          </div>

          {/* Member Avatars Stack */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {members.slice(0, 4).map((m, idx) => (
              <div
                key={m.id}
                className="avatar avatar-sm"
                style={{
                  marginLeft: idx === 0 ? 0 : -8,
                  border: '2px solid var(--color-background)',
                  backgroundColor: idx % 2 === 0 ? 'var(--color-primary-container)' : 'var(--color-secondary-container)',
                  color: idx % 2 === 0 ? 'var(--color-on-primary-container)' : 'var(--color-on-secondary-container)',
                  fontSize: 12,
                }}
                title={m.full_name}
              >
                {m.avatar || m.full_name[0]}
              </div>
            ))}
            {members.length > 4 && (
              <div
                className="avatar avatar-sm"
                style={{
                  marginLeft: -8,
                  border: '2px solid var(--color-background)',
                  backgroundColor: 'var(--color-surface-container-high)',
                  color: 'var(--color-secondary)',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                +{members.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="bento-grid bento-grid-12">
        {/* LARGE CARD: Your House Payment (8 cols) */}
        <div
          className="card col-span-8"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 280,
            padding: 'var(--space-xl)',
          }}
        >
          <div className="glow-primary" />

          {/* Top Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
            <div>
              <h2 className="text-headline-md text-on-surface">Your House Payment</h2>
              <p className="text-body-md text-secondary">August cycle</p>
            </div>

            {isPaid ? (
              <span className="badge badge-paid">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                Paid
              </span>
            ) : (
              <span className="badge badge-overdue">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                Payment due
              </span>
            )}
          </div>

          {/* Center: Big Money */}
          <div style={{ margin: 'var(--space-lg) 0', position: 'relative', zIndex: 2 }}>
            <p className="text-body-md text-secondary" style={{ marginBottom: 4 }}>
              Your share
            </p>
            <div className="text-display-financial text-on-surface">
              {formatCents(myPayment?.amount_cents || 3850, house.currency)}
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-md)',
              borderTop: '1px solid var(--color-surface-container)',
              paddingTop: 'var(--space-md)',
              position: 'relative',
              zIndex: 2,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={handleToggleMyPayment}
              className="btn-primary"
              style={{
                flex: 1,
                minWidth: 140,
                backgroundColor: isPaid ? 'var(--color-success)' : 'var(--color-primary)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {isPaid ? 'check_circle' : 'payments'}
              </span>
              {isPaid ? 'Marked as Paid' : 'Pay Now'}
            </button>

            <Link
              href="/payments"
              className="btn-secondary"
              style={{ flex: 1, minWidth: 140, textDecoration: 'none' }}
            >
              View Details
            </Link>
          </div>
        </div>

        {/* House Status Card (4 cols) */}
        <div
          className="card col-span-4"
          style={{ display: 'flex', flexDirection: 'column', padding: 'var(--space-xl)' }}
        >
          <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>
            House Status
          </h2>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-xs)' }}>
              <span className="text-headline-md text-on-surface">
                {paidCount}/{totalMembers} paid
              </span>
              <span className="text-body-md text-secondary">
                Total: {formatCents(totalHouseCents, house.currency)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${paidPercentage}%` }}
              />
            </div>
          </div>

          {/* Member List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', overflowY: 'auto', flex: 1 }}>
            {payments.map(p => {
              const isCurrentUser = p.member_id === currentUser.id;
              const pPaid = p.status === 'paid';
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-xs) 0',
                    borderBottom: '1px solid var(--color-surface-container-low)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <div
                      className="avatar avatar-sm"
                      style={{
                        backgroundColor: isCurrentUser ? 'var(--color-primary)' : 'var(--color-surface-container)',
                        color: isCurrentUser ? 'var(--color-on-primary)' : 'var(--color-on-surface)',
                      }}
                    >
                      {p.name[0]}
                    </div>
                    <span className={`text-body-md text-on-surface ${isCurrentUser ? 'font-semibold' : ''}`}>
                      {p.name} {isCurrentUser && '(You)'}
                    </span>
                  </div>

                  <span className={`badge ${pPaid ? 'badge-paid' : 'badge-overdue'}`}>
                    {pPaid ? 'Paid' : 'Waiting'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Payments (6 cols) */}
        <div className="card col-span-6" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h2 className="text-headline-md text-on-surface">Upcoming Payments</h2>
            <Link href="/upcoming" className="text-label-md text-primary">
              View all
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Rent */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-bright)',
                border: '1px solid var(--color-surface-container)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(188, 72, 0, 0.15)',
                    color: 'var(--color-tertiary-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined">real_estate_agent</span>
                </div>
                <div>
                  <h3 className="text-headline-md" style={{ fontSize: 16 }}>September Rent</h3>
                  <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
                    Sep 1 • Due in 3 days
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="text-headline-md" style={{ fontSize: 18 }}>$20.00</div>
                <span className="badge badge-upcoming" style={{ marginTop: 4 }}>
                  Upcoming
                </span>
              </div>
            </div>

            {/* Wi-Fi */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-bright)',
                border: '1px solid var(--color-surface-container)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-secondary-container)',
                    color: 'var(--color-on-secondary-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined">wifi</span>
                </div>
                <div>
                  <h3 className="text-headline-md" style={{ fontSize: 16 }}>Wi-Fi (Quarterly)</h3>
                  <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
                    Sep 10 • Save $3.00/mo
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="text-headline-md" style={{ fontSize: 18 }}>$9.00</div>
                <span className="badge badge-member" style={{ marginTop: 4 }}>
                  Saved $6.00
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* My Spending Card (6 cols) */}
        <div
          className="card col-span-6"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 'var(--space-xl)',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xs)' }}>
              <h2 className="text-headline-md text-on-surface">My Spending</h2>
              <Link href="/spending" className="text-label-md text-primary">
                View spending
              </Link>
            </div>
            <p className="text-body-md text-secondary" style={{ marginBottom: 4 }}>August</p>
            <div className="text-headline-lg text-on-surface" style={{ marginBottom: 'var(--space-lg)' }}>
              {formatCents(totalPersonalCents || 24750, house.currency)}{' '}
              <span className="text-body-md text-secondary" style={{ fontWeight: 400 }}>spent</span>
            </div>
          </div>

          {/* Category Breakdown Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <span className="text-secondary">🍜 Food &amp; Dining</span>
                <span className="font-semibold text-on-surface">$120.00</span>
              </div>
              <div className="progress-bar-track" style={{ height: 6 }}>
                <div className="progress-bar-fill" style={{ width: '48%' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <span className="text-secondary">🚌 Transport</span>
                <span className="font-semibold text-on-surface">$65.00</span>
              </div>
              <div className="progress-bar-track" style={{ height: 6 }}>
                <div
                  className="progress-bar-fill"
                  style={{ width: '26%', backgroundColor: 'var(--color-tertiary-container)' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <span className="text-secondary">⚡ Utilities &amp; Shared</span>
                <span className="font-semibold text-on-surface">$62.50</span>
              </div>
              <div className="progress-bar-track" style={{ height: 6 }}>
                <div
                  className="progress-bar-fill"
                  style={{ width: '25%', backgroundColor: 'var(--color-secondary)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
