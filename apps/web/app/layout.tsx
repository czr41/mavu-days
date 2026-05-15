import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';

import { resolveSiteOrigin } from '@/lib/site-url';
import './globals.css';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600'],
  display: 'swap',
});

const siteOrigin = resolveSiteOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  icons: {
    icon: '/mavu_days_favicon_transparent.svg',
    shortcut: '/mavu_days_favicon_transparent.svg',
    apple: '/mavu_days_favicon_transparent.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className={sans.className}>{children}</body>
    </html>
  );
}
