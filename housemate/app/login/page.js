'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * Login Page
 *
 * Matches Stitch design: login_housemate/screen.png
 *
 * - Centered card layout on light background
 * - HouseMate icon + "Welcome back" header
 * - Email + password inputs with Material Symbol icons
 * - "Remember me" checkbox + "Forgot password?" link
 * - Login button (primary, full width)
 * - Link to Register
 * - Friendly error messages
 */
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password. Please try again.');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Please confirm your email address before logging in.');
        } else {
          setError(authError.message || 'Something went wrong. Please try again.');
        }
        setLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect. Please check your internet connection and try again.');
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-card fade-in" style={{ maxWidth: 448 }}>
        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon">
            <span className="material-symbols-outlined filled" style={{ fontSize: 32 }}>
              home_work
            </span>
          </div>
          <div>
            <h1
              className="text-headline-lg-mobile text-on-surface"
              style={{ marginBottom: 4 }}
            >
              Welcome back
            </h1>
            <p className="text-body-md text-secondary">
              Log in to manage your shared expenses and harmony.
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-message" style={{ marginBottom: 'var(--space-md)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form className="auth-form" onSubmit={handleLogin}>
          {/* Email */}
          <div className="auth-form-group">
            <label htmlFor="email" className="input-label">
              Email address
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
                mail
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 'calc(var(--space-sm) + 20px + var(--space-xs))' }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-form-group">
            <label htmlFor="password" className="input-label">
              Password
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
                lock
              </span>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 'calc(var(--space-sm) + 20px + var(--space-xs))' }}
              />
            </div>
          </div>

          {/* Remember me + Forgot password */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'var(--space-xs)',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                id="remember-me"
                style={{
                  width: 16,
                  height: 16,
                  accentColor: 'var(--color-primary)',
                }}
              />
              <span className="text-label-md text-secondary">Remember me</span>
            </label>
            <a
              href="#"
              className="text-label-md text-primary transition-colors"
              style={{ textDecoration: 'none' }}
              onMouseOver={e => (e.target.style.opacity = 0.75)}
              onMouseOut={e => (e.target.style.opacity = 1)}
            >
              Forgot password?
            </a>
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
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>

          {/* Register link */}
          <p
            className="text-body-md text-secondary text-center"
            style={{ marginTop: 'var(--space-sm)' }}
          >
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-label-md text-primary">
              Register
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
