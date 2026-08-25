'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLocalStore, saveLocalStore } from '@/lib/store';
import { formatCents } from '@/lib/money';

/**
 * Payment Status Matrix Page
 *
 * Matches Stitch design: payment_status_housemate/screen.png
 *
 * - Total Amount card ($192.50)
 * - Payment Progress card (4/5 Paid, Collected $154.00, Remaining $38.50)
 * - Member Shares list with Paid vs Waiting badges
 * - Generate Payment Message CTA
 * - Mark as Paid self-action
 */
export default function PaymentsPage() {
  const [store, setStore] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setStore(getLocalStore());
  }, []);

  if (!store) return null;

  const { house, payments, currentUser } = store;

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const totalCount = payments.length || 5;
  const progressPercent = Math.round((paidCount / totalCount) * 100);

  const totalCents = payments.reduce((sum, p) => sum + p.amount_cents, 0) || 19250;
  const collectedCents = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount_cents, 0);
  const remainingCents = totalCents - collectedCents;

  const myPayment = payments.find(p => p.member_id === currentUser.id);
  const isMyPaymentPaid = myPayment?.status === 'paid';

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

    setToast(isMyPaymentPaid ? 'Payment marked as Waiting' : '✓ Payment marked as Paid!');
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 className="text-headline-lg text-on-surface" style={{ marginBottom: 4 }}>
            August House Payment
          </h1>
          <p className="text-body-md text-secondary">
            Due: August 31st • Total commitment for all shared bills
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button
            type="button"
            onClick={handleToggleMyPayment}
            className="btn-secondary"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {isMyPaymentPaid ? 'check_circle' : 'hourglass_empty'}
            </span>
            {isMyPaymentPaid ? 'Mark as Waiting' : 'Mark My Share as Paid'}
          </button>

          <Link href="/payment-message" className="btn-primary" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chat</span>
            Generate Payment Message
          </Link>
        </div>
      </div>

      {/* Main Grid */}
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
              Total Amount
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              {payments.map(p => {
                const isMe = p.member_id === currentUser.id;
                const pPaid = p.status === 'paid';

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
                        {p.name[0]}
                      </div>

                      <div>
                        <p className="text-headline-md" style={{ fontSize: 16 }}>
                          {p.name} {isMe && '(You)'}
                        </p>
                        <p className="text-label-sm text-secondary">
                          Rent, Electricity, Water &amp; Wi-Fi
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <span className="text-headline-md text-on-surface" style={{ fontSize: 18 }}>
                        {formatCents(p.amount_cents, house.currency)}
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
          </div>
        </div>
      </div>
    </div>
  );
}
