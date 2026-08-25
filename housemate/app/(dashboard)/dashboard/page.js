'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { getUserHouse, getHouseMembers } from '@/lib/houses';
import { getHouseBills } from '@/lib/bills';
import { getCurrentCyclePayments, toggleMyPayment } from '@/lib/payments';
import { getMyExpenses } from '@/lib/expenses';
import { getMyBudget } from '@/lib/budgets';
import { formatCents, BILL_ICONS, CATEGORY_ICONS, currentMonthYear } from '@/lib/money';
import EmptyState from '@/components/EmptyState';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Main Dashboard — live multi-user data
 * Matches Stitch design: dashboard_housemate_1 & dashboard_housemate_2
 */
export default function DashboardPage() {
  const [profile, setProfile] = useState(null);
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [cycleGroups, setCycleGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    async function loadAll() {
      // Get current user ID first
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const [profileData, houseData] = await Promise.all([
        getProfile(),
        getUserHouse(),
      ]);

      setProfile(profileData);
      setHouse(houseData);

      if (houseData) {
        const monthYear = currentMonthYear();
        const [membersData, cyclesData, expensesData, budgetData] = await Promise.all([
          getHouseMembers(houseData.id),
          getCurrentCyclePayments(houseData.id),
          getMyExpenses(monthYear),
          getMyBudget(monthYear),
        ]);
        setMembers(membersData);
        setCycleGroups(cyclesData);
        setExpenses(expensesData);
        setBudget(budgetData);
      }

      setLoading(false);
    }
    loadAll();
  }, []);

  async function handleTogglePayment(paymentId, currentStatus) {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const { error } = await toggleMyPayment(paymentId, newStatus);
    if (error) {
      setToast(`❌ ${error}`);
    } else {
      setToast(newStatus === 'paid' ? '✓ Marked as Paid!' : '↩ Marked as Unpaid');
      // Refresh cycles
      if (house) {
        const updated = await getCurrentCyclePayments(house.id);
        setCycleGroups(updated);
      }
    }
    setTimeout(() => setToast(''), 3000);
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)' }}>
        <div className="skeleton" style={{ height: 40, width: 250, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-md)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  // Flatten all bill_payments to find my payments
  const allMyPayments = cycleGroups.flatMap(g =>
    g.payments.filter(p => p.user_id === currentUserId)
  );

  // Total owed this cycle
  const myTotalOwedCents = allMyPayments.reduce((s, p) => s + p.share_amount_cents, 0);
  const allPaid = allMyPayments.length > 0 && allMyPayments.every(p => p.status === 'paid');

  // House status across first cycle group
  const firstGroup = cycleGroups[0] || null;
  const allHousePayments = firstGroup?.payments ?? [];
  const housePaidCount = allHousePayments.filter(p => p.status === 'paid').length;
  const houseTotal = firstGroup?.cycle?.total_amount_cents ?? 0;
  const housePaidPct = allHousePayments.length > 0
    ? Math.round((housePaidCount / allHousePayments.length) * 100)
    : 0;

  // Personal spending
  const totalSpentCents = expenses.reduce((s, e) => s + e.amount_cents, 0);

  // Category breakdown
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount_cents;
    return acc;
  }, {});
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const monthName = new Date().toLocaleString('en-US', { month: 'long' });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 className="text-headline-lg-mobile text-on-surface" style={{ fontSize: 28, marginBottom: 4 }}>
            {greeting}, {profile?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-body-md text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-primary)' }}>home</span>
            {house?.name ?? 'No house'} {members.length > 0 && `(${members.length} member${members.length !== 1 ? 's' : ''})`}
          </p>
        </div>

        {/* Member Avatars */}
        {members.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {members.slice(0, 4).map((m, idx) => (
              <div
                key={m.id}
                className="avatar avatar-sm"
                style={{
                  marginLeft: idx === 0 ? 0 : -8,
                  border: '2px solid var(--color-background)',
                  backgroundColor: m.user_id === currentUserId ? 'var(--color-primary)' : (idx % 2 === 0 ? 'var(--color-primary-container)' : 'var(--color-secondary-container)'),
                  color: m.user_id === currentUserId ? 'var(--color-on-primary)' : (idx % 2 === 0 ? 'var(--color-on-primary-container)' : 'var(--color-on-secondary-container)'),
                  fontSize: 12,
                }}
                title={m.profiles?.full_name}
              >
                {(m.profiles?.full_name || 'U')[0].toUpperCase()}
              </div>
            ))}
            {members.length > 4 && (
              <div
                className="avatar avatar-sm"
                style={{ marginLeft: -8, border: '2px solid var(--color-background)', backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-secondary)', fontSize: 11, fontWeight: 700 }}
              >
                +{members.length - 4}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bento Grid */}
      <div className="bento-grid bento-grid-12">

        {/* My Payment Card (8 cols) */}
        <div className="card col-span-8" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 280, padding: 'var(--space-xl)' }}>
          <div className="glow-primary" />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
            <div>
              <h2 className="text-headline-md text-on-surface">Your House Payment</h2>
              <p className="text-body-md text-secondary">{monthName} cycle</p>
            </div>
            {allMyPayments.length > 0 ? (
              allPaid ? (
                <span className="badge badge-paid">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>Paid
                </span>
              ) : (
                <span className="badge badge-overdue">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>Due
                </span>
              )
            ) : null}
          </div>

          <div style={{ margin: 'var(--space-lg) 0', position: 'relative', zIndex: 2 }}>
            <p className="text-body-md text-secondary" style={{ marginBottom: 4 }}>
              {allMyPayments.length > 1 ? 'Total across all bills' : 'Your share'}
            </p>
            <div className="text-display-financial text-on-surface">
              {formatCents(myTotalOwedCents, house?.currency)}
            </div>
            {allMyPayments.length === 0 && (
              <p className="text-body-md text-secondary" style={{ marginTop: 8 }}>
                No active bill cycles yet.{' '}
                {house?.myRole === 'admin' && <Link href="/bills/add" className="text-primary">Add a bill →</Link>}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', borderTop: '1px solid var(--color-surface-container)', paddingTop: 'var(--space-md)', position: 'relative', zIndex: 2, flexWrap: 'wrap' }}>
            {allMyPayments.length > 0 && allMyPayments.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleTogglePayment(p.id, p.status)}
                className="btn-primary"
                style={{ flex: 1, minWidth: 140, backgroundColor: p.status === 'paid' ? 'var(--color-success)' : 'var(--color-primary)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {p.status === 'paid' ? 'check_circle' : 'payments'}
                </span>
                {allMyPayments.length > 1 ? (p.status === 'paid' ? 'All Paid' : 'Mark Paid') : (p.status === 'paid' ? 'Marked as Paid' : 'Pay Now')}
              </button>
            ))}
            <Link href="/payments" className="btn-secondary" style={{ flex: 1, minWidth: 140, textDecoration: 'none' }}>
              View Details
            </Link>
          </div>
        </div>

        {/* House Status Card (4 cols) */}
        <div className="card col-span-4" style={{ display: 'flex', flexDirection: 'column', padding: 'var(--space-xl)' }}>
          <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>House Status</h2>

          {firstGroup ? (
            <>
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-xs)' }}>
                  <span className="text-headline-md text-on-surface">{housePaidCount}/{allHousePayments.length} paid</span>
                  <span className="text-body-md text-secondary">Total: {formatCents(houseTotal, house?.currency)}</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${housePaidPct}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', overflowY: 'auto', flex: 1 }}>
                {allHousePayments.map(p => {
                  const isMe = p.user_id === currentUserId;
                  const paid = p.status === 'paid';
                  const name = p.profiles?.full_name || 'Member';
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--color-surface-container-low)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <div className="avatar avatar-sm" style={{ backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-surface-container)', color: isMe ? 'var(--color-on-primary)' : 'var(--color-on-surface)' }}>
                          {name[0].toUpperCase()}
                        </div>
                        <span className="text-body-md text-on-surface">
                          {name}{isMe && ' (You)'}
                        </span>
                      </div>
                      <span className={`badge ${paid ? 'badge-paid' : 'badge-overdue'}`}>{paid ? 'Paid' : 'Waiting'}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState icon="🏠" title="No bill cycles yet" description={house?.myRole === 'admin' ? 'Add a shared bill to get started.' : 'Your admin has not created any bills yet.'} />
          )}
        </div>

        {/* Upcoming Bills (6 cols) */}
        <div className="card col-span-6" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h2 className="text-headline-md text-on-surface">Upcoming Payments</h2>
            <Link href="/upcoming" className="text-label-md text-primary">View all</Link>
          </div>

          {cycleGroups.length === 0 ? (
            <EmptyState icon="📅" title="No upcoming bills" description="Add shared bills to see upcoming payment schedules." actionLabel={house?.myRole === 'admin' ? 'Add Bill' : null} actionHref="/bills/add" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {cycleGroups.slice(0, 3).map(g => {
                const myPay = g.payments.find(p => p.user_id === currentUserId);
                const billIcon = BILL_ICONS[g.bill?.category] || 'receipt';
                return (
                  <div key={g.cycle.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-bright)', border: '1px solid var(--color-surface-container)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined">{billIcon}</span>
                      </div>
                      <div>
                        <h3 className="text-headline-md" style={{ fontSize: 16 }}>{g.bill?.name}</h3>
                        <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
                          Due {new Date(g.cycle.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="text-headline-md" style={{ fontSize: 18 }}>
                        {formatCents(myPay?.share_amount_cents ?? 0, house?.currency)}
                      </div>
                      <span className={`badge ${myPay?.status === 'paid' ? 'badge-paid' : 'badge-upcoming'}`} style={{ marginTop: 4 }}>
                        {myPay?.status === 'paid' ? 'Paid' : 'Due'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Spending (6 cols) */}
        <div className="card col-span-6" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--space-xl)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xs)' }}>
              <h2 className="text-headline-md text-on-surface">My Spending</h2>
              <Link href="/spending" className="text-label-md text-primary">View spending</Link>
            </div>
            <p className="text-body-md text-secondary" style={{ marginBottom: 4 }}>{monthName}</p>
            <div className="text-headline-lg text-on-surface" style={{ marginBottom: 'var(--space-lg)' }}>
              {formatCents(totalSpentCents, house?.currency)}{' '}
              <span className="text-body-md text-secondary" style={{ fontWeight: 400 }}>spent</span>
              {budget && (
                <span className="text-body-md text-secondary" style={{ fontWeight: 400, marginLeft: 8 }}>
                  of {formatCents(budget.budget_cents, house?.currency)} budget
                </span>
              )}
            </div>
          </div>

          {expenses.length === 0 ? (
            <EmptyState icon="💸" title="No expenses yet" description="Start tracking your personal spending." actionLabel="Add Expense" actionHref="/expenses/add" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {topCategories.map(([cat, cents], i) => {
                const pct = totalSpentCents > 0 ? Math.round((cents / totalSpentCents) * 100) : 0;
                const colors = ['var(--color-primary)', 'var(--color-tertiary-container)', 'var(--color-secondary)'];
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                      <span className="text-secondary">{CATEGORY_ICONS[cat] || '💡'} {cat}</span>
                      <span className="font-semibold text-on-surface">{formatCents(cents, house?.currency)}</span>
                    </div>
                    <div className="progress-bar-track" style={{ height: 6 }}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: colors[i] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
