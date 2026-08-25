'use client';

import Link from 'next/link';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/lib/lang/useLanguage';

/**
 * Mobile Top Bar
 *
 * Matches Stitch design: dashboard_housemate_1 & DESIGN.md
 *
 * Fixed top bar displayed on mobile screens with HM badge, HouseMate title, LanguageSwitcher, and quick action icons.
 */
export default function TopBar() {
  const { t } = useLanguage();

  return (
    <header className="topbar">
      <Link href="/dashboard" className="topbar-brand" style={{ textDecoration: 'none' }}>
        <div className="topbar-brand-logo">HM</div>
        <span>{t('common.app_name')}</span>
      </Link>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
        <LanguageSwitcher />
        <Link href="/payment-message" className="btn-icon" style={{ textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            chat
          </span>
        </Link>
        <Link href="/settings" className="btn-icon" style={{ textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            account_circle
          </span>
        </Link>
      </div>
    </header>
  );
}
