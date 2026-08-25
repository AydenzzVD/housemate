import Link from 'next/link';
import Sidebar from '@/components/nav/Sidebar';
import TopBar from '@/components/nav/TopBar';
import BottomNav from '@/components/nav/BottomNav';

/**
 * Dashboard Shell Layout
 *
 * Wraps all main authenticated application pages with:
 * - Desktop: Fixed 280px left sidebar
 * - Mobile: Fixed TopBar + Fixed BottomNav + Quick Add FAB
 */
export default function DashboardLayout({ children }) {
  return (
    <div className="page-wrapper">
      {/* Desktop Navigation */}
      <Sidebar />

      {/* Mobile Top Navigation */}
      <TopBar />

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>

      {/* Mobile Floating Action Button (Quick Add Expense) */}
      <Link href="/expenses/add" className="fab" aria-label="Add Expense">
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
          add
        </span>
      </Link>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
