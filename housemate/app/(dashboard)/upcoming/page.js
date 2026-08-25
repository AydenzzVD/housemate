'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLocalStore } from '@/lib/store';
import { formatCents, BILL_ICONS } from '@/lib/money';

/**
 * Upcoming Payments Schedule Page
 *
 * Matches Stitch design: upcoming_payments_housemate/screen.png
 *
 * - Timeline of scheduled recurring payments
 * - Due dates & countdown tags
 * - Filter by frequency
 */
export default function UpcomingPaymentsPage() {
  const [store, setStore] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setStore(getLocalStore());
  }, []);

  if (!store) return null;

  const { house, members, bills } = store;
  const memberCount = members.length || 5;

  const upcomingList = [
    {
      id: 'up-1',
      name: 'September House Rent',
      category: 'rent',
      dueDate: 'Sep 1, 2026',
      dueIn: 'Due in 3 days',
      totalCents: 10000,
      frequency: 'monthly',
      status: 'urgent',
    },
    {
      id: 'up-2',
      name: 'Electricity',
      category: 'electricity',
      dueDate: 'Sep 5, 2026',
      dueIn: 'Due in 7 days',
      totalCents: 3250,
      frequency: 'monthly',
      status: 'upcoming',
    },
    {
      id: 'up-3',
      name: 'Water Bill',
      category: 'water',
      dueDate: 'Sep 10, 2026',
      dueIn: 'Due in 12 days',
      totalCents: 1500,
      frequency: 'monthly',
      status: 'upcoming',
    },
    {
      id: 'up-4',
      name: 'Wi-Fi (Q3 Payment)',
      category: 'wifi',
      dueDate: 'Sep 10, 2026',
      dueIn: 'Due in 12 days',
      totalCents: 4500,
      frequency: 'quarterly',
      status: 'quarterly',
      savingNote: 'Save $3.00/month',
    },
  ];

  const filteredList = upcomingList.filter(item => {
    if (filter === 'all') return true;
    return item.frequency === filter;
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: 880, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 className="text-headline-lg text-on-surface" style={{ marginBottom: 4 }}>
            Upcoming Payments
          </h1>
          <p className="text-body-md text-secondary">
            Never forget a recurring shared bill deadline.
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
            All
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
            Monthly
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
            Quarterly
          </button>
        </div>
      </div>

      {/* Upcoming Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {filteredList.map(item => {
          const share = Math.round(item.totalCents / memberCount);
          const icon = BILL_ICONS[item.category] || 'receipt_long';

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
                    backgroundColor: item.status === 'urgent' ? 'var(--color-danger-bg)' : 'var(--color-secondary-container)',
                    color: item.status === 'urgent' ? 'var(--color-danger)' : 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined">{icon}</span>
                </div>

                <div>
                  <h3 className="text-headline-md" style={{ fontSize: 18, marginBottom: 2 }}>
                    {item.name}
                  </h3>
                  <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
                    {item.dueDate} • {item.dueIn}
                  </p>
                  {item.savingNote && (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 12,
                        color: 'var(--color-tertiary)',
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      💡 {item.savingNote}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="text-headline-md text-on-surface" style={{ fontSize: 20 }}>
                  {formatCents(share, house.currency)}
                  <span className="text-body-md text-secondary" style={{ fontSize: 14, fontWeight: 400 }}> /person</span>
                </div>
                <span className="text-label-sm text-secondary" style={{ display: 'block', marginTop: 2 }}>
                  Total: {formatCents(item.totalCents, house.currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
