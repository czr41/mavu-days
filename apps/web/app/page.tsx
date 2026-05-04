import type { Metadata } from 'next';

import { LandingView } from '@/components/landing/landing-view';

const title = 'Mavu Days | Private Mango Farm Stay Near Bangalore';
const description =
  'Escape to Mavu Days, a peaceful 2-acre mango farm stay near Bangalore with private villa stays, open green spaces, quiet nights, and flexible booking options for couples, families, and groups.';
const keywords = [
  'farm stay near Bangalore',
  'private farm stay near Bangalore',
  'weekend getaway near Bangalore',
  'mango farm stay near Bangalore',
  'private villa near Bangalore',
  'farmhouse near Bangalore',
  'family farm stay near Bangalore',
  'peaceful getaway near Bangalore',
  'villa stay near Bangalore',
  'nature stay near Bangalore',
];

export const metadata: Metadata = {
  title,
  description,
  keywords,
  openGraph: {
    title,
    description:
      'Book a peaceful 1BHK villa, 2BHK villa, or the full farm at Mavu Days — a private mango farm stay near Bangalore for slow weekends and quiet escapes.',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mavu Days — Private Farm Stay Near Bangalore',
    description,
  },
};

export default function HomePage() {
  return <LandingView path="/" />;
}
