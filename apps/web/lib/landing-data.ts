import { fetchPublicOrgSite } from './fetch-public-site';
import { fetchPublicOrgContent } from './fetch-public';
import type { LandingMergePayload } from './landing-content';
import { mergeLandingContent } from './landing-content';
import { sanitizePublicOrgSlug } from './public-org-slug';
import { LANDING_POSITIVE_REVIEWS_CAP, isPositiveGuestReview } from './guest-review-filters';

export async function loadLandingPayload() {
  const envSlug = sanitizePublicOrgSlug(process.env.NEXT_PUBLIC_ORG_SLUG ?? 'mavu-days').toLowerCase();
  let mergePayload: LandingMergePayload = await fetchPublicOrgSite(envSlug);
  if (!mergePayload) {
    mergePayload = await fetchPublicOrgContent(envSlug);
  }
  const merged = mergeLandingContent(mergePayload);
  /** @see OrgSiteSettings.externalReviewsFirstSyncAt — after first CMS external review sync, hide seeded carousel quotes */
  const reviewQuoteFallbackSuppressed = Boolean(
    mergePayload &&
      'siteSettings' in mergePayload &&
      mergePayload.siteSettings?.externalReviewsFirstSyncAt,
  );
  /** Prefer slug returned by API so client availability matches DB even if env has stray whitespace or casing drift. */
  const orgSlug = mergePayload?.organization?.slug
    ? sanitizePublicOrgSlug(mergePayload.organization.slug)
    : envSlug;
  const orgName = mergePayload?.organization?.name ?? 'Mavu Days';
  const landingReviews = (mergePayload?.reviews ?? [])
    .filter(isPositiveGuestReview)
    .slice(0, LANDING_POSITIVE_REVIEWS_CAP);
  const landingOffers = mergePayload?.offers ?? [];
  return { orgSlug, merged, payload: mergePayload, orgName, landingReviews, landingOffers, reviewQuoteFallbackSuppressed };
}
