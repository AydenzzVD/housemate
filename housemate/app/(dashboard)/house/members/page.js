'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLocalStore } from '@/lib/store';

/**
 * House Members Directory
 *
 * Matches Stitch design: house_members_housemate/screen.png
 *
 * - Roster of all house members
 * - Avatars, roles (Admin / Member), status badges
 * - House join code widget
 */
export default function HouseMembersPage() {
  const [store, setStore] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStore(getLocalStore());
  }, []);

  if (!store) return null;

  const { house, members, payments, currentUser } = store;

  function handleCopyCode() {
    if (house?.join_code) {
      navigator.clipboard.writeText(house.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Link href="/house" className="btn-icon" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-headline-lg text-on-surface" style={{ marginBottom: 2 }}>
              House Members
            </h1>
            <p className="text-body-md text-secondary">
              {members.length} roommates in {house.name}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyCode}
          className="btn-secondary"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {copied ? 'check' : 'share'}
          </span>
          {copied ? 'Code Copied!' : 'Invite Roommate'}
        </button>
      </div>

      {/* Main Members Grid */}
      <div className="bento-grid bento-grid-12">
        <div className="col-span-8">
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-lg)' }}>
              Roommate Directory
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {members.map(member => {
                const isMe = member.id === currentUser.id;
                const myPay = payments.find(p => p.member_id === member.id);
                const isPaid = myPay?.status === 'paid';

                return (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-md)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isMe ? 'rgba(0, 74, 198, 0.04)' : 'var(--color-surface-container-low)',
                      border: isMe ? '1.5px solid var(--color-primary-fixed-dim)' : '1px solid var(--color-surface-container)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <div
                        className="avatar avatar-lg"
                        style={{
                          backgroundColor: member.role === 'admin' ? 'var(--color-primary-container)' : 'var(--color-secondary-container)',
                          color: member.role === 'admin' ? 'var(--color-on-primary-container)' : 'var(--color-on-secondary-container)',
                          fontWeight: 700,
                        }}
                      >
                        {member.avatar || member.full_name[0]}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                          <h3 className="text-headline-md" style={{ fontSize: 18 }}>
                            {member.full_name}
                          </h3>
                          {isMe && (
                            <span className="text-label-sm text-primary font-bold">(You)</span>
                          )}
                        </div>
                        <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
                          {member.email || `${member.full_name.toLowerCase()}@housemate.local`}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span className={`badge ${member.role === 'admin' ? 'badge-admin' : 'badge-member'}`}>
                        {member.role === 'admin' ? 'Admin' : 'Member'}
                      </span>

                      <span className={`badge ${isPaid ? 'badge-paid' : 'badge-overdue'}`}>
                        {isPaid ? 'Paid' : 'Waiting'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-sm)' }}>
              How Roles Work
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="badge badge-admin">Admin</span>
                </div>
                <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
                  Can add, edit, and delete shared bills, generate group chat messages, and manage household settings.
                </p>
              </div>

              <div className="divider" />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="badge badge-member">Member</span>
                </div>
                <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
                  Can view shared bills, mark their own share as paid, record personal expenses, and track Wi-Fi savings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
