import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';

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

const site =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.NEXT_PUBLIC_VERCEL_URL?.trim()
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, '')}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(site.endsWith('/') ? site.slice(0, -1) : site),
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className={sans.className}>{children}</body>
    </html>
  );
}
