import { OrgHomepageKind } from '@prisma/client';
import type {
  GuestReview,
  LandingOffer,
  MediaAsset,
  OrgSiteSettings,
  Organization,
  Property,
  RentableUnit,
  RentableUnitListing,
  RentableUnitMatrixRole,
  SiteSection,
} from '@prisma/client';
import { toPublicGuestReviewDto } from './guest-review-dto.js';

export type PublicUnitListingDto = {
  published: boolean;
  sortOrder: number;
  matrixRole: RentableUnitMatrixRole;
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

export type PublicRentableUnitDto = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  listing: PublicUnitListingDto | null;
};

export type PublicPropertyDto = {
  id: string;
  name: string;
  slug: string;
  units: PublicRentableUnitDto[];
};

export type PublicSitePayloadDto = {
  organization: { slug: string; name: string };
  siteSettings: { homepageKind: OrgHomepageKind };
  properties: PublicPropertyDto[];
  sections: SiteSection[];
  media: MediaAsset[];
  reviews: ReturnType<typeof toPublicGuestReviewDto>[];
  offers: { id: string; label: string }[];
};

function jsonStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

export function listingToDto(row: RentableUnitListing): PublicUnitListingDto {
  return {
    published: row.published,
    sortOrder: row.sortOrder,
    matrixRole: row.matrixRole,
    cardTitle: row.cardTitle,
    cardShort: row.cardShort,
    bestFor: jsonStringArray(row.bestFor),
    descriptionMarkdown: row.descriptionMarkdown,
    highlights: jsonStringArray(row.highlights),
    amenities: jsonStringArray(row.amenities),
    ctaLabel: row.ctaLabel,
    pricing: {
      weekday: row.weekdayPriceMinor,
      friday: row.fridayPriceMinor,
      saturday: row.saturdayPriceMinor,
      sunday: row.sundayPriceMinor,
      longWeekend: row.longWeekendPriceMinor,
    },
    guestsHint: row.guestsHint,
    bedroomsHint: row.bedroomsHint,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    detailHeroUrl: row.detailHeroUrl,
  };
}

function mapUnit(u: RentableUnit & { listingProfile: RentableUnitListing | null }): PublicRentableUnitDto {
  return {
    id: u.id,
    name: u.name,
    slug: u.slug,
    kind: u.kind,
    listing: u.listingProfile?.published ? listingToDto(u.listingProfile) : null,
  };
}

/** Full public marketing payload (inventory + CMS + reviews + ticker offers). */
export function buildPublicSitePayload(args: {
  organization: Organization;
  siteSettings: OrgSiteSettings | null;
  properties: (Property & { units: (RentableUnit & { listingProfile: RentableUnitListing | null })[] })[];
  sections: SiteSection[];
  media: MediaAsset[];
  guestReviews: GuestReview[];
  tickerOffers: Pick<LandingOffer, 'id' | 'label'>[];
}): PublicSitePayloadDto {
  const homepageKind: OrgHomepageKind = args.siteSettings?.homepageKind ?? OrgHomepageKind.LISTING_GRID;
  return {
    organization: { slug: args.organization.slug, name: args.organization.name },
    siteSettings: { homepageKind },
    properties: args.properties.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      units: p.units.map(mapUnit),
    })),
    sections: args.sections,
    media: args.media,
    reviews: args.guestReviews.map(toPublicGuestReviewDto),
    offers: args.tickerOffers.map((o) => ({ id: o.id, label: o.label })),
  };
}
