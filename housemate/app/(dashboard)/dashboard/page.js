'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { getUserHouse, getHouseMembers } from '@/lib/houses';
import { getHouseBills } from '@/lib/bills';
import { getCurrentCyclePayments, toggleMyPayment, ensureActiveCycles } from '@/lib/payments';
import { getMySavings, calculateWifiFundProgress } from '@/lib/savings';
import { getMyExpenses } from '@/lib/expenses';
import { getMyBudget } from '@/lib/budgets';
import { formatCents, BILL_ICONS, CATEGORY_ICONS } from '@/lib/money';
import { getCurrentMonth, getDeadlineStatus, formatDateShort } from '@/lib/dates';
import EmptyState from '@/components/EmptyState';
import { createBrowserClient } from '@supabase/ssr';
import { useLanguage } from '@/lib/lang/useLanguage';

/**
 * Main Dashboard — live multi-user data
 * Shows "What I Owe Now", individual per-bill payment cards,
 * Wi-Fi Fund widget (separate from regular payments), and Personal Spending.
 */
export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [regularCycles, setRegularCycles] = useState([]);
  const [savingsCycles, setSavingsCycles] = useState([]);
  const [wifiBills, setWifiBills] = useState([]);
  const [wifiSavingsMap, setWifiSavingsMap] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showSavingModal, setShowSavingModal] = useState(false);
  const [activeSavingsBillId, setActiveSavingsBillId] = useState(null);
  const [savingsDeposit, setSavingsDeposit] = useState('3.00');
  const [savingLoading, setSavingLoading] = useState(false);

  useEffect(() => {
    async function loadAll() {
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
        const monthYear = getCurrentMonth();

        // Ensure cycles exist for this month before loading
        await ensureActiveCycles(houseData.id);

        const [membersData, cyclesData, expensesData, budgetData, activeBills] = await Promise.all([
          getHouseMembers(houseData.id),
          getCurrentCyclePayments(houseData.id),
          getMyExpenses(monthYear),
          getMyBudget(monthYear),
          getHouseBills(houseData.id),
        ]);

        setMembers(membersData);
        setRegularCycles(cyclesData.regularCycles);
        setSavingsCycles(cyclesData.savingsCycles);

        // Find Wi-Fi (quarterly) bills for the savings widget
        const wifiType = activeBills.filter(b =>
          b.frequency === 'quarterly' || b.category === 'wifi' ||
          b.name.toLowerCase().includes('wi-fi') || b.name.toLowerCase().includes('wifi')
        );
        setWifiBills(wifiType);

        // Load Wi-Fi savings for each Wi-Fi bill
        if (user && wifiType.length > 0) {
          const savingsResults = await Promise.all(
            wifiType.map(b => getMySavings(b.id).then(s => ({ billId: b.id, savings: s })))
          );
          const map = {};
          for (const { billId, savings } of savingsResults) {
            map[billId] = savings;
          }
          setWifiSavingsMap(map);
        }

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
      setToast(newStatus === 'paid' ? `✓ ${t('payments.toast_paid')}` : `↩ ${t('payments.toast_unpaid')}`);
      // Refresh cycles
      if (house) {
        const updated = await getCurrentCyclePayments(house.id);
        setRegularCycles(updated.regularCycles);
        setSavingsCycles(updated.savingsCycles);
      }
    }
    setTimeout(() => setToast(''), 3000);
  }

  async function handleAddSavings(e) {
    e.preventDefault();
    if (!activeSavingsBillId) return;
    const { addSavingDeposit } = await import('@/lib/savings');
    const cents = Math.round(parseFloat(savingsDeposit || '0') * 100);
    if (cents <= 0) return;
    setSavingLoading(true);
    const { error } = await addSavingDeposit({
      billId: activeSavingsBillId,
      amountCents: cents,
      note: 'Monthly Wi-Fi saving',
    });
    if (error) {
      setToast(`❌ ${error}`);
    } else {
      setToast(`✓ ${formatCents(cents, house?.currency)} saved!`);
      // Refresh savings
      const updated = await getMySavings(activeSavingsBillId);
      setWifiSavingsMap(prev => ({ ...prev, [activeSavingsBillId]: updated }));
      setShowSavingModal(false);
    }
    setSavingLoading(false);
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
    if (h < 12) return t('greeting.morning');
    if (h < 17) return t('greeting.afternoon');
    return t('greeting.evening');
  })();

  // ── "What I Owe Now" ──────────────────────────────────────────────────
  // Sum of UNPAID regular (monthly) bill shares only. Wi-Fi excluded.
  const myUnpaidCents = regularCycles.reduce((sum, g) => {
    const myPay = g.payments.find(p => p.user_id === currentUserId);
    if (myPay && myPay.status === 'pending') return sum + myPay.share_amount_cents;
    return sum;
  }, 0);

  // ── House collection progress (across all regular bills) ─────────────
  const allRegularPayments = regularCycles.flatMap(g => g.payments);
  const housePaidCount = allRegularPayments.filter(p => p.status === 'paid').length;
  const houseTotal = allRegularPayments.reduce((s, p) => s + p.share_amount_cents, 0);
  const housePaidPct = allRegularPayments.length > 0
    ? Math.round((housePaidCount / allRegularPayments.length) * 100)
    : 0;

  // ── Personal spending ─────────────────────────────────────────────────
  const totalSpentCents = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount_cents;
    return acc;
  }, {});
  const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const monthName = new Date().toLocaleString(lang === 'km' ? 'km-KH' : 'en-US', { month: 'long' });

  const deadlineBadgeStyle = (type) => {
    if (type === 'paid') return { backgroundColor: 'var(--color-success)', color: '#fff' };
    if (type === 'overdue') return { backgroundColor: 'var(--color-error)', color: '#fff' };
    if (type === 'today') return { backgroundColor: 'var(--color-warning)', color: '#000' };
    return { backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' };
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 className="text-headline-lg-mobile text-on-surface" style={{ fontSize: 28, marginBottom: 4 }}>
            {greeting}, {profile?.full_name?.split(' ')[0] || ''} 👋
          </h1>
          <p className="text-body-md text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-primary)' }}>home</span>
            {house?.name ?? t('common.no_house')} {members.length > 0 && `· ${members.length} ${t('common.members')}`}
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

        {/* ── "What I Owe Now" Hero Card (8 cols) ── */}
        <div className="card col-span-8" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 280, padding: 'var(--space-xl)' }}>
          <div className="glow-primary" />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
            <div>
              <h2 className="text-headline-md text-on-surface">{t('payments.what_i_owe')}</h2>
              <p className="text-body-md text-secondary">{monthName}</p>
            </div>
            {regularCycles.length > 0 && (
              myUnpaidCents === 0 ? (
                <span className="badge badge-paid">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                  {t('status.paid')}
                </span>
              ) : (
                <span className="badge badge-overdue">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                  {t('status.waiting')}
                </span>
              )
            )}
          </div>

          {/* Big total */}
          <div style={{ margin: 'var(--space-lg) 0', position: 'relative', zIndex: 2 }}>
            <div className="text-display-financial text-on-surface">
              {formatCents(myUnpaidCents, house?.currency)}
            </div>
            {regularCycles.length === 0 && (
              <p className="text-body-md text-secondary" style={{ marginTop: 8 }}>
                {t('dashboard.no_cycles')}{' '}
                {house?.myRole === 'admin' && <Link href="/bills/add" className="text-primary">{t('dashboard.add_bill_cta')}</Link>}
              </p>
            )}
          </div>

          {/* Per-bill breakdown rows */}
          {regularCycles.length > 0 && (
            <div style={{ borderTop: '1px solid var(--color-surface-container)', paddingTop: 'var(--space-md)', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              {regularCycles.map(g => {
                const myPay = g.payments.find(p => p.user_id === currentUserId);
                if (!myPay) return null;
                const isPaid = myPay.status === 'paid';
                const deadline = getDeadlineStatus(g.cycle.due_date, isPaid, t);
                const billIcon = BILL_ICONS[g.bill?.category] || 'receipt';
                return (
                  <div key={g.cycle.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-xs) 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-primary)' }}>{billIcon}</span>
                      <span className="text-body-md text-on-surface">{g.bill?.name}</span>
                      <span className="badge" style={{ ...deadlineBadgeStyle(deadline.type), fontSize: 11, padding: '2px 8px' }}>
                        {deadline.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <span className="text-label-md font-semibold text-on-surface">{formatCents(myPay.share_amount_cents, house?.currency)}</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePayment(myPay.id, myPay.status)}
                        className={isPaid ? 'btn-secondary' : 'btn-primary'}
                        style={{ fontSize: 13, padding: '6px 14px', minHeight: 32 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          {isPaid ? 'undo' : 'check'}
                        </span>
                        {isPaid ? t('payments.mark_share_waiting_btn') : t('payments.mark_share_paid_btn')}
                      </button>
                    </div>
                  </div>
                );
              })}
              <Link href="/payments" className="btn-secondary" style={{ marginTop: 'var(--space-xs)', textDecoration: 'none', alignSelf: 'flex-end', fontSize: 13, padding: '6px 14px' }}>
                {t('dashboard.view_details')}
              </Link>
            </div>
          )}
        </div>

        {/* ── House Status (4 cols) ── */}
        <div className="card col-span-4" style={{ display: 'flex', flexDirection: 'column', padding: 'var(--space-xl)' }}>
          <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>{t('dashboard.house_status')}</h2>

          {regularCycles.length > 0 ? (
            <>
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-xs)' }}>
                  <span className="text-headline-md text-on-surface">{t('dashboard.paid_count', { paid: housePaidCount, total: allRegularPayments.length })}</span>
                  <span className="text-body-md text-secondary">{formatCents(houseTotal, house?.currency)}</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${housePaidPct}%` }} />
                </div>
              </div>

              {/* Show members for first bill cycle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', overflowY: 'auto', flex: 1 }}>
                {regularCycles[0]?.payments.map(p => {
                  const isMe = p.user_id === currentUserId;
                  const paid = p.status === 'paid';
                  const name = p.profiles?.full_name || 'Member';
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--color-surface-container-low)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <div className="avatar avatar-sm" style={{ backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-surface-container)', color: isMe ? 'var(--color-on-primary)' : 'var(--color-on-surface)' }}>
                          {name[0].toUpperCase()}
                        </div>
                        <span className="text-body-md text-on-surface">{name}{isMe && ` ${t('common.you')}`}</span>
                      </div>
                      <span className={`badge ${paid ? 'badge-paid' : 'badge-overdue'}`}>{paid ? t('status.paid') : t('status.waiting')}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState icon="🏠" title={t('dashboard.no_cycles')} description={house?.myRole === 'admin' ? t('dashboard.no_house_cycles_admin') : t('dashboard.no_house_cycles_member')} />
          )}
        </div>

        {/* ── Wi-Fi Fund Widget (6 cols) ── shown only if Wi-Fi bills exist */}
        {wifiBills.length > 0 && wifiBills.map(wBill => {
          const deposits = wifiSavingsMap[wBill.id] ?? [];
          const progress = calculateWifiFundProgress({
            totalBillCents: wBill.total_amount_cents,
            memberCount: members.length || 1,
            frequency: wBill.frequency,
            savedDeposits: deposits,
          });
          return (
            <div key={wBill.id} className="card col-span-6" style={{ padding: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <span style={{ fontSize: 24 }}>📶</span>
                  <div>
                    <h2 className="text-headline-md text-on-surface">{t('wifi_fund.title')}</h2>
                    <p className="text-body-sm text-secondary">{wBill.name}</p>
                  </div>
                </div>
                {progress.isReadyToPay ? (
                  <span className="badge badge-paid">{t('wifi_fund.ready_to_pay')}</span>
                ) : (
                  <span className="badge badge-upcoming">{t('wifi_fund.progress', { pct: progress.progressPercent })}</span>
                )}
              </div>

              {/* Progress bar */}
              <div className="progress-bar-track" style={{ height: 8, marginBottom: 'var(--space-md)' }}>
                <div className="progress-bar-fill" style={{ width: `${progress.progressPercent}%` }} />
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p className="text-label-sm text-secondary">{t('wifi_fund.saved')}</p>
                  <p className="text-headline-md text-on-surface" style={{ color: 'var(--color-success)' }}>
                    {formatCents(progress.actualSavedCents, house?.currency)}
                  </p>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p className="text-label-sm text-secondary">{t('wifi_fund.remaining')}</p>
                  <p className="text-headline-md text-on-surface">{formatCents(progress.remainingCents, house?.currency)}</p>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p className="text-label-sm text-secondary">{t('wifi_fund.monthly_contribution')}</p>
                  <p className="text-headline-md text-on-surface">{formatCents(progress.monthlyContributionCents, house?.currency)}/mo</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--color-secondary)', marginBottom: 'var(--space-md)' }}>
                <span>{t('wifi_fund.target')}: {formatCents(progress.targetCents, house?.currency)}</span>
                <span>{progress.cycleMonths}-month cycle</span>
              </div>

              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%' }}
                onClick={() => {
                  setActiveSavingsBillId(wBill.id);
                  setSavingsDeposit((progress.monthlyContributionCents / 100).toFixed(2));
                  setShowSavingModal(true);
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>savings</span>
                {t('wifi_fund.add_savings')}
              </button>
            </div>
          );
        })}

        {/* ── Personal Spending (6 cols if wifi, 12 cols if not) ── */}
        <div className={`card ${wifiBills.length > 0 ? 'col-span-6' : 'col-span-12'}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--space-xl)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xs)' }}>
              <h2 className="text-headline-md text-on-surface">{t('dashboard.my_spending')}</h2>
              <Link href="/spending" className="text-label-md text-primary">{t('dashboard.view_spending')}</Link>
            </div>
            <p className="text-body-md text-secondary" style={{ marginBottom: 4 }}>{monthName}</p>
            <div className="text-headline-lg text-on-surface" style={{ marginBottom: 'var(--space-lg)' }}>
              {formatCents(totalSpentCents, house?.currency)}{' '}
              <span className="text-body-md text-secondary" style={{ fontWeight: 400 }}>{t('dashboard.spent')}</span>
              {budget && (
                <span className="text-body-md text-secondary" style={{ fontWeight: 400, marginLeft: 8 }}>
                  {t('dashboard.of_budget', { budget: formatCents(budget.budget_cents, house?.currency) })}
                </span>
              )}
            </div>
          </div>

          {expenses.length === 0 ? (
            <EmptyState icon="💸" title={t('dashboard.no_expenses')} description={t('dashboard.no_expenses_desc')} actionLabel={t('dashboard.add_expense')} actionHref="/expenses/add" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {topCategories.map(([cat, cents], i) => {
                const pct = totalSpentCents > 0 ? Math.round((cents / totalSpentCents) * 100) : 0;
                const colors = ['var(--color-primary)', 'var(--color-tertiary-container)', 'var(--color-secondary)'];
                const translatedCategory = t(`expense_categories.${cat}`) || cat;
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                      <span className="text-secondary">{CATEGORY_ICONS[cat] || '💡'} {translatedCategory}</span>
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

      {/* Wi-Fi Savings Modal */}
      {showSavingModal && activeSavingsBillId && (
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
              {t('wifi_fund.record_deposit')}
            </h3>
            <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-md)' }}>
              {t('wifi_fund.monthly_contribution')}
            </p>

            <form onSubmit={handleAddSavings} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label htmlFor="savingsAmount" className="input-label">
                  {`Amount (${house?.currency ?? '$'})`}
                </label>
                <input
                  id="savingsAmount"
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
                <button type="button" onClick={() => setShowSavingModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={savingLoading}>
                  {savingLoading ? t('common.saving') : t('wifi_fund.record_deposit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
