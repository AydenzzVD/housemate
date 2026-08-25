'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getLocalStore, saveLocalStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

/**
 * Settings & Profile Page
 *
 * Matches Stitch design: profile_housemate/screen.png
 *
 * - User Profile Details
 * - House Information & Join Code
 * - Role Switcher (for testing the 5 roommates scenario in pairing review!)
 * - Logout Action
 */
export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [store, setStore] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setStore(getLocalStore());
  }, []);

  if (!store) return null;

  const { house, members, currentUser } = store;

  function handleCopyCode() {
    if (house?.join_code) {
      navigator.clipboard.writeText(house.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  // Quick switch user (enables testing all 5 roommates Devid, Dara, Sok, Vannak, Rith easily)
  function handleSwitchUser(memberId) {
    const selected = members.find(m => m.id === memberId);
    if (!selected) return;

    const nextStore = { ...store, currentUser: selected };
    setStore(nextStore);
    saveLocalStore(nextStore);

    setToast(`✓ Switched active profile to ${selected.full_name} (${selected.role})`);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: 720, margin: '0 auto' }}>
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div>
        <h1 className="text-headline-lg text-on-surface" style={{ marginBottom: 4 }}>
          Account &amp; House Settings
        </h1>
        <p className="text-body-md text-secondary">
          Manage your personal profile and household configuration.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <div
            className="avatar avatar-lg"
            style={{
              width: 64,
              height: 64,
              fontSize: 24,
              backgroundColor: 'var(--color-primary-container)',
              color: 'var(--color-on-primary-container)',
            }}
          >
            {currentUser.avatar || currentUser.full_name[0]}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <h2 className="text-headline-md text-on-surface">{currentUser.full_name}</h2>
              <span className={`badge ${currentUser.role === 'admin' ? 'badge-admin' : 'badge-member'}`}>
                {currentUser.role === 'admin' ? 'House Admin' : 'Member'}
              </span>
            </div>
            <p className="text-body-md text-secondary" style={{ marginTop: 2 }}>
              {currentUser.email || `${currentUser.full_name.toLowerCase()}@housemate.local`}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Profile Switcher (Testing 5-Roommates Scenario) */}
      <div className="card" style={{ padding: 'var(--space-xl)', backgroundColor: 'var(--color-surface-container-low)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
          <div>
            <h3 className="text-headline-md text-on-surface" style={{ fontSize: 18 }}>
              Switch Active User Profile (5 Roommates Test)
            </h3>
            <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
              Click any roommate below to test their specific permissions &amp; private data.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', marginTop: 'var(--space-md)' }}>
          {members.map(m => {
            const isSelected = m.id === currentUser.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSwitchUser(m.id)}
                className={`btn-ghost ${isSelected ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: isSelected ? 'var(--color-on-primary)' : 'var(--color-on-surface)',
                  border: '1px solid var(--color-outline-variant)',
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                <span>{m.full_name}</span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>({m.role})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* House Information Card */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>
          Household Information
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-surface-container)' }}>
            <span className="text-body-md text-secondary">House Name</span>
            <span className="text-body-md font-semibold text-on-surface">{house.name}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-surface-container)' }}>
            <span className="text-body-md text-secondary">Active Members</span>
            <span className="text-body-md font-semibold text-on-surface">{members.length} roommates</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <span className="text-body-md text-secondary">House Join Code</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span className="text-headline-md text-primary font-bold" style={{ letterSpacing: '0.1em' }}>
                {house.join_code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn-ghost"
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Card */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-xs)' }}>
          Session Management
        </h2>
        <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
          Signing out will end your current active session on this device.
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="btn-secondary"
          style={{
            borderColor: 'var(--color-error)',
            color: 'var(--color-error)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
          Sign Out of HouseMate
        </button>
      </div>
    </div>
  );
}
