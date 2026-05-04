import type { GuestReview, ReviewPlatform } from '@prisma/client';

export function reviewPlatformLabel(platform: ReviewPlatform): string {
  switch (platform) {
    case 'AIRBNB':
      return 'Airbnb';
    case 'GOOGLE':
      return 'Google';
    case 'BOOKING_COM':
      return 'Booking.com';
    case 'DIRECT':
      return 'Direct guest';
    default:
      return 'Guest';
  }
}

/** Sanitized fields for the public marketing site. */
export function toPublicGuestReviewDto(r: GuestReview) {
  return {
    id: r.id,
    platform: r.platform,
    platformLabel: reviewPlatformLabel(r.platform),
    rating: r.rating,
    ratingMax: r.ratingMax,
    guestDisplayName: r.guestDisplayName,
    title: r.title,
    body: r.body,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
  };
}
