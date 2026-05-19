import type { PublicGuestReviewDto } from '@/lib/public-types';

/** ~4★ or better when normalised onto a five-point scale. */
export function isPositiveGuestReview(r: Pick<PublicGuestReviewDto, 'rating' | 'ratingMax'>): boolean {
  const max = r.ratingMax > 0 ? r.ratingMax : 5;
  const onFive = (r.rating / max) * 5;
  return onFive >= 4 - 1e-9;
}

export const LANDING_POSITIVE_REVIEWS_CAP = 96;
/** Keep in sync with `PUBLIC_LANDING_REVIEWS_LIMIT` in `apps/api/src/lib/landing-review-limits.ts`. */
