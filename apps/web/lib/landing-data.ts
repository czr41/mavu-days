import { fetchPublicOrgContent } from './fetch-public';
import { mergeLandingContent } from './landing-content';

export async function loadLandingPayload() {
  const orgSlug = process.env.NEXT_PUBLIC_ORG_SLUG ?? 'mavu-days';
  const payload = await fetchPublicOrgContent(orgSlug);
  const merged = mergeLandingContent(payload);
  const orgName = payload?.organization?.name ?? 'Mavu Days';
  const landingReviews = (payload?.reviews ?? []).slice(0, 8);
  return { orgSlug, merged, payload, orgName, landingReviews };
}
