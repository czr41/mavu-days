import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StayDetailView } from '@/components/landing/stay-detail-view';
import { DEFAULT_LANDING } from '@/lib/landing-content';

type Props = { params: Promise<{ slug: string }> };

const VALID_SLUGS = DEFAULT_LANDING.listings.map((l) => l.id);

export async function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = DEFAULT_LANDING.listings.find((l) => l.id === slug);
  if (!listing) return {};

  const titles: Record<string, string> = {
    'full-farm': 'Full Farm Stay | Mavu Days — Private Mango Farm Near Bangalore',
    '1bhk': '1BHK Villa Stay | Mavu Days — Private Mango Farm Near Bangalore',
    '2bhk': '2BHK Villa Stay | Mavu Days — Private Mango Farm Near Bangalore',
  };

  const descriptions: Record<string, string> = {
    'full-farm': 'Book the entire Mavu Days mango farm near Bangalore. Exclusive use of both villas, open lawns, pool, and all spaces for up to 12 guests.',
    '1bhk': 'A cosy 1BHK private villa tucked into the mango grove at Mavu Days, near Bangalore. Perfect for couples and small families.',
    '2bhk': 'Spacious 2BHK private villa at Mavu Days, a mango farm stay near Bangalore. Ideal for families and small groups.',
  };

  return {
    title: titles[slug] ?? `${listing.title} | Mavu Days`,
    description: descriptions[slug] ?? listing.short,
  };
}

export default async function StayPage({ params }: Props) {
  const { slug } = await params;
  if (!VALID_SLUGS.includes(slug)) notFound();
  return <StayDetailView slug={slug} />;
}
