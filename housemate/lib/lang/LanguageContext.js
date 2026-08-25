'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from '@/locales/en.json';
import km from '@/locales/km.json';

/**
 * HouseMate Language Context
 *
 * Provides:
 *   - lang: 'en' | 'km'  — current active language
 *   - setLang(lang)       — switch language (persisted to localStorage)
 *   - t(key, vars)        — translate a dot-notation key with optional variable interpolation
 *
 * Example:
 *   t('common.save')               → 'Save' / 'រក្សាទុក'
 *   t('dashboard.member_count', { count: 3 }) → '(3 members)' / '(3 នាក់)'
 *
 * Hydration safety: defaults to 'en' on server/hydration,
 * then reads localStorage in useEffect after mount.
 */

const STORAGE_KEY = 'housemate_language';
const SUPPORTED = ['en', 'km'];

const dictionaries = { en, km };

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

/**
 * Resolve a dot-notation key from a nested object.
 * Returns undefined if the path doesn't exist.
 */
function resolvePath(obj, path) {
  return path.split('.').reduce((acc, part) => {
    if (acc == null) return undefined;
    return acc[part];
  }, obj);
}

/**
 * Interpolate {variable} placeholders in a string.
 * Example: interpolate("Hello {name}!", { name: "Sok" }) → "Hello Sok!"
 */
function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => {
    return vars[key] !== undefined ? vars[key] : `{${key}}`;
  });
}

export function LanguageProvider({ children }) {
  // Default 'en' for SSR — hydrated from localStorage after mount
  const [lang, setLangState] = useState('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) {
      setLangState(stored);
    }
    setMounted(true);
  }, []);

  const setLang = useCallback((newLang) => {
    if (!SUPPORTED.includes(newLang)) return;
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    // Update <html lang="..."> attribute dynamically
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLang === 'km' ? 'km' : 'en';
    }
  }, []);

  const t = useCallback((key, vars) => {
    const dict = dictionaries[lang] ?? dictionaries.en;
    const value = resolvePath(dict, key);

    if (value === undefined) {
      // Fallback to English
      const fallback = resolvePath(dictionaries.en, key);
      if (fallback === undefined) {
        // Key not found anywhere — return the key itself for debugging
        return key;
      }
      return interpolate(fallback, vars);
    }

    return interpolate(value, vars);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export default LanguageContext;
