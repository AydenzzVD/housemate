'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUserHouse, getHouseMembers } from '@/lib/houses';
import { getHouseBills } from '@/lib/bills';
import { formatCents, BILL_ICONS } from '@/lib/money';
import EmptyState from '@/components/EmptyState';
import { useLanguage } from '@/lib/lang/useLanguage';

/**
 * House Overview Page — live multi-user data
 * Matches Stitch design: house_housemate/screen.png
 */
export default function HousePage() {
  const { t } = useLanguage();
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      const houseData = await getUserHouse();
      setHouse(houseData);

      if (houseData) {
        const [membersData, billsData] = await Promise.all([
          getHouseMembers(houseData.id),
          getHouseBills(houseData.id),
        ]);
        setMembers(membersData);
        setBills(billsData);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)' }}>
        <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 'var(--space-md)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-md)' }}>
          <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    );
  }

  if (!house) return null;

  const isAdmin = house.myRole === 'admin';
  const memberCount = members.length || 1;

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
            {house.name} ({memberCount === 1 ? t('settings.member_count_one', { count: memberCount }) : t('settings.member_count_other', { count: memberCount })})
          </h1>
          <p className="text-body-md text-secondary">
            {t('house.manage_subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Link href="/house/members" className="btn-secondary" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>group</span>
            {t('house.members_btn', { count: memberCount })}
          </Link>

          {isAdmin && (
            <Link href="/bills/add" className="btn-primary" style={{ textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
              {t('house.add_bill')}
            </Link>
          )}
        </div>
      </div>

      {/* Bento Grid */}
      <div className="bento-grid bento-grid-12">
        {/* Left Column: Shared Bills List (8 cols) */}
        <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="text-headline-md text-on-surface">{t('house.shared_bills')}</h2>
            <span className="text-label-sm text-secondary uppercase tracking-wider">
              {bills.length === 1 ? t('house.active_bills_one', { count: bills.length }) : t('house.active_bills_other', { count: bills.length })}
            </span>
          </div>

          {bills.length === 0 ? (
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              <EmptyState
                icon="📄"
                title={t('house.no_bills')}
                description={isAdmin ? t('house.no_bills_admin') : t('house.no_bills_member')}
                actionLabel={isAdmin ? t('house.add_first_bill') : null}
                actionHref="/bills/add"
              />
            </div>
          ) : (
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
                const isWifi = bill.category === 'wifi' || bill.name.toLowerCase().includes('wi-fi') || bill.frequency === 'quarterly';
                const translatedFreq = t(`frequency.${bill.frequency}`) || bill.frequency;

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
                        {translatedFreq}
                      </span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-xs)' }}>
                        <span className="text-display-financial text-on-surface" style={{ fontSize: 32 }}>
                          {formatCents(bill.total_amount_cents, house.currency)}
                        </span>
                        <span className="text-body-md text-secondary">{t('house.total_label')}</span>
                      </div>

                      <p className="text-label-md text-primary" style={{ marginTop: 4, fontWeight: 600 }}>
                        {formatCents(perPerson, house.currency)} {t('house.per_person')}
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
                        {t('house.due_day', { day: bill.due_day_of_month })}
                      </span>

                      {isWifi && (
                        <span className="text-label-sm text-secondary" style={{ color: 'var(--color-tertiary)' }}>
                          {t('house.wifi_saving')}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: House Stats & Join Code (4 cols) */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Join Code Widget */}
          <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <span className="text-label-sm text-secondary uppercase tracking-wider mb-xs">
              {t('house.invite_roommates')}
            </span>
            <h3 className="text-headline-md text-on-surface" style={{ margin: '4px 0 var(--space-md)' }}>
              {t('house.join_code_label')}
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
              {copied ? t('house.copied_code') : t('house.copy_house_code')}
            </button>
          </div>

          {/* Monthly Commitment Summary */}
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>
              {t('house.monthly_summary')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-body-md text-secondary">{t('house.total_shared_bills')}</span>
                <span className="text-headline-md text-on-surface">
                  {formatCents(totalBillsCents, house.currency)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-body-md text-secondary">{t('house.active_members')}</span>
                <span className="text-headline-md text-on-surface">{memberCount === 1 ? t('house.person', { count: memberCount }) : t('house.people', { count: memberCount })}</span>
              </div>

              <div className="divider" style={{ margin: 'var(--space-xs) 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-body-md text-primary font-semibold">{t('house.equal_share')}</span>
                <span className="text-headline-lg text-primary font-bold">
                  {formatCents(perPersonCents, house.currency)}{t('common.per_month')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
