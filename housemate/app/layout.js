import '../styles/globals.css';
import ClientProviders from '@/components/ClientProviders';

export const metadata = {
  title: {
    default: 'HouseMate — Shared Living Harmony',
    template: '%s | HouseMate',
  },
  description: 'Manage shared house expenses with your roommates. Know what you owe, when you owe it, and understand where your money goes.',
  keywords: ['housemate', 'shared expenses', 'roommates', 'bill splitting', 'house management'],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#004ac6',
};

/**
 * Root Layout
 *
 * This is the outermost layout that wraps all pages.
 * It provides:
 * - Global CSS (design system)
 * - HTML meta tags
 * - Font preloading
 * - ClientProviders (LanguageProvider)
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Material Symbols & Noto Serif Khmer icon/font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Noto+Serif+Khmer:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}

