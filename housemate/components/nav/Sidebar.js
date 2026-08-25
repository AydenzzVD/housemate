'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
 * - Footer: Profile & Logout
 */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'House',     href: '/house',     icon: 'home_work' },
    { label: 'Expenses',  href: '/expenses',  icon: 'receipt_long' },
    { label: 'Payments',  href: '/payments',  icon: 'payments' },
    { label: 'Settings',  href: '/settings',  icon: 'settings' },
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
          <h1>HouseMate</h1>
        </div>
        <p>Shared Living Harmony</p>
      </div>

      {/* Primary CTA */}
      <div style={{ padding: '0 var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <Link
          href="/expenses/add"
          className="btn-primary"
          style={{ width: '100%', textDecoration: 'none' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
          Add Expense
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Nav */}
      <div className="sidebar-footer">
        <Link
          href="/settings"
          className={`sidebar-nav-item ${pathname === '/settings' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            account_circle
          </span>
          <span>Profile</span>
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
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
