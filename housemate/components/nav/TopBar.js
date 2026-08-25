'use client';

import Link from 'next/link';

/**
 * Mobile Top Bar
 *
 * Matches Stitch design: dashboard_housemate_1 & DESIGN.md
 *
 * Fixed top bar displayed on mobile screens with HM badge, HouseMate title, and quick action icons.
 */
export default function TopBar() {
  return (
    <header className="topbar">
      <Link href="/dashboard" className="topbar-brand" style={{ textDecoration: 'none' }}>
        <div className="topbar-brand-logo">HM</div>
        <span>HouseMate</span>
      </Link>

      <div className="topbar-actions">
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
