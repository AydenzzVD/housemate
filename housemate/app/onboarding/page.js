'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/lang/useLanguage';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Onboarding / Choice Screen
 *
 * Matches Stitch design: get_started_housemate/screen.png
 */
export default function OnboardingPage() {
  const { t } = useLanguage();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-background)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
        position: 'relative',
      }}
    >
      {/* Top right language switcher */}
      <div style={{ position: 'absolute', top: 'var(--space-md)', right: 'var(--space-md)', zIndex: 10 }}>
        <LanguageSwitcher />
      </div>

      <main
        style={{
          width: '100%',
          maxWidth: 800,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-xl)',
        }}
        className="fade-in"
      >
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: 600 }}>
          <h1
            className="text-headline-lg-mobile text-primary"
            style={{ fontSize: 30, marginBottom: 'var(--space-xs)' }}
          >
            {t('onboarding.welcome_title')}
          </h1>
          <p className="text-body-lg text-secondary">
            {t('onboarding.welcome_subtitle')}
          </p>
        </div>

        {/* Choice Bento Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-lg)',
            width: '100%',
          }}
        >
          {/* Card 1: Create House */}
          <Link
            href="/onboarding/create"
            className="card-interactive"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              padding: 'var(--space-xl)',
            }}
          >
            <div className="glow-primary" />
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-primary-container)',
                color: 'var(--color-on-primary-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-lg)',
              }}
            >
              <span
                className="material-symbols-outlined filled"
                style={{ fontSize: 32 }}
              >
                add_home
              </span>
            </div>

            <h2
              className="text-headline-md text-on-surface"
              style={{ marginBottom: 'var(--space-xs)' }}
            >
              {t('onboarding.create_card_title')}
            </h2>

            <p
              className="text-body-md text-secondary"
              style={{ marginBottom: 'var(--space-xl)', flexGrow: 1 }}
            >
              {t('onboarding.create_card_desc')}
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                color: 'var(--color-primary)',
                fontWeight: 600,
                fontSize: 'var(--text-label-md-size)',
              }}
            >
              <span>{t('onboarding.create_card_cta')}</span>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                arrow_forward
              </span>
            </div>
          </Link>

          {/* Card 2: Join House */}
          <Link
            href="/onboarding/join"
            className="card-interactive"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              padding: 'var(--space-xl)',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-secondary-container)',
                color: 'var(--color-on-secondary-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-lg)',
              }}
            >
              <span
                className="material-symbols-outlined filled"
                style={{ fontSize: 32 }}
              >
                login
              </span>
            </div>

            <h2
              className="text-headline-md text-on-surface"
              style={{ marginBottom: 'var(--space-xs)' }}
            >
              {t('onboarding.join_card_title')}
            </h2>

            <p
              className="text-body-md text-secondary"
              style={{ marginBottom: 'var(--space-xl)', flexGrow: 1 }}
            >
              {t('onboarding.join_card_desc')}
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                color: 'var(--color-secondary)',
                fontWeight: 600,
                fontSize: 'var(--text-label-md-size)',
              }}
            >
              <span>{t('onboarding.join_card_cta')}</span>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                arrow_forward
              </span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
