'use client';

import { LanguageProvider } from '@/lib/lang/LanguageContext';

/**
 * ClientProviders
 *
 * Wraps root client context providers (e.g. LanguageProvider)
 * to keep root app/layout.js clean as a Server Component.
 */
export default function ClientProviders({ children }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
