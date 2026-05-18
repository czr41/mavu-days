import { fetchPublicOrgSite } from './fetch-public-site';
import { fetchPublicOrgContent } from './fetch-public';
import type { LandingMergePayload } from './landing-content';
import { mergeLandingContent } from './landing-content';

export async function loadLandingPayload() {
  const envSlug = (process.env.NEXT_PUBLIC_ORG_SLUG ?? 'mavu-days').trim().toLowerCase();
  let mergePayload: LandingMergePayload = await fetchPublicOrgSite(envSlug);
  if (!mergePayload) {
    mergePayload = await fetchPublicOrgContent(envSlug);
  }
  const merged = mergeLandingContent(mergePayload);
  /** Prefer slug returned by API so client availability matches DB even if env has stray whitespace or casing drift. */
  const orgSlug = mergePayload?.organization?.slug?.trim() ?? envSlug;
  const orgName = mergePayload?.organization?.name ?? 'Mavu Days';
  const landingReviews = (mergePayload?.reviews ?? []).slice(0, 8);
  const landingOffers = mergePayload?.offers ?? [];
  return { orgSlug, merged, payload: mergePayload, orgName, landingReviews, landingOffers };
}
