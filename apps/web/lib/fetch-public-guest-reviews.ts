import type { PublicGuestReviewDto } from '@/lib/public-types';
import { publicApiBaseUrl } from '@/lib/public-api-base';
import { sanitizePublicOrgSlug } from '@/lib/public-org-slug';
import { fetchPublicOrgSite } from '@/lib/fetch-public-site';

export type PublicGuestReviewsListPayload = {
  organization: { slug: string; name: string };
  reviews: PublicGuestReviewDto[];
};

/** Marketing “all reviews” list (wider cap). Falls back to `/site` if the API is older and has no route yet. */
export async function fetchMarketingGuestReviewsListWithFallback(
  orgSlug: string,
): Promise<PublicGuestReviewsListPayload | null> {
  const base = publicApiBaseUrl();
  const slug = sanitizePublicOrgSlug(orgSlug).trim();
  try {
    const res = await fetch(`${base}/public/orgs/${encodeURIComponent(slug)}/guest-reviews`, {
      next: { revalidate: 120 },
    });
    if (res.ok) {
      const raw = (await res.json()) as Partial<PublicGuestReviewsListPayload>;
      if (raw.organization?.slug && Array.isArray(raw.reviews)) {
        return {
          organization: {
            slug: raw.organization.slug,
            name: typeof raw.organization.name === 'string' ? raw.organization.name : slug,
          },
          reviews: raw.reviews,
        };
      }
    }
  } catch {
    /* fall through */
  }

  const site = await fetchPublicOrgSite(slug);
  if (!site?.organization?.slug) return null;
  return {
    organization: { slug: site.organization.slug, name: site.organization.name },
    reviews: site.reviews ?? [],
  };
}
