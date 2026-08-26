'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBillById, deactivateBill, reactivateBill } from '@/lib/bills';
import { getMySavings, addSavingDeposit, calculateWifiFundProgress } from '@/lib/savings';
import { getUserHouse, getHouseMembers } from '@/lib/houses';
import { toggleMyPayment } from '@/lib/payments';
import { formatCents, BILL_ICONS } from '@/lib/money';
import { getDeadlineStatus, formatDateShort, getPeriodLabel } from '@/lib/dates';
import { createBrowserClient } from '@supabase/ssr';
import { useLanguage } from '@/lib/lang/useLanguage';

/**
 * Bill Details Page — shows current cycle, payment status per member,
 * historical cycles, Wi-Fi savings tracker, and admin Deactivate/Reactivate.
 */
export default function BillDetailsPage({ params }) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const unwrappedParams = use(params);
  const billId = unwrappedParams.id;

  const [billData, setBillData] = useState(null);
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [savings, setSavings] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingsDeposit, setSavingsDeposit] = useState('3.00');
  const [showSavingModal, setShowSavingModal] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // 'deactivate' | 'reactivate'
  const [actionLoading, setActionLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const locale = lang === 'km' ? 'km-KH' : 'en-US';

  useEffect(() => {
    async function loadData() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const [bData, hData, sData] = await Promise.all([
        getBillById(billId),
        getUserHouse(),
        getMySavings(billId),
      ]);

      setBillData(bData);
      setHouse(hData);
      setSavings(sData);

      if (hData) {
        const m = await getHouseMembers(hData.id);
        setMembers(m);
      }
      setLoading(false);
    }
    loadData();
  }, [billId]);

  async function handleTogglePayment(paymentId, currentStatus) {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const { error } = await toggleMyPayment(paymentId, newStatus);
    if (error) {
      setToast(`❌ ${error}`);
    } else {
      setToast(newStatus === 'paid' ? `✓ ${t('payments.toast_paid')}` : `↩ ${t('payments.toast_unpaid')}`);
      // Refresh bill data
      const updated = await getBillById(billId);
      setBillData(updated);
    }
    setTimeout(() => setToast(''), 3000);
  }

  async function handleDeactivate() {
    setActionLoading(true);
    const { error } = await deactivateBill(billId);
    if (error) {
      setToast(`❌ ${error}`);
    } else {
      setToast(t('bills_mgmt.deactivated_toast'));
      const updated = await getBillById(billId);
      setBillData(updated);
    }
    setActionLoading(false);
    setConfirmAction(null);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleReactivate() {
    setActionLoading(true);
    const { error } = await reactivateBill(billId);
    if (error) {
      setToast(`❌ ${error}`);
    } else {
      setToast(t('bills_mgmt.reactivated_toast'));
      const updated = await getBillById(billId);
      setBillData(updated);
    }
    setActionLoading(false);
    setConfirmAction(null);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleRecordSaving(e) {
    e.preventDefault();
    const depositCents = Math.round(parseFloat(savingsDeposit || '0') * 100);
    if (depositCents <= 0) return;

    const { error } = await addSavingDeposit({
      billId: bill.id,
      amountCents: depositCents,
      savedDate: new Date().toISOString().split('T')[0],
      note: 'Wi-Fi saving deposit',
    });

    if (error) {
      setToast(`❌ ${error}`);
    } else {
      setShowSavingModal(false);
      setToast(`✓ ${t('wifi_fund.record_deposit')} ${formatCents(depositCents, house?.currency)}`);
      const updatedSavings = await getMySavings(bill.id);
      setSavings(updatedSavings);
    }
    setTimeout(() => setToast(''), 3000);
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)', maxWidth: 880, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 250, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!billData || !billData.bill) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <h2>Bill not found</h2>
        <Link href="/house" className="btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
          Back to House
        </Link>
      </div>
    );
  }

  const { bill, cycles, latestCycle, payments } = billData;
  const isAdmin = house?.myRole === 'admin';
  const isActive = bill.is_active;

  const isWifi = bill.category === 'wifi' || bill.frequency === 'quarterly' ||
    bill.name.toLowerCase().includes('wifi') || bill.name.toLowerCase().includes('wi-fi');

  const myPayment = payments.find(p => p.user_id === currentUserId);
  const isPaid = myPayment?.status === 'paid';

  // Wi-Fi savings progress
  const progress = isWifi ? calculateWifiFundProgress({
    totalBillCents: bill.total_amount_cents,
    memberCount: members.length || 1,
    frequency: bill.frequency,
    savedDeposits: savings,
  }) : null;

  // Real-time deadline for latest cycle
  const deadline = latestCycle ? getDeadlineStatus(latestCycle.due_date, isPaid, t) : null;

  const billIcon = BILL_ICONS[bill.category] || 'receipt_long';

  const deadlineBadgeStyle = (type) => {
    if (type === 'paid') return { backgroundColor: 'var(--color-success)', color: '#fff' };
    if (type === 'overdue') return { backgroundColor: 'var(--color-error)', color: '#fff' };
    if (type === 'today') return { backgroundColor: 'var(--color-warning)', color: '#000' };
    return { backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' };
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: 880, margin: '0 auto' }}>
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Link href="/house" className="btn-icon" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-primary)' }}>{billIcon}</span>
          <div>
            <h1 className="text-headline-lg text-on-surface">{bill.name}</h1>
            <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
              {isActive ? (
                <span className="badge badge-paid" style={{ fontSize: 11 }}>{t('bills_mgmt.active_badge')}</span>
              ) : (
                <span className="badge" style={{ backgroundColor: 'var(--color-error)', color: '#fff', fontSize: 11 }}>
                  {t('bills_mgmt.deactivated_badge')}
                </span>
              )}
              {deadline && (
                <span className="badge" style={{ ...deadlineBadgeStyle(deadline.type), fontSize: 11 }}>
                  {deadline.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Link href={`/bills/${bill.id}/edit`} className="btn-secondary" style={{ padding: '6px 16px', textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
              {t('common.edit')}
            </Link>
            {isActive ? (
              <button type="button" className="btn-secondary" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => setConfirmAction('deactivate')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>pause_circle</span>
                {t('bills_mgmt.deactivate_bill')}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => setConfirmAction('reactivate')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_circle</span>
                {t('bills_mgmt.reactivate_bill')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bill Summary + Share Cards */}
      <div className="bento-grid bento-grid-2">
        {/* Bill Summary */}
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <p className="text-label-sm text-secondary uppercase tracking-wider mb-xs">Bill Summary</p>
          <div className="text-display-financial text-primary" style={{ marginBottom: 'var(--space-md)' }}>
            {formatCents(bill.total_amount_cents, house?.currency)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {[
              { label: 'Frequency', value: bill.frequency === 'quarterly' ? t('frequency.quarterly') : bill.frequency === 'monthly' ? t('frequency.monthly') : bill.frequency },
              { label: 'Due Day', value: latestCycle ? formatDateShort(latestCycle.due_date, locale) : `Day ${bill.due_day_of_month}` },
              { label: 'Split', value: `${payments.length || members.length || 1} ${t('common.members')}` },
              { label: 'Status', value: isActive ? t('bills_mgmt.active_badge') : t('bills_mgmt.deactivated_badge') },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-surface-container)' }}>
                <span className="text-body-md text-secondary">{label}</span>
                <span className="text-label-md font-semibold text-on-surface">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your Share + Wi-Fi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Your Share */}
          {myPayment && (
            <div style={{ backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', boxShadow: 'var(--shadow-level-1)' }}>
              <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85 }}>Your Share</span>
              <div className="text-display-financial" style={{ color: '#ffffff', margin: '4px 0' }}>
                {formatCents(myPayment.share_amount_cents, house?.currency)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <p style={{ opacity: 0.9, fontSize: 14 }}>
                  {latestCycle ? `Due ${formatDateShort(latestCycle.due_date, locale)}` : `Day ${bill.due_day_of_month}`}
                </p>
                <button
                  type="button"
                  onClick={() => handleTogglePayment(myPayment.id, myPayment.status)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isPaid ? 'rgba(255,255,255,0.2)' : '#fff',
                    color: isPaid ? '#fff' : 'var(--color-primary)',
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{isPaid ? 'undo' : 'check'}</span>
                  {isPaid ? t('payments.mark_share_waiting_btn') : t('payments.mark_share_paid_btn')}
                </button>
              </div>
            </div>
          )}

          {/* Wi-Fi Saving Tracker */}
          {isWifi && progress && (
            <div className="card" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                <h3 className="text-headline-md text-on-surface" style={{ fontSize: 18 }}>{t('wifi_fund.title')}</h3>
                <span className="badge badge-member" style={{ backgroundColor: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)' }}>
                  {formatCents(progress.monthlyContributionCents, house?.currency)}/mo
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '8px 0 6px' }}>
                <span className="text-primary font-bold">{t('wifi_fund.saved')} {formatCents(progress.actualSavedCents, house?.currency)}</span>
                <span className="text-secondary">{t('wifi_fund.remaining')} {formatCents(progress.remainingCents, house?.currency)}</span>
              </div>

              <div className="progress-bar-track" style={{ height: 8, marginBottom: 'var(--space-md)' }}>
                <div className="progress-bar-fill" style={{ width: `${progress.progressPercent}%` }} />
              </div>

              {progress.isReadyToPay && (
                <p className="text-body-sm" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-sm)' }}>
                  ✓ {t('deadline.ready_to_pay')}
                </p>
              )}

              <button type="button" onClick={() => setShowSavingModal(true)} className="btn-secondary" style={{ width: '100%', minHeight: 38, fontSize: 13 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>savings</span>
                {t('wifi_fund.record_deposit')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Status Section */}
      {latestCycle && (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 className="text-headline-md text-on-surface">
              Roommate Payment Status — {latestCycle ? getPeriodLabel(latestCycle.period_start, locale) : 'No cycle'}
            </h3>
            {deadline && (
              <span className="badge" style={deadlineBadgeStyle(deadline.type)}>{deadline.label}</span>
            )}
          </div>

          {payments.length === 0 ? (
            <p className="text-body-md text-secondary">No payment records found for this bill cycle.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              {payments.map(p => {
                const isMe = p.user_id === currentUserId;
                const pPaid = p.status === 'paid';
                const name = p.profiles?.full_name || 'Member';
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', backgroundColor: isMe ? 'rgba(0,74,198,0.04)' : 'var(--color-surface-container-low)', border: isMe ? '1.5px solid var(--color-primary-fixed-dim)' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <div className="avatar avatar-sm" style={{ backgroundColor: isMe ? 'var(--color-primary-container)' : 'var(--color-surface-container)', color: isMe ? 'var(--color-on-primary-container)' : 'var(--color-on-surface)' }}>
                        {name[0].toUpperCase()}
                      </div>
                      <span className="text-body-md text-on-surface font-medium">{name} {isMe && t('common.you')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <span className="text-body-md font-semibold text-on-surface">{formatCents(p.share_amount_cents, house?.currency)}</span>
                      <span className={`badge ${pPaid ? 'badge-paid' : 'badge-overdue'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{pPaid ? 'check_circle' : 'hourglass_empty'}</span>
                        {pPaid ? t('status.paid') : t('status.waiting')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Billing History */}
      {cycles && cycles.length > 1 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 className="text-headline-md text-on-surface">{t('payments.payment_history')}</h3>
            <button type="button" className="btn-secondary" style={{ fontSize: 13 }} onClick={() => setShowHistory(!showHistory)}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showHistory ? 'expand_less' : 'history'}</span>
              {showHistory ? 'Hide' : 'Show All'}
            </button>
          </div>

          {showHistory && (
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              {cycles.slice(1).length === 0 ? (
                <p className="text-body-md text-secondary">{t('bills_mgmt.no_history')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  {cycles.slice(1).map(cyc => (
                    <div key={cyc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-container-low)' }}>
                      <div>
                        <p className="text-body-md font-medium text-on-surface">{getPeriodLabel(cyc.period_start, locale)}</p>
                        <p className="text-label-sm text-secondary">Due {formatDateShort(cyc.due_date, locale)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p className="text-label-md font-semibold text-on-surface">{formatCents(cyc.total_amount_cents, house?.currency)}</p>
                        <span className={`badge ${cyc.status === 'fully_paid' ? 'badge-paid' : cyc.status === 'overdue' ? 'badge-overdue' : 'badge-upcoming'}`} style={{ fontSize: 11 }}>
                          {cyc.status === 'fully_paid' ? t('status.fully_paid') : cyc.status === 'overdue' ? t('status.overdue') : t('status.due')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Deactivate/Reactivate modal */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 'var(--space-md)' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: 'var(--space-xl)' }}>
            <h3 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-sm)' }}>
              {confirmAction === 'deactivate' ? t('bills_mgmt.deactivate_bill') : t('bills_mgmt.reactivate_bill')}
            </h3>
            <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
              {confirmAction === 'deactivate' ? t('bills_mgmt.deactivate_confirm') : t('bills_mgmt.reactivate_confirm')}
            </p>
            {confirmAction === 'deactivate' && (
              <p className="text-body-sm" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-md)' }}>
                ✓ {t('bills_mgmt.history_frozen_note')}
              </p>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button type="button" onClick={() => setConfirmAction(null)} className="btn-secondary" style={{ flex: 1 }} disabled={actionLoading}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmAction === 'deactivate' ? handleDeactivate : handleReactivate}
                className="btn-primary"
                style={{ flex: 1, backgroundColor: confirmAction === 'deactivate' ? 'var(--color-error)' : undefined }}
                disabled={actionLoading}
              >
                {actionLoading ? t('common.saving') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wi-Fi Deposit Modal */}
      {showSavingModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 'var(--space-md)' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 400, padding: 'var(--space-xl)' }}>
            <h3 className="text-headline-md text-on-surface" style={{ marginBottom: 4 }}>{t('wifi_fund.record_deposit')}</h3>
            <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-md)' }}>Log your Wi-Fi monthly saving.</p>
            <form onSubmit={handleRecordSaving} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label htmlFor="wifiDeposit" className="input-label">{`Amount (${house?.currency ?? '$'})`}</label>
                <input id="wifiDeposit" type="number" step="0.01" min="0.01" required value={savingsDeposit} onChange={e => setSavingsDeposit(e.target.value)} className="input-field" autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button type="button" onClick={() => setShowSavingModal(false)} className="btn-secondary" style={{ flex: 1 }}>{t('common.cancel')}</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{t('wifi_fund.record_deposit')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
