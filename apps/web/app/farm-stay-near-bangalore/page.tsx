import type { Metadata } from 'next';

import { LandingView } from '@/components/landing/landing-view';

const title = 'Farm Stay Near Bangalore | Mavu Days';
const description =
  'Quiet mango farm stay and private villas about 65 km from Bangalore — Mavu Days for weekend getaways and family time.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title,
    description,
    type: 'website',
    locale: 'en_IN',
  },
};

export default function FarmStayNearBangalorePage() {
  return <LandingView path="/farm-stay-near-bangalore" />;
}
