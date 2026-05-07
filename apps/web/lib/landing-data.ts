import { fetchPublicOrgSite } from './fetch-public-site';
import { fetchPublicOrgContent } from './fetch-public';
import type { LandingMergePayload } from './landing-content';
import { mergeLandingContent } from './landing-content';

export async function loadLandingPayload() {
  const orgSlug = process.env.NEXT_PUBLIC_ORG_SLUG ?? 'mavu-days';
  let mergePayload: LandingMergePayload = await fetchPublicOrgSite(orgSlug);
  if (!mergePayload) {
    mergePayload = await fetchPublicOrgContent(orgSlug);
  }
  const merged = mergeLandingContent(mergePayload);
  const orgName = mergePayload?.organization?.name ?? 'Mavu Days';
  const landingReviews = (mergePayload?.reviews ?? []).slice(0, 8);
  const landingOffers = mergePayload?.offers ?? [];
  return { orgSlug, merged, payload: mergePayload, orgName, landingReviews, landingOffers };
}
