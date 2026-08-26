'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUserHouse, getHouseMembers } from '@/lib/houses';
import { getCurrentCyclePayments, toggleMyPayment, ensureActiveCycles, getMyPaymentHistory } from '@/lib/payments';
import { getMySavings, addSavingDeposit, calculateWifiFundProgress } from '@/lib/savings';
import { getHouseBills } from '@/lib/bills';
import { formatCents, BILL_ICONS } from '@/lib/money';
import { getDeadlineStatus, formatDateShort, getPeriodLabel } from '@/lib/dates';
import EmptyState from '@/components/EmptyState';
import { createBrowserClient } from '@supabase/ssr';
import { useLanguage } from '@/lib/lang/useLanguage';

/**
 * Payments Page — Individual per-bill payment cards.
 * NO bulk "Mark All" button. Each bill is paid independently.
 * Wi-Fi Fund is shown separately.
 * Payment history section at the bottom.
 */
export default function PaymentsPage() {
  const { t, lang } = useLanguage();
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [regularCycles, setRegularCycles] = useState([]);
  const [savingsCycles, setSavingsCycles] = useState([]);
  const [dueSavingsCycles, setDueSavingsCycles] = useState([]);
  const [wifiBills, setWifiBills] = useState([]);
  const [wifiSavingsMap, setWifiSavingsMap] = useState({});
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showSavingModal, setShowSavingModal] = useState(false);
  const [activeSavingsBillId, setActiveSavingsBillId] = useState(null);
  const [savingsDeposit, setSavingsDeposit] = useState('3.00');
  const [savingLoading, setSavingLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
        // Ensure cycles exist
        await ensureActiveCycles(hData.id);

        const [cyclesData, membersData, activeBills, history] = await Promise.all([
          getCurrentCyclePayments(hData.id),
          getHouseMembers(hData.id),
          getHouseBills(hData.id),
          getMyPaymentHistory(),
        ]);

        setRegularCycles(cyclesData.regularCycles);
        setSavingsCycles(cyclesData.savingsCycles);
        setDueSavingsCycles(cyclesData.dueSavingsCycles);
        setMembers(membersData);
        setPaymentHistory(history);

        // Wi-Fi bills for savings widget
        const wifiType = activeBills.filter(b =>
          b.frequency === 'quarterly' || b.category === 'wifi' ||
          b.name.toLowerCase().includes('wi-fi') || b.name.toLowerCase().includes('wifi')
        );
        setWifiBills(wifiType);

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
      }
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleTogglePayment(paymentId, currentStatus) {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const { error } = await toggleMyPayment(paymentId, newStatus);
    if (error) {
      setToast(`❌ ${error}`);
    } else {
      setToast(newStatus === 'paid' ? `✓ ${t('payments.toast_paid')}` : `↩ ${t('payments.toast_unpaid')}`);
      const updated = await getCurrentCyclePayments(house.id);
      setRegularCycles(updated.regularCycles);
      setSavingsCycles(updated.savingsCycles);
      setDueSavingsCycles(updated.dueSavingsCycles);
    }
    setTimeout(() => setToast(''), 3000);
  }

  async function handleAddSavings(e) {
    e.preventDefault();
    if (!activeSavingsBillId) return;
    const cents = Math.round(parseFloat(savingsDeposit || '0') * 100);
    if (cents <= 0) return;
    setSavingLoading(true);
    const { error } = await addSavingDeposit({
      billId: activeSavingsBillId,
      amountCents: cents,
      note: 'Wi-Fi monthly saving',
    });
    if (error) {
      setToast(`❌ ${error}`);
    } else {
      setToast(`✓ ${formatCents(cents, house?.currency)} saved!`);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      </div>
    );
  }

  if (!house) return null;

  const monthName = new Date().toLocaleString(lang === 'km' ? 'km-KH' : 'en-US', { month: 'long' });
  const locale = lang === 'km' ? 'km-KH' : 'en-US';

  // "What I Owe Now" total (only unpaid regular bills)
  const myUnpaidCents = regularCycles.reduce((sum, g) => {
    const myPay = g.payments.find(p => p.user_id === currentUserId);
    if (myPay && myPay.status === 'pending') return sum + myPay.share_amount_cents;
    return sum;
  }, 0);

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
          <h1 className="text-headline-lg text-on-surface" style={{ marginBottom: 4 }}>
            {t('payments.matrix_title', { month: monthName })}
          </h1>
          <p className="text-body-md text-secondary">{t('payments.matrix_subtitle')}</p>
        </div>
        <Link href="/payment-message" className="btn-primary" style={{ textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chat</span>
          {t('payments.generate_message')}
        </Link>
      </div>

      {/* ── "What I Owe Now" Summary ── */}
      {regularCycles.length > 0 && (
        <div className="card" style={{ padding: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <p className="text-label-md text-secondary">{t('payments.what_i_owe')}</p>
            <div className="text-display-financial text-on-surface">{formatCents(myUnpaidCents, house.currency)}</div>
            <p className="text-body-sm text-secondary" style={{ marginTop: 4 }}>
              {regularCycles.map(g => g.bill?.name).join(' + ')}
            </p>
          </div>
          {myUnpaidCents === 0 ? (
            <span className="badge badge-paid" style={{ fontSize: 14, padding: '6px 16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
              {t('status.fully_paid')}
            </span>
          ) : (
            <span className="badge badge-overdue" style={{ fontSize: 14, padding: '6px 16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
              {t('status.waiting')}
            </span>
          )}
        </div>
      )}

      {/* ── Monthly House Payments — Individual Bill Cards ── */}
      <div>
        <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>
          {t('payments.monthly_house_payments')}
        </h2>

        {regularCycles.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <EmptyState
              icon="💳"
              title={t('payments.no_cycles')}
              description={t('payments.no_cycles_desc')}
              actionLabel={house.myRole === 'admin' ? t('payments.add_bill') : null}
              actionHref="/bills/add"
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {regularCycles.map(group => {
              const myPay = group.payments.find(p => p.user_id === currentUserId);
              const isPaid = myPay?.status === 'paid';
              const deadline = getDeadlineStatus(group.cycle.due_date, isPaid, t);
              const billIcon = BILL_ICONS[group.bill?.category] || 'receipt_long';

              return (
                <div key={group.cycle.id} className="card" style={{ padding: 'var(--space-xl)' }}>
                  {/* Bill Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined">{billIcon}</span>
                      </div>
                      <div>
                        <h3 className="text-headline-md text-on-surface">{group.bill?.name}</h3>
                        <p className="text-body-sm text-secondary">
                          {t('payments.due_date', { date: formatDateShort(group.cycle.due_date, locale) })}
                          {' · '}{formatCents(group.cycle.total_amount_cents, house.currency)} total
                        </p>
                      </div>
                    </div>
                    <span className="badge" style={{ ...deadlineBadgeStyle(deadline.type), fontSize: 12, padding: '4px 12px' }}>
                      {deadline.label}
                    </span>
                  </div>

                  {/* Member Payment Status List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
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
                            padding: 'var(--space-sm) var(--space-md)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: isMe ? 'rgba(0, 74, 198, 0.04)' : 'var(--color-surface-container-low)',
                            border: isMe ? '1.5px solid var(--color-primary-fixed-dim)' : '1px solid transparent',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <div className="avatar avatar-sm" style={{ backgroundColor: isMe ? 'var(--color-primary-container)' : 'var(--color-surface-container)', color: isMe ? 'var(--color-on-primary-container)' : 'var(--color-on-surface)' }}>
                              {name[0].toUpperCase()}
                            </div>
                            <span className="text-body-md text-on-surface">
                              {name}{isMe && ` ${t('common.you')}`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <span className="text-label-md font-semibold text-on-surface">
                              {formatCents(p.share_amount_cents, house.currency)}
                            </span>
                            <span className={`badge ${pPaid ? 'badge-paid' : 'badge-overdue'}`}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                {pPaid ? 'check' : 'hourglass_empty'}
                              </span>
                              {pPaid ? t('status.paid') : t('status.waiting')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Individual payment action — MY bill only */}
                  {myPay && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--color-surface-container)' }}>
                      <p className="text-body-sm text-secondary">
                        {t('payments.share_of', { bill: group.bill?.name })}: <strong>{formatCents(myPay.share_amount_cents, house.currency)}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => handleTogglePayment(myPay.id, myPay.status)}
                        className={isPaid ? 'btn-secondary' : 'btn-primary'}
                        style={{ fontSize: 13 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          {isPaid ? 'undo' : 'check'}
                        </span>
                        {isPaid ? t('payments.mark_share_waiting_btn') : t('payments.mark_share_paid_btn')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Wi-Fi Due This Period (if quarterly bill is now due) ── */}
      {dueSavingsCycles.length > 0 && (
        <div>
          <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>
            📶 Wi-Fi — Due This Period
          </h2>
          {dueSavingsCycles.map(group => {
            const myPay = group.payments.find(p => p.user_id === currentUserId);
            const isPaid = myPay?.status === 'paid';
            const deadline = getDeadlineStatus(group.cycle.due_date, isPaid, t);
            return (
              <div key={group.cycle.id} className="card" style={{ padding: 'var(--space-xl)', borderLeft: '4px solid var(--color-warning)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <h3 className="text-headline-md text-on-surface">{group.bill?.name}</h3>
                    <p className="text-body-sm text-secondary">{deadline.label}</p>
                  </div>
                  {myPay && (
                    <button
                      type="button"
                      onClick={() => handleTogglePayment(myPay.id, myPay.status)}
                      className={isPaid ? 'btn-secondary' : 'btn-primary'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{isPaid ? 'undo' : 'check'}</span>
                      {isPaid ? t('payments.mark_share_waiting_btn') : t('payments.mark_share_paid_btn')}
                    </button>
                  )}
                </div>
                {myPay && (
                  <p className="text-body-md text-secondary">
                    {t('payments.share_of', { bill: group.bill?.name })}: <strong>{formatCents(myPay.share_amount_cents, house.currency)}</strong>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Wi-Fi Fund (savings-phase bills not yet due) ── */}
      {wifiBills.length > 0 && (
        <div>
          <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>
            {t('wifi_fund.title')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {wifiBills.map(wBill => {
              const deposits = wifiSavingsMap[wBill.id] ?? [];
              const progress = calculateWifiFundProgress({
                totalBillCents: wBill.total_amount_cents,
                memberCount: members.length || 1,
                frequency: wBill.frequency,
                savedDeposits: deposits,
              });
              return (
                <div key={wBill.id} className="card" style={{ padding: 'var(--space-xl)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--color-primary)' }}>wifi</span>
                      <div>
                        <h3 className="text-headline-md text-on-surface">{wBill.name}</h3>
                        <p className="text-body-sm text-secondary">
                          {t('wifi_fund.monthly_contribution')}: {formatCents(progress.monthlyContributionCents, house.currency)}/mo
                        </p>
                      </div>
                    </div>
                    {progress.isReadyToPay ? (
                      <span className="badge badge-paid">{t('deadline.ready_to_pay')}</span>
                    ) : (
                      <span className="badge badge-upcoming">{t('payments.wifi_not_due')}</span>
                    )}
                  </div>

                  <div className="progress-bar-track" style={{ height: 8, marginBottom: 'var(--space-md)' }}>
                    <div className="progress-bar-fill" style={{ width: `${progress.progressPercent}%` }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)', gap: 'var(--space-md)' }}>
                    <span className="text-body-md text-secondary">{t('wifi_fund.saved')}: <strong style={{ color: 'var(--color-success)' }}>{formatCents(progress.actualSavedCents, house.currency)}</strong></span>
                    <span className="text-body-md text-secondary">{t('wifi_fund.remaining')}: <strong>{formatCents(progress.remainingCents, house.currency)}</strong></span>
                    <span className="text-body-md text-secondary">{t('wifi_fund.target')}: {formatCents(progress.targetCents, house.currency)}</span>
                  </div>

                  {/* Deposit history */}
                  {deposits.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {deposits.map(d => (
                        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-secondary)', padding: '3px 0', borderBottom: '1px solid var(--color-surface-container-low)' }}>
                          <span>{d.saved_date}</span>
                          <span>{d.note || '—'}</span>
                          <span style={{ color: 'var(--color-success)' }}>+{formatCents(d.amount_cents, house.currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}

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
          </div>
        </div>
      )}

      {/* ── Payment History ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h2 className="text-headline-md text-on-surface">{t('payments.history_title')}</h2>
          <button type="button" onClick={() => setShowHistory(!showHistory)} className="btn-secondary" style={{ fontSize: 13 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showHistory ? 'expand_less' : 'history'}</span>
            {showHistory ? 'Hide' : 'Show History'}
          </button>
        </div>

        {showHistory && (
          paymentHistory.length === 0 ? (
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              <EmptyState icon="📋" title={t('payments.no_history')} description={t('payments.no_history_desc')} />
            </div>
          ) : (
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {paymentHistory.map(p => {
                  const cycle = p.bill_cycles;
                  const bill = cycle?.bills;
                  const isPaid = p.status === 'paid';
                  const periodLabel = cycle?.period_start ? getPeriodLabel(cycle.period_start, locale) : '—';
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-container-low)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-on-primary-container)' }}>
                            {BILL_ICONS[bill?.category] || 'receipt'}
                          </span>
                        </div>
                        <div>
                          <p className="text-body-md text-on-surface font-medium">{bill?.name || '—'}</p>
                          <p className="text-label-sm text-secondary">{periodLabel}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p className="text-label-md font-semibold text-on-surface">{formatCents(p.share_amount_cents, house.currency)}</p>
                        <span className={`badge ${isPaid ? 'badge-paid' : 'badge-overdue'}`} style={{ fontSize: 11 }}>
                          {isPaid ? t('status.paid') : t('status.waiting')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* Savings Modal */}
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
            <h3 className="text-headline-md text-on-surface" style={{ marginBottom: 4 }}>{t('wifi_fund.record_deposit')}</h3>
            <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-md)' }}>{t('wifi_fund.monthly_contribution')}</p>
            <form onSubmit={handleAddSavings} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label htmlFor="savingsDepositAmt" className="input-label">
                  {`Amount (${house?.currency ?? '$'})`}
                </label>
                <input
                  id="savingsDepositAmt"
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
                <button type="button" onClick={() => setShowSavingModal(false)} className="btn-secondary" style={{ flex: 1 }}>{t('common.cancel')}</button>
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
