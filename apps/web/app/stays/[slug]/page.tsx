import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StayDetailView } from '@/components/landing/stay-detail-view';
import type { ListingCard } from '@/lib/landing-content';
import { listingUrlPath } from '@/lib/landing-content';
import { loadLandingPayload } from '@/lib/landing-data';

type Props = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';

function findListing(slug: string, listings: readonly ListingCard[]) {
  return listings.find((l) => listingUrlPath(l) === slug || l.id === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { merged } = await loadLandingPayload();
  const listing = findListing(slug, merged.texts.listings);
  if (!listing) return {};

  const title = listing.seoTitle?.trim() || `${listing.title} | ${merged.texts.seoTitle.split('|')[0]?.trim() ?? 'Stay'}`;
  const description = listing.seoDescription?.trim() || listing.short;

  return { title, description };
}

export default async function StayPage({ params }: Props) {
  const { slug } = await params;
  const { merged } = await loadLandingPayload();
  if (!findListing(slug, merged.texts.listings)) notFound();
  return <StayDetailView slug={slug} />;
}
