'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLocalStore } from '@/lib/store';
import { formatCents, BILL_ICONS } from '@/lib/money';

/**
 * House Overview Page
 *
 * Matches Stitch design: house_housemate/screen.png
 *
 * - House Name & Total active members
 * - Join code widget with copy button
 * - Grid of Shared Bills (Rent $100, Electricity $32.50, Water $15, Wi-Fi $45)
 * - Quick stats: Total Household monthly commitment & per-person breakdown
 * - "Add Bill" action for admin
 */
export default function HousePage() {
  const [store, setStore] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStore(getLocalStore());
  }, []);

  if (!store) return null;

  const { house, members, bills, currentUser } = store;
  const isAdmin = currentUser.role === 'admin';
  const memberCount = members.length || 5;

  // Calculate total monthly commitment
  const totalBillsCents = bills.reduce((sum, b) => sum + b.total_amount_cents, 0);
  const perPersonCents = Math.round(totalBillsCents / memberCount);

  function handleCopyCode() {
    if (house?.join_code) {
      navigator.clipboard.writeText(house.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 className="text-headline-lg text-on-surface" style={{ marginBottom: 4 }}>
            {house.name} ({memberCount} members)
          </h1>
          <p className="text-body-md text-secondary">
            Manage your shared living expenses &amp; bills
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Link href="/house/members" className="btn-secondary" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>group</span>
            Members ({memberCount})
          </Link>

          {isAdmin && (
            <Link href="/bills/add" className="btn-primary" style={{ textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
              Add Bill
            </Link>
          )}
        </div>
      </div>

      {/* Bento Grid */}
      <div className="bento-grid bento-grid-12">
        {/* Left Column: Shared Bills List (8 cols) */}
        <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="text-headline-md text-on-surface">Shared Household Bills</h2>
            <span className="text-label-sm text-secondary uppercase tracking-wider">
              {bills.length} Active Bills
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--space-md)',
            }}
          >
            {bills.map(bill => {
              const perPerson = Math.round(bill.total_amount_cents / memberCount);
              const icon = BILL_ICONS[bill.category] || 'receipt_long';
              const isWifi = bill.name.toLowerCase().includes('wi-fi') || bill.frequency === 'quarterly';

              return (
                <Link
                  key={bill.id}
                  href={`/bills/${bill.id}`}
                  className="card-interactive"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 200,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(0, 74, 198, 0.1)',
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span className="material-symbols-outlined">{icon}</span>
                      </div>
                      <h3 className="text-headline-md" style={{ fontSize: 18 }}>{bill.name}</h3>
                    </div>

                    <span className={`badge ${bill.frequency === 'quarterly' ? 'badge-upcoming' : 'badge-paid'}`}>
                      {bill.frequency === 'quarterly' ? 'Quarterly' : 'Monthly'}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-xs)' }}>
                      <span className="text-display-financial text-on-surface" style={{ fontSize: 32 }}>
                        {formatCents(bill.total_amount_cents, house.currency)}
                      </span>
                      <span className="text-body-md text-secondary">Total</span>
                    </div>

                    <p className="text-label-md text-primary" style={{ marginTop: 4, fontWeight: 600 }}>
                      {formatCents(perPerson, house.currency)} / person
                    </p>
                  </div>

                  <div
                    style={{
                      marginTop: 'var(--space-md)',
                      paddingTop: 'var(--space-sm)',
                      borderTop: '1px solid var(--color-surface-container)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span className="text-label-sm text-secondary">
                      Due: Day {bill.due_day_of_month} of month
                    </span>

                    {isWifi && (
                      <span className="text-label-sm text-secondary" style={{ color: 'var(--color-tertiary)' }}>
                        Save $3/mo
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Column: House Stats & Join Code (4 cols) */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Join Code Widget */}
          <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <span className="text-label-sm text-secondary uppercase tracking-wider mb-xs">
              Invite Roommates
            </span>
            <h3 className="text-headline-md text-on-surface" style={{ margin: '4px 0 var(--space-md)' }}>
              House Join Code
            </h3>

            <div
              style={{
                backgroundColor: 'var(--color-surface-container)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                border: '1px solid var(--color-outline-variant)',
                marginBottom: 'var(--space-md)',
              }}
            >
              <div
                className="text-display-financial text-primary"
                style={{ letterSpacing: '0.15em', fontWeight: 900 }}
              >
                {house.join_code}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied to Clipboard!' : 'Copy House Code'}
            </button>
          </div>

          {/* Monthly Commitment Summary */}
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>
              Monthly Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-body-md text-secondary">Total Shared Bills</span>
                <span className="text-headline-md text-on-surface">
                  {formatCents(totalBillsCents, house.currency)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-body-md text-secondary">Active Members</span>
                <span className="text-headline-md text-on-surface">{memberCount} people</span>
              </div>

              <div className="divider" style={{ margin: 'var(--space-xs) 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-body-md text-primary font-semibold">Equal Share</span>
                <span className="text-headline-lg text-primary font-bold">
                  {formatCents(perPersonCents, house.currency)}/mo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
