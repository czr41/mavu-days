import type { PublicContentPayload } from './public-types';

export async function fetchPublicOrgContent(orgSlug: string): Promise<PublicContentPayload | null> {
  const rawBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const base = rawBase.replace(/\/+$/, '');
  const slug = orgSlug.trim();
  try {
    const res = await fetch(`${base}/public/orgs/${encodeURIComponent(slug)}/content`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as Partial<PublicContentPayload> & {
      organization?: PublicContentPayload['organization'];
    };
    if (!raw.organization) return null;
    return {
      organization: raw.organization,
      sections: raw.sections ?? [],
      media: raw.media ?? [],
      reviews: raw.reviews ?? [],
      offers: raw.offers ?? [],
      siteSettings: raw.siteSettings,
      properties: raw.properties,
    };
  } catch {
    return null;
  }
}
