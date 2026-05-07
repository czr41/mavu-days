import type { PublicSitePayload } from './public-types';

/** Marketing site payload: CMS + inventory + homepage layout kind. */
export async function fetchPublicOrgSite(orgSlug: string): Promise<PublicSitePayload | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${base}/public/orgs/${encodeURIComponent(orgSlug)}/site`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as Partial<PublicSitePayload>;
    if (!raw.organization?.slug) return null;
    return {
      organization: raw.organization,
      siteSettings: raw.siteSettings ?? { homepageKind: 'LISTING_GRID' },
      properties: raw.properties ?? [],
      sections: raw.sections ?? [],
      media: raw.media ?? [],
      reviews: raw.reviews ?? [],
      offers: raw.offers ?? [],
    };
  } catch {
    return null;
  }
}
