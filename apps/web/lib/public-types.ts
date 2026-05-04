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

export type PublicContentPayload = {
  organization: { slug: string; name: string };
  sections: SiteSectionDto[];
  media: MediaAssetDto[];
  reviews: PublicGuestReviewDto[];
};
