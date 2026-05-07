export type SiteSectionDto = {
  id: string;
  key: string;
  title: string;
  bodyMarkdown: string;
  sortOrder: number;
};

export type MediaAssetDto = {
  id: string;
  key: string;
  publicUrl: string;
  alt?: string | null;
};

export type PublicGuestReviewDto = {
  id: string;
  platform: string;
  platformLabel: string;
  rating: number;
  ratingMax: number;
  guestDisplayName: string | null;
  title: string | null;
  body: string;
  reviewedAt: string | null;
};

/** Published landing ticker lines */
export type PublicLandingOfferDto = {
  id: string;
  label: string;
};

export type PublicContentPayload = {
  organization: { slug: string; name: string };
  sections: SiteSectionDto[];
  media: MediaAssetDto[];
  reviews: PublicGuestReviewDto[];
  offers: PublicLandingOfferDto[];
};

/** Published marketing fields for one rentable unit (when published on the public site). */
export type PublicUnitListingPayload = {
  published: boolean;
  sortOrder: number;
  matrixRole: string;
  cardTitle: string;
  cardShort: string;
  bestFor: string[];
  descriptionMarkdown: string;
  highlights: string[];
  amenities: string[];
  ctaLabel: string | null;
  pricing: {
    weekday: number | null;
    friday: number | null;
    saturday: number | null;
    sunday: number | null;
    longWeekend: number | null;
  };
  guestsHint: number | null;
  bedroomsHint: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  detailHeroUrl: string | null;
};

export type PublicSitePayload = PublicContentPayload & {
  siteSettings: { homepageKind: 'LISTING_GRID' | 'MATRIX_THREE_SKU' };
  properties: Array<{
    id: string;
    name: string;
    slug: string;
    units: Array<{
      id: string;
      name: string;
      slug: string;
      kind: string;
      listing: PublicUnitListingPayload | null;
    }>;
  }>;
};
