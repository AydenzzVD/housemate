'use client';

import { useState, useEffect } from 'react';
import { getUserHouse, getHouseMembers } from '@/lib/houses';
import { getUpcomingBillCycles } from '@/lib/payments';
import { formatCents, BILL_ICONS } from '@/lib/money';
import EmptyState from '@/components/EmptyState';
import { useLanguage } from '@/lib/lang/useLanguage';

/**
 * Upcoming Payments Schedule Page — live multi-user data
 * Matches Stitch design: upcoming_payments_housemate/screen.png
 */
export default function UpcomingPaymentsPage() {
  const { t, lang } = useLanguage();
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [upcomingList, setUpcomingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function loadData() {
      const hData = await getUserHouse();
      setHouse(hData);

      if (hData) {
        const [mList, uList] = await Promise.all([
          getHouseMembers(hData.id),
          getUpcomingBillCycles(hData.id),
        ]);
        setMembers(mList);
        setUpcomingList(uList);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)', maxWidth: 880, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 40, width: 250, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!house) return null;

  const memberCount = members.length || 1;

  const filteredList = upcomingList.filter(item => {
    if (filter === 'all') return true;
    return item.bills?.frequency === filter;
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: 880, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 className="text-headline-lg text-on-surface" style={{ marginBottom: 4 }}>
            {t('dashboard.upcoming_payments')}
          </h1>
          <p className="text-body-md text-secondary">
            {t('dashboard.no_upcoming_desc')}
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)', backgroundColor: 'var(--color-surface-container)', padding: 4, borderRadius: 'var(--radius-md)' }}>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`btn-ghost ${filter === 'all' ? 'active' : ''}`}
            style={{
              backgroundColor: filter === 'all' ? 'var(--color-surface)' : 'transparent',
              color: filter === 'all' ? 'var(--color-primary)' : 'var(--color-secondary)',
              fontWeight: 600,
              boxShadow: filter === 'all' ? 'var(--shadow-level-1)' : 'none',
            }}
          >
            {t('common.all')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('monthly')}
            className={`btn-ghost ${filter === 'monthly' ? 'active' : ''}`}
            style={{
              backgroundColor: filter === 'monthly' ? 'var(--color-surface)' : 'transparent',
              color: filter === 'monthly' ? 'var(--color-primary)' : 'var(--color-secondary)',
              fontWeight: 600,
              boxShadow: filter === 'monthly' ? 'var(--shadow-level-1)' : 'none',
            }}
          >
            {t('frequency.monthly')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('quarterly')}
            className={`btn-ghost ${filter === 'quarterly' ? 'active' : ''}`}
            style={{
              backgroundColor: filter === 'quarterly' ? 'var(--color-surface)' : 'transparent',
              color: filter === 'quarterly' ? 'var(--color-primary)' : 'var(--color-secondary)',
              fontWeight: 600,
              boxShadow: filter === 'quarterly' ? 'var(--shadow-level-1)' : 'none',
            }}
          >
            {t('frequency.quarterly')}
          </button>
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <EmptyState
            icon="📅"
            title={t('dashboard.no_upcoming')}
            description={t('dashboard.no_upcoming_desc')}
          />
        </div>
      ) : (
        /* Upcoming Cards List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filteredList.map(item => {
            const bill = item.bills;
            const share = Math.round(item.total_amount_cents / memberCount);
            const icon = BILL_ICONS[bill?.category] || 'receipt_long';

            const due = new Date(item.due_date);
            const today = new Date();
            const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

            const isUrgent = daysLeft <= 3;
            const dueLabel = daysLeft === 0 ? t('status.due') : daysLeft < 0 ? t('status.overdue') : t('common.days_remaining', { days: daysLeft });

            return (
              <div
                key={item.id}
                className="card-interactive"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-lg)',
                  flexWrap: 'wrap',
                  gap: 'var(--space-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isUrgent ? 'var(--color-danger-bg)' : 'var(--color-secondary-container)',
                      color: isUrgent ? 'var(--color-danger)' : 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="material-symbols-outlined">{icon}</span>
                  </div>

                  <div>
                    <h3 className="text-headline-md" style={{ fontSize: 18, marginBottom: 2 }}>
                      {bill?.name}
                    </h3>
                    <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
                      {due.toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {dueLabel}
                    </p>
                    {bill?.frequency === 'quarterly' && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 12,
                          color: 'var(--color-tertiary)',
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        💡 {t('house.wifi_saving')}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="text-headline-md text-on-surface" style={{ fontSize: 20 }}>
                    {formatCents(share, house.currency)}
                    <span className="text-body-md text-secondary" style={{ fontSize: 14, fontWeight: 400 }}> {t('common.per_person')}</span>
                  </div>
                  <span className="text-label-sm text-secondary" style={{ display: 'block', marginTop: 2 }}>
                    {t('common.total')}: {formatCents(item.total_amount_cents, house.currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
