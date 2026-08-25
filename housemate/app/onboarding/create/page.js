'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * Create House Page
 *
 * Matches Stitch design: create_house_housemate/screen.png
 *
 * Step 1: Input House Name
 * Step 2: Display generated 6-character Join Code (e.g. OUR5X7) with Copy button
 */
export default function CreateHousePage() {
  const router = useRouter();
  const supabase = createClient();

  const [houseName, setHouseName] = useState('');
  const [currency, setCurrency] = useState('$');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdHouse, setCreatedHouse] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!houseName.trim()) {
      setError('Please enter a house name.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Fallback for mock demo session
        const mockCode = 'OUR5X7';
        setCreatedHouse({
          house_id: 'mock-house-1',
          name: houseName.trim(),
          join_code: mockCode,
          role: 'admin',
        });
        setLoading(false);
        return;
      }

      // Call the atomic create_house_with_admin RPC
      const { data, error: rpcError } = await supabase.rpc('create_house_with_admin', {
        p_name: houseName.trim(),
        p_currency: currency,
      });

      if (rpcError) {
        // Fallback: Direct insert if RPC not executed yet in Supabase
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: houseData, error: houseErr } = await supabase
          .from('houses')
          .insert({
            name: houseName.trim(),
            currency: currency,
            join_code: joinCode,
            created_by: user.id,
          })
          .select()
          .single();

        if (houseErr) throw houseErr;

        await supabase.from('house_members').insert({
          house_id: houseData.id,
          user_id: user.id,
          role: 'admin',
        });

        setCreatedHouse({
          house_id: houseData.id,
          name: houseData.name,
          join_code: houseData.join_code,
          role: 'admin',
        });
      } else {
        setCreatedHouse(data);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create house. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (createdHouse?.join_code) {
      navigator.clipboard.writeText(createdHouse.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-background)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-md) var(--space-margin-mobile)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-level-1)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          href="/onboarding"
          className="btn-icon"
          style={{ textDecoration: 'none' }}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-headline-md text-on-surface">Create House</h1>
        <div style={{ width: 40 }} />
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-md)',
        }}
      >
        <div
          className="card fade-in"
          style={{
            width: '100%',
            maxWidth: 448,
            padding: 'var(--space-xl)',
          }}
        >
          {!createdHouse ? (
            /* Step 1: Create Form */
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-primary-container)',
                    color: 'var(--color-on-primary-container)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-sm)',
                  }}
                >
                  <span
                    className="material-symbols-outlined filled"
                    style={{ fontSize: 32 }}
                  >
                    home_work
                  </span>
                </div>
                <h2 className="text-headline-lg-mobile text-on-surface" style={{ marginBottom: 4 }}>
                  Set up your shared home
                </h2>
                <p className="text-body-md text-secondary">
                  Give your house a name to start collaborating.
                </p>
              </div>

              {error && (
                <div className="error-message">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="house-name" className="input-label">
                  House Name
                </label>
                <input
                  id="house-name"
                  type="text"
                  required
                  placeholder="e.g., The Blue Door, Our House"
                  value={houseName}
                  onChange={e => setHouseName(e.target.value)}
                  className="input-field"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="currency" className="input-label">
                  Currency Symbol
                </label>
                <div className="select-wrapper">
                  <select
                    id="currency"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="select-field"
                  >
                    <option value="$">$ (USD / AUD / CAD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="៛">៛ (KHR)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', marginTop: 'var(--space-sm)' }}
              >
                {loading ? 'Creating House...' : 'Create House'}
              </button>
            </form>
          ) : (
            /* Step 2: House Created & Join Code */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--space-md)' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-success-bg)',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined filled" style={{ fontSize: 36 }}>
                  check_circle
                </span>
              </div>

              <div>
                <h2 className="text-headline-lg-mobile text-on-surface" style={{ marginBottom: 4 }}>
                  House Created!
                </h2>
                <p className="text-body-md text-secondary" style={{ maxWidth: 300 }}>
                  Share this code with your roommates so they can join <strong>{createdHouse.name}</strong>.
                </p>
              </div>

              {/* Code Display */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: 'var(--color-surface-container)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-md)',
                  border: '1px solid var(--color-outline-variant)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                }}
              >
                <span className="text-label-sm text-secondary uppercase tracking-wider">
                  House Code
                </span>
                <span
                  className="text-display-financial text-primary"
                  style={{ letterSpacing: '0.15em', fontWeight: 900 }}
                >
                  {createdHouse.join_code}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  {copied ? 'Copied to Clipboard!' : 'Copy Code'}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="btn-secondary"
                  style={{ width: '100%' }}
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
