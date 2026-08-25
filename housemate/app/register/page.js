'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getLocalStore, saveLocalStore } from '@/lib/store';

/**
 * Register Page
 *
 * Matches Stitch design: register_housemate/screen.png
 *
 * - Clean centered card layout on light background
 * - HouseMate icon + "Join HouseMate" header
 * - Full Name, Email, Password, Confirm Password inputs
 * - Primary Register button with forward arrow icon
 * - Link to Login
 * - Validations & friendly error messages
 */
export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

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
      setError('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isPlaceholder) {
        // Instant Demo Registration Fallback
        const newDemoUser = {
          id: `usr-${Date.now()}`,
          full_name: fullName.trim(),
          email: email.trim(),
          role: 'admin',
          avatar: fullName.trim()[0].toUpperCase(),
        };

        const storeData = getLocalStore();
        const updatedMembers = [...storeData.members, newDemoUser];
        const nextStore = { ...storeData, members: updatedMembers, currentUser: newDemoUser };
        saveLocalStore(nextStore);

        router.push('/onboarding');
        return;
      }

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
          setError('This email is already registered. Please log in.');
        } else {
          setError(authError.message || 'Registration failed. Please try again.');
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
      console.warn('Supabase offline or unreachable, falling back to local session:', err);
      // Fallback to local session on fetch failure
      const newDemoUser = {
        id: `usr-${Date.now()}`,
        full_name: fullName.trim(),
        email: email.trim(),
        role: 'admin',
        avatar: fullName.trim()[0].toUpperCase(),
      };

      const storeData = getLocalStore();
      const updatedMembers = [...storeData.members, newDemoUser];
      const nextStore = { ...storeData, members: updatedMembers, currentUser: newDemoUser };
      saveLocalStore(nextStore);

      router.push('/onboarding');
    }
  }

  return (
    <div className="auth-page">
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
              Join HouseMate
            </h1>
            <p className="text-body-md text-secondary">
              Financial harmony for shared living.
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
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder="e.g. Devid Miller"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Email */}
          <div className="auth-form-group">
            <label htmlFor="email" className="input-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Password */}
          <div className="auth-form-group">
            <label htmlFor="password" className="input-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Confirm Password */}
          <div className="auth-form-group">
            <label htmlFor="confirm-password" className="input-label">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Re-enter your password"
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
                Creating account...
              </>
            ) : (
              <>
                <span>Register</span>
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
            Already have an account?{' '}
            <Link href="/login" className="text-label-md text-primary">
              Login
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
