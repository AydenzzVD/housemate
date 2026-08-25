'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserHouse, getHouseMembers, removeMember, leaveHouse } from '@/lib/houses';
import { getCurrentCyclePayments } from '@/lib/payments';
import { createBrowserClient } from '@supabase/ssr';
import EmptyState from '@/components/EmptyState';

/**
 * House Members Directory — live multi-user data
 * Matches Stitch design: house_members_housemate/screen.png
 */
export default function HouseMembersPage() {
  const router = useRouter();
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [cycleGroups, setCycleGroups] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Modals & Action states
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    async function loadData() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const houseData = await getUserHouse();
      setHouse(houseData);

      if (houseData) {
        const [membersData, cyclesData] = await Promise.all([
          getHouseMembers(houseData.id),
          getCurrentCyclePayments(houseData.id),
        ]);
        setMembers(membersData);
        setCycleGroups(cyclesData);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)' }}>
        <div className="skeleton" style={{ height: 40, width: 250, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 250, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!house) return null;

  function handleCopyCode() {
    if (house?.join_code) {
      navigator.clipboard.writeText(house.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  async function handleConfirmRemove() {
    if (!memberToRemove) return;
    setActionLoading(true);
    setActionError('');

    const { error } = await removeMember(memberToRemove.user_id);
    if (error) {
      setActionError(error);
      setActionLoading(false);
      return;
    }

    setMembers(prev => prev.filter(m => m.user_id !== memberToRemove.user_id));
    setMemberToRemove(null);
    setActionLoading(false);
  }

  async function handleConfirmLeave() {
    setActionLoading(true);
    setActionError('');

    const { error } = await leaveHouse();
    if (error) {
      setActionError(error);
      setActionLoading(false);
      return;
    }

    router.push('/onboarding');
  }

  // Get payment status for each member across latest cycles
  const firstGroup = cycleGroups[0] || null;
  const isAdmin = house.myRole === 'admin';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Link href="/house" className="btn-icon" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-headline-lg text-on-surface" style={{ marginBottom: 2 }}>
              House Members
            </h1>
            <p className="text-body-md text-secondary">
              {members.length} roommate{members.length !== 1 ? 's' : ''} in {house.name}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
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

          <button
            type="button"
            onClick={() => { setActionError(''); setShowLeaveModal(true); }}
            className="btn-secondary"
            style={{ color: 'var(--color-error, #d32f2f)', borderColor: 'rgba(211, 47, 47, 0.3)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              logout
            </span>
            Leave House
          </button>
        </div>
      </div>

      {/* Main Members Grid */}
      <div className="bento-grid bento-grid-12">
        <div className="col-span-8">
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-lg)' }}>
              Roommate Directory
            </h2>

            {members.length === 0 ? (
              <EmptyState
                icon="👥"
                title="You're the only member"
                description="Share your house code to invite roommates."
                actionLabel="Copy House Code"
                onAction={handleCopyCode}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {members.map(member => {
                  const isMe = member.user_id === currentUserId;
                  const name = member.profiles?.full_name || 'Roommate';
                  const initial = name[0].toUpperCase();

                  // Payment status from current cycle
                  const memberPayment = firstGroup?.payments.find(p => p.user_id === member.user_id);
                  const isPaid = memberPayment?.status === 'paid';

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
                          {initial}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <h3 className="text-headline-md" style={{ fontSize: 18 }}>
                              {name}
                            </h3>
                            {isMe && (
                              <span className="text-label-sm text-primary font-bold">(You)</span>
                            )}
                          </div>
                          <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
                            Joined {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span className={`badge ${member.role === 'admin' ? 'badge-admin' : 'badge-member'}`}>
                          {member.role === 'admin' ? 'Admin' : 'Member'}
                        </span>

                        {firstGroup && (
                          <span className={`badge ${isPaid ? 'badge-paid' : 'badge-overdue'}`}>
                            {isPaid ? 'Paid' : 'Waiting'}
                          </span>
                        )}

                        {/* Admin Action: Remove Roommate */}
                        {isAdmin && !isMe && member.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => { setActionError(''); setMemberToRemove(member); }}
                            className="btn-icon"
                            title="Remove from house"
                            style={{ color: 'var(--color-error, #d32f2f)', marginLeft: 'var(--space-xs)' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                              person_remove
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Info Box */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-sm)' }}>
              House Code
            </h3>
            <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-md)' }}>
              Give this code to roommates when they register:
            </p>
            <div
              style={{
                backgroundColor: 'var(--color-surface-container)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                border: '1px solid var(--color-outline-variant)',
                textAlign: 'center',
                marginBottom: 'var(--space-md)',
              }}
            >
              <div
                className="text-display-financial text-primary"
                style={{ letterSpacing: '0.15em', fontWeight: 900 }}
              >
                {house.join_code}
              </div>
            </div>

            <div className="divider" style={{ marginBottom: 'var(--space-md)' }} />

            <h3 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-sm)' }}>
              How Roles Work
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="badge badge-admin">Admin</span>
                </div>
                <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
                  Can add, edit, and deactivate shared bills, remove members, generate payment summary messages, and manage house settings.
                </p>
              </div>

              <div className="divider" />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="badge badge-member">Member</span>
                </div>
                <p className="text-body-md text-secondary" style={{ fontSize: 14 }}>
                  Can view shared bills, mark their own share as paid, track personal expenses, leave the house, and record Wi-Fi savings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Remove Member */}
      {memberToRemove && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-md)',
          }}
        >
          <div className="card fade-in" style={{ maxWidth: 420, width: '100%', padding: 'var(--space-xl)' }}>
            <h3 className="text-headline-lg text-on-surface" style={{ marginBottom: 'var(--space-xs)' }}>
              Remove Roommate?
            </h3>
            <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
              Are you sure you want to remove <strong>{memberToRemove.profiles?.full_name || 'this roommate'}</strong> from <strong>{house.name}</strong>? They will lose access to house bills.
            </p>

            {actionError && (
              <div className="error-message" style={{ marginBottom: 'var(--space-md)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                {actionError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setMemberToRemove(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmRemove}
                disabled={actionLoading}
                style={{ backgroundColor: 'var(--color-error, #d32f2f)' }}
              >
                {actionLoading ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Leave House */}
      {showLeaveModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-md)',
          }}
        >
          <div className="card fade-in" style={{ maxWidth: 420, width: '100%', padding: 'var(--space-xl)' }}>
            <h3 className="text-headline-lg text-on-surface" style={{ marginBottom: 'var(--space-xs)' }}>
              Leave House?
            </h3>
            <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
              Are you sure you want to leave <strong>{house.name}</strong>? {isAdmin && members.length > 1 ? 'Since you are Admin, another member will be automatically promoted to Admin.' : ''}
            </p>

            {actionError && (
              <div className="error-message" style={{ marginBottom: 'var(--space-md)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                {actionError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowLeaveModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmLeave}
                disabled={actionLoading}
                style={{ backgroundColor: 'var(--color-error, #d32f2f)' }}
              >
                {actionLoading ? 'Leaving...' : 'Confirm Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

