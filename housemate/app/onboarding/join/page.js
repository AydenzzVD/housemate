'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { joinHouse } from '@/lib/houses';
import { useLanguage } from '@/lib/lang/useLanguage';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Join House Page
 *
 * Matches Stitch design: join_house_housemate/screen.png
 */
export default function JoinHousePage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleJoin(e) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.length !== 6) {
      setError(t('onboarding.error_code_length'));
      return;
    }

    setError('');
    setLoading(true);

    const { data, error: joinError } = await joinHouse(cleanCode);

    if (joinError) {
      if (joinError.includes('not found')) {
        setError(t('onboarding.error_code_not_found'));
      } else if (joinError.includes('already a member')) {
        setError(t('onboarding.error_already_member'));
      } else {
        setError(joinError || t('onboarding.error_join_generic'));
      }
      setLoading(false);
      return;
    }

    // Set the house membership cookie so middleware knows this user has a house
    await fetch('/api/house/set-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set' }),
    });

    setSuccess(t('onboarding.join_success', { name: data.name }));
    setLoading(false);
    setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 1000);
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
        <h1 className="text-headline-md text-on-surface">{t('onboarding.join_header')}</h1>
        <LanguageSwitcher />
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
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
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
                sensor_door
              </span>
            </div>
            <h2 className="text-headline-lg-mobile text-on-surface" style={{ marginBottom: 4 }}>
              {t('onboarding.join_title')}
            </h2>
            <p className="text-body-md text-secondary">
              {t('onboarding.join_subtitle')}
            </p>
          </div>

          {error && (
            <div className="error-message" style={{ marginBottom: 'var(--space-md)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                fontSize: 'var(--text-label-md-size)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                marginBottom: 'var(--space-md)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
              {success}
            </div>
          )}

          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <label htmlFor="house-code" className="input-label">
                {t('onboarding.house_code')}
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'absolute',
                    left: 'var(--space-sm)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-secondary)',
                    fontSize: 20,
                    pointerEvents: 'none',
                  }}
                >
                  key
                </span>
                <input
                  id="house-code"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g., OUR5X7"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="input-field"
                  style={{
                    paddingLeft: 'calc(var(--space-sm) + 20px + var(--space-xs))',
                    letterSpacing: '0.2em',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '18px',
                  }}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-xs)' }}
            >
              {loading ? t('onboarding.joining') : t('onboarding.join_btn')}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
