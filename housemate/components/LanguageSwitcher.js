'use client';

import { useLanguage } from '@/lib/lang/useLanguage';

/**
 * LanguageSwitcher Component
 *
 * Compact EN | ខ្មែរ toggle switch pill.
 * Fits in TopBar (mobile), Sidebar (desktop), Auth forms, and Settings page.
 *
 * Props:
 *   - variant: 'pill' | 'select' | 'buttons' (default: 'pill')
 */
export default function LanguageSwitcher({ variant = 'pill' }) {
  const { lang, setLang } = useLanguage();

  if (variant === 'select') {
    return (
      <div className="select-wrapper" style={{ minWidth: 120 }}>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="select-field"
          style={{ padding: '6px 12px', fontSize: 14 }}
          aria-label="Language selector"
        >
          <option value="en">English 🇬🇧</option>
          <option value="km">ខ្មែរ 🇰🇭</option>
        </select>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--color-surface-container-high)',
        borderRadius: 'var(--radius-full)',
        padding: '2px',
        border: '1px solid var(--color-surface-container)',
        fontSize: '12px',
        fontWeight: 600,
        userSelect: 'none',
      }}
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        style={{
          border: 'none',
          background: lang === 'en' ? 'var(--color-primary)' : 'transparent',
          color: lang === 'en' ? 'var(--color-on-primary)' : 'var(--color-secondary)',
          borderRadius: 'var(--radius-full)',
          padding: '4px 10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '12px',
          fontWeight: lang === 'en' ? 700 : 500,
        }}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('km')}
        style={{
          border: 'none',
          background: lang === 'km' ? 'var(--color-primary)' : 'transparent',
          color: lang === 'km' ? 'var(--color-on-primary)' : 'var(--color-secondary)',
          borderRadius: 'var(--radius-full)',
          padding: '4px 10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '12px',
          fontWeight: lang === 'km' ? 700 : 500,
          fontFamily: "'Noto Serif Khmer', sans-serif",
        }}
      >
        ខ្មែរ
      </button>
    </div>
  );
}
