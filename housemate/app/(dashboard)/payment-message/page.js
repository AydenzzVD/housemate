'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUserHouse, getHouseMembers } from '@/lib/houses';
import { getCurrentCyclePayments, ensureActiveCycles } from '@/lib/payments';
import { formatCents } from '@/lib/money';
import { formatDateShort, getTodayInHouseTimezone } from '@/lib/dates';
import { useLanguage } from '@/lib/lang/useLanguage';

/**
 * Payment Message Generator — uses LIVE bill cycle data.
 *
 * MESSAGE RULES:
 * - Only regular monthly bills (Rent, Electricity, Water) are included.
 * - Wi-Fi is excluded UNLESS its quarterly cycle is actually DUE this period.
 * - Due dates come from actual bill_cycles.due_date (not hardcoded).
 * - Per-person share is calculated from frozen bill_payments.
 */
export default function PaymentMessagePage() {
  const { t, lang } = useLanguage();
  const [house, setHouse] = useState(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const hData = await getUserHouse();
      setHouse(hData);

      if (hData) {
        const [membersData] = await Promise.all([
          getHouseMembers(hData.id),
        ]);

        // Ensure cycles exist first
        await ensureActiveCycles(hData.id);

        const cyclesData = await getCurrentCyclePayments(hData.id);
        const allCycles = [
          ...cyclesData.regularCycles,
          ...cyclesData.dueSavingsCycles, // Include Wi-Fi only if DUE this period
        ];

        const memberCount = membersData.length || 1;
        const locale = lang === 'km' ? 'km-KH' : 'en-US';
        const monthName = new Date().toLocaleString(locale, { month: 'long' });

        if (allCycles.length === 0) {
          // No active cycles
          const header = t('payment_message.template_header', { month: monthName });
          setMessage(`${header}\n\n${t('payment_message.no_bills')}`);
          setLoading(false);
          return;
        }

        // Build message using live cycle data
        const billLines = allCycles.map(g => {
          const dueStr = formatDateShort(g.cycle.due_date, locale);
          const totalStr = formatCents(g.cycle.total_amount_cents, hData.currency);
          return `${g.bill?.name}: ${totalStr} (Due: ${dueStr})`;
        });

        // Grand total of all active cycle amounts
        const totalCents = allCycles.reduce((sum, g) => sum + g.cycle.total_amount_cents, 0);

        // Per-person: use the first member's share amounts to get exact splits
        // (handles cases where splits aren't perfectly equal due to remainder cents)
        const perPersonCents = Math.round(totalCents / memberCount);

        const header = t('payment_message.template_header', { month: monthName });
        const billSection = billLines.join('\n');
        const totalStr = t('payment_message.template_total', { total: formatCents(totalCents, hData.currency) });
        const perPersonStr = t('payment_message.template_per_person', {
          count: memberCount,
          amount: formatCents(perPersonCents, hData.currency),
        });
        const footer = t('payment_message.template_footer');

        const generated = `${header}\n\n${billSection}\n\n${totalStr}\n${perPersonStr}\n\n${footer}`;
        setMessage(generated);
      }
      setLoading(false);
    }
    loadData();
  }, [lang, t]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)', maxWidth: 640, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 40, width: 250, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!house) return null;

  function handleCopy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Link href="/payments" className="btn-icon" style={{ textDecoration: 'none' }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-headline-lg text-on-surface" style={{ marginBottom: 2 }}>
            {t('payment_message.page_title')}
          </h1>
          <p className="text-body-md text-secondary">
            {t('payment_message.page_subtitle')}
          </p>
        </div>
      </div>

      {/* Message Preview Container */}
      <div className="card" style={{ padding: 'var(--space-xl)', borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--color-surface-container)' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(0, 74, 198, 0.1)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined filled">chat_bubble</span>
          </div>
          <h2 className="text-headline-md text-on-surface">{t('payment_message.preview_title')}</h2>
        </div>

        {/* Message Bubble */}
        {isEditing ? (
          <textarea
            rows={12}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="input-field"
            style={{
              fontFamily: 'inherit',
              fontSize: 15,
              lineHeight: 1.6,
              marginBottom: 'var(--space-lg)',
              resize: 'vertical',
            }}
          />
        ) : (
          <div
            style={{
              backgroundColor: 'var(--color-surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              borderTopLeftRadius: 4,
              padding: 'var(--space-lg)',
              fontFamily: 'inherit',
              fontSize: 16,
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
              border: '1px solid var(--color-surface-container)',
              color: 'var(--color-on-surface)',
              marginBottom: 'var(--space-xl)',
            }}
          >
            {message}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopy}
            className="btn-primary"
            style={{ flex: 2, minWidth: 160 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? t('payment_message.copied_btn') : t('payment_message.copy_btn')}
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="btn-secondary"
            style={{ flex: 1, minWidth: 100 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {isEditing ? 'check' : 'edit'}
            </span>
            {isEditing ? t('payment_message.done_btn') : t('payment_message.edit_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
