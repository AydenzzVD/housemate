'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUserHouse, getHouseMembers } from '@/lib/houses';
import { getHouseBills } from '@/lib/bills';
import { formatCents } from '@/lib/money';
import { useLanguage } from '@/lib/lang/useLanguage';

/**
 * Group Chat Payment Message Generator Page — live multi-user data
 * Matches Stitch design: payment_message_housemate/screen.png
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
        const [membersData, billsData] = await Promise.all([
          getHouseMembers(hData.id),
          getHouseBills(hData.id),
        ]);

        const memberCount = membersData.length || 1;
        const totalCents = billsData.reduce((sum, b) => sum + b.total_amount_cents, 0);
        const perPersonCents = Math.round(totalCents / memberCount);

        const monthName = new Date().toLocaleString(lang === 'km' ? 'km-KH' : 'en-US', { month: 'long' });

        const billLines = billsData.length > 0
          ? billsData.map(b => `${b.name}: ${formatCents(b.total_amount_cents, hData.currency)}`).join('\n')
          : t('payment_message.no_bills');

        const header = t('payment_message.template_header', { month: monthName });
        const totalStr = t('payment_message.template_total', { total: formatCents(totalCents, hData.currency) });
        const perPersonStr = t('payment_message.template_per_person', { count: memberCount, amount: formatCents(perPersonCents, hData.currency) });
        const footer = t('payment_message.template_footer');

        const generated = `${header}\n\n${billLines}\n\n${totalStr}\n\n${perPersonStr}\n\n${footer}`;

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
            rows={10}
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
