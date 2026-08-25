'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/lang/useLanguage';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Register Page
 *
 * Matches Stitch design: register_housemate/screen.png
 */
export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError(t('auth.error_name_required'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.error_password_short'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.error_password_mismatch'));
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError(t('auth.error_email_registered'));
        } else {
          setError(authError.message || t('auth.error_generic'));
        }
        setLoading(false);
      } else {
        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName.trim(),
            updated_at: new Date().toISOString(),
          });
        }

        router.push('/onboarding');
        router.refresh();
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(t('auth.error_network'));
      setLoading(false);
    }
  }

  return (
    <div className="auth-page" style={{ position: 'relative' }}>
      {/* Top right language switcher */}
      <div style={{ position: 'absolute', top: 'var(--space-md)', right: 'var(--space-md)', zIndex: 10 }}>
        <LanguageSwitcher />
      </div>

      <main className="auth-card fade-in" style={{ maxWidth: 448 }}>
        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon">
            <span
              className="material-symbols-outlined filled"
              style={{ fontSize: 32 }}
            >
              home_work
            </span>
          </div>
          <div>
            <h1
              className="text-headline-lg-mobile text-on-surface"
              style={{ marginBottom: 4 }}
            >
              {t('auth.join_title')}
            </h1>
            <p className="text-body-md text-secondary">
              {t('auth.join_subtitle')}
            </p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="error-message" style={{ marginBottom: 'var(--space-md)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form className="auth-form" onSubmit={handleRegister}>
          {/* Full Name */}
          <div className="auth-form-group">
            <label htmlFor="name" className="input-label">
              {t('auth.full_name')}
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder={t('auth.full_name_placeholder')}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Email */}
          <div className="auth-form-group">
            <label htmlFor="email" className="input-label">
              {t('auth.email_address')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t('auth.email_placeholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Password */}
          <div className="auth-form-group">
            <label htmlFor="password" className="input-label">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder={t('auth.password_placeholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Confirm Password */}
          <div className="auth-form-group">
            <label htmlFor="confirm-password" className="input-label">
              {t('auth.confirm_password')}
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              placeholder={t('auth.confirm_placeholder')}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              marginTop: 'var(--space-sm)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 20, animation: 'spin 1s linear infinite' }}>
                  progress_activity
                </span>
                {t('auth.creating_account')}
              </>
            ) : (
              <>
                <span>{t('auth.register_btn')}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  arrow_forward
                </span>
              </>
            )}
          </button>

          {/* Login Link */}
          <p
            className="text-body-md text-secondary text-center"
            style={{ marginTop: 'var(--space-sm)' }}
          >
            {t('auth.have_account')}{' '}
            <Link href="/login" className="text-label-md text-primary">
              {t('auth.login_link')}
            </Link>
          </p>
        </form>
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
