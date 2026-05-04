import type { PublicContentPayload } from './public-types';

export async function fetchPublicOrgContent(orgSlug: string): Promise<PublicContentPayload | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${base}/public/orgs/${encodeURIComponent(orgSlug)}/content`, {
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
    };
  } catch {
    return null;
  }
}
