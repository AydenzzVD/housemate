'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, updateProfile, signOut } from '@/lib/auth';
import { getUserHouse, getHouseMembers } from '@/lib/houses';
import { useLanguage } from '@/lib/lang/useLanguage';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Settings & Profile Page — live multi-user data
 * Matches Stitch design: profile_housemate/screen.png
 */
export default function SettingsPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();

  const [profile, setProfile] = useState(null);
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [fullNameInput, setFullNameInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function loadData() {
      const [pData, hData] = await Promise.all([
        getProfile(),
        getUserHouse(),
      ]);

      setProfile(pData);
      setHouse(hData);

      if (pData) {
        setFullNameInput(pData.full_name || '');
      }

      if (hData) {
        const mData = await getHouseMembers(hData.id);
        setMembers(mData);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)', maxWidth: 720, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 40, width: 250, marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  function handleCopyCode() {
    if (house?.join_code) {
      navigator.clipboard.writeText(house.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  async function handleUpdateName(e) {
    e.preventDefault();
    if (!fullNameInput.trim()) return;

    setSaving(true);
    const { error } = await updateProfile(fullNameInput);

    if (error) {
      setToast(`❌ ${error}`);
    } else {
      setIsEditingName(false);
      setToast(t('settings.toast_name_updated'));
      const updated = await getProfile();
      setProfile(updated);
    }
    setSaving(false);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleLogout() {
    // Clear cookie first
    await fetch('/api/house/set-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    });

    await signOut();
    router.push('/login');
    router.refresh();
  }

  const initial = (profile?.full_name || 'U')[0].toUpperCase();

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: 720, margin: '0 auto' }}>
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div>
        <h1 className="text-headline-lg text-on-surface" style={{ marginBottom: 4 }}>
          {t('settings.title')}
        </h1>
        <p className="text-body-md text-secondary">
          {t('settings.subtitle')}
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
              fontWeight: 700,
            }}
          >
            {initial}
          </div>

          <div style={{ flex: 1 }}>
            {isEditingName ? (
              <form onSubmit={handleUpdateName} style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                <input
                  type="text"
                  required
                  value={fullNameInput}
                  onChange={e => setFullNameInput(e.target.value)}
                  className="input-field"
                  style={{ maxWidth: 240 }}
                  autoFocus
                />
                <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '8px 16px' }}>
                  {t('settings.save_name')}
                </button>
                <button type="button" onClick={() => setIsEditingName(false)} className="btn-secondary" style={{ padding: '8px 16px' }}>
                  {t('settings.cancel_name')}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <h2 className="text-headline-md text-on-surface">{profile?.full_name || 'User'}</h2>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="btn-ghost"
                  style={{ padding: 4 }}
                  title={t('settings.edit_name_title')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                </button>
                <span className={`badge ${house?.myRole === 'admin' ? 'badge-admin' : 'badge-member'}`}>
                  {house?.myRole === 'admin' ? t('roles.house_admin') : t('roles.member')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Language Preference Card */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 4 }}>
              {t('settings.language_title')}
            </h2>
            <p className="text-body-md text-secondary">
              {t('settings.language_subtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`btn-${lang === 'en' ? 'primary' : 'secondary'}`}
              style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>🇬🇧</span>
              <span>{t('settings.language_en')}</span>
            </button>
            <button
              type="button"
              onClick={() => setLang('km')}
              className={`btn-${lang === 'km' ? 'primary' : 'secondary'}`}
              style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Noto Serif Khmer', sans-serif" }}
            >
              <span>🇰🇭</span>
              <span>{t('settings.language_km')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* House Information Card */}
      {house && (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-md)' }}>
            {t('settings.household_info')}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-surface-container)' }}>
              <span className="text-body-md text-secondary">{t('settings.house_name_label')}</span>
              <span className="text-body-md font-semibold text-on-surface">{house.name}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-surface-container)' }}>
              <span className="text-body-md text-secondary">{t('settings.currency_label')}</span>
              <span className="text-body-md font-semibold text-on-surface">{house.currency}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-surface-container)' }}>
              <span className="text-body-md text-secondary">{t('settings.active_members')}</span>
              <span className="text-body-md font-semibold text-on-surface">{members.length === 1 ? t('settings.member_count_one', { count: members.length }) : t('settings.member_count_other', { count: members.length })}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span className="text-body-md text-secondary">{t('settings.join_code_label')}</span>
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
                  {copied ? t('settings.copied') : t('settings.copy')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Management Card */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <h2 className="text-headline-md text-on-surface" style={{ marginBottom: 'var(--space-xs)' }}>
          {t('settings.session_title')}
        </h2>
        <p className="text-body-md text-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
          {t('settings.session_desc')}
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
          {t('settings.sign_out')}
        </button>
      </div>
    </div>
  );
}
