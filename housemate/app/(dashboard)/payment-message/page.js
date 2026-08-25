'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLocalStore } from '@/lib/store';
import { formatCents } from '@/lib/money';

/**
 * Group Chat Payment Message Generator Page
 *
 * Matches Stitch design: payment_message_housemate/screen.png
 *
 * - Dynamically generates formatted message from live database bills
 * - 1-Click Copy to clipboard
 * - Customizable message text
 */
export default function PaymentMessagePage() {
  const [store, setStore] = useState(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const s = getLocalStore();
    setStore(s);

    if (s) {
      const memberCount = s.members.length || 5;
      const totalCents = s.bills.reduce((sum, b) => sum + b.total_amount_cents, 0);
      const perPersonCents = Math.round(totalCents / memberCount);

      // Build formatted text message matching Stitch specifications
      const billLines = s.bills
        .map(b => `${b.name}: ${formatCents(b.total_amount_cents, s.house.currency)}`)
        .join('\n');

      const generated = `August House Payment 🏠\n\n${billLines}\n\nTotal: ${formatCents(totalCents, s.house.currency)}\n\n${memberCount} people → ${formatCents(perPersonCents, s.house.currency)}/person\n\nDue: September 1\n\nPlease pay when you can 🙏`;

      setMessage(generated);
    }
  }, []);

  if (!store) return null;

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
            Payment Message Ready
          </h1>
          <p className="text-body-md text-secondary">
            Review and copy the breakdown to send to your group chat.
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
          <h2 className="text-headline-md text-on-surface">Message Preview</h2>
        </div>

        {/* Message Bubble */}
        {isEditing ? (
          <textarea
            rows={10}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="input-field"
            style={{
              fontFamily: 'monospace',
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
            {copied ? 'Copied to Clipboard!' : 'Copy Message'}
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
            {isEditing ? 'Done' : 'Edit Text'}
          </button>
        </div>
      </div>
    </div>
  );
}
