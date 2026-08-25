'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/lang/useLanguage';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Desktop Sidebar Navigation
 *
 * Matches Stitch design: dashboard_housemate_1 & DESIGN.md
 *
 * - Width: 280px fixed on left
 * - Brand: HouseMate logo + "Shared Living Harmony"
 * - Primary Action: "Add Expense" button
 * - Nav Tabs: Dashboard, House, Expenses, Payments, Settings
 * - Active state: 4px primary left border, primary/10 background, filled icon
 * - Footer: Language Switcher, Profile & Logout
 */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const navItems = [
    { key: 'dashboard', href: '/dashboard', icon: 'dashboard' },
    { key: 'house',     href: '/house',     icon: 'home_work' },
    { key: 'expenses',  href: '/expenses',  icon: 'receipt_long' },
    { key: 'payments',  href: '/payments',  icon: 'payments' },
    { key: 'settings',  href: '/settings',  icon: 'settings' },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
          <div className="sidebar-brand-logo">HM</div>
          <h1>{t('common.app_name')}</h1>
        </div>
        <p>{t('common.app_tagline')}</p>
      </div>

      {/* Primary CTA */}
      <div style={{ padding: '0 var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <Link
          href="/expenses/add"
          className="btn-primary"
          style={{ width: '100%', textDecoration: 'none' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
          {t('navigation.add_expense')}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <span
                className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}
                style={{ fontSize: 22 }}
              >
                {item.icon}
              </span>
              <span>{t(`navigation.${item.key}`)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Nav */}
      <div className="sidebar-footer" style={{ gap: 'var(--space-xs)' }}>
        <div style={{ padding: '0 var(--space-md) var(--space-xs)', display: 'flex', justifyContent: 'center' }}>
          <LanguageSwitcher />
        </div>
        <Link
          href="/settings"
          className={`sidebar-nav-item ${pathname === '/settings' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            account_circle
          </span>
          <span>{t('navigation.profile')}</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-nav-item"
          style={{ color: 'var(--color-secondary)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            logout
          </span>
          <span>{t('navigation.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
