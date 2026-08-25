'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Mobile Bottom Navigation Bar
 *
 * Matches Stitch design: dashboard_housemate_1 & DESIGN.md
 *
 * 5 Navigation items:
 * - Home (/dashboard)
 * - House (/house)
 * - Expenses (/expenses)
 * - Payments (/payments)
 * - Profile (/settings)
 */
export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { label: 'Home',     href: '/dashboard', icon: 'home' },
    { label: 'House',    href: '/house',     icon: 'group' },
    { label: 'Expenses', href: '/expenses',  icon: 'receipt_long' },
    { label: 'Payments', href: '/payments',  icon: 'account_balance_wallet' },
    { label: 'Profile',  href: '/settings',  icon: 'person' },
  ];

  return (
    <nav className="bottom-nav">
      {items.map(item => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
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
  );
}
