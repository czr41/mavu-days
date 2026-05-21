import type { Metadata } from 'next';

import { GuestReviewsFullPage } from '@/components/landing/guest-reviews-full-page';
import { fetchMarketingGuestReviewsListWithFallback } from '@/lib/fetch-public-guest-reviews';
import { fetchPublicOrgSite } from '@/lib/fetch-public-site';
import { isPositiveGuestReview } from '@/lib/guest-review-filters';
import { sanitizePublicOrgSlug } from '@/lib/public-org-slug';

export const metadata: Metadata = {
  title: 'Guest stories | Mavu Days',
  description: 'Guest reviews and moments from stays at Mavu Days — mango farm stay near Bangalore.',
};

export default async function GuestReviewsPage() {
  const envSlug = sanitizePublicOrgSlug(process.env.NEXT_PUBLIC_ORG_SLUG ?? 'mavu-days').toLowerCase();
  const [listPayload, site] = await Promise.all([
    fetchMarketingGuestReviewsListWithFallback(envSlug),
    fetchPublicOrgSite(envSlug),
  ]);

  const orgName = listPayload?.organization.name ?? site?.organization.name ?? 'Mavu Days';
  const raw = listPayload?.reviews ?? site?.reviews ?? [];
  const reviews = raw.filter(isPositiveGuestReview);
  const offers = site?.offers ?? [];

  return <GuestReviewsFullPage orgName={orgName} reviews={reviews} offers={offers} />;
}
