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

import { normalizePublicImageUrl } from './marketing-image-url.js';
import { toPublicGuestReviewDto } from './guest-review-dto.js';

/** Media rows loaded with CMS → listing links so shared photos merge into `/stays/[slug]` galleries. */
export type MediaAssetWithListingLinks = MediaAsset & {
  linkedUnits: { rentableUnitId: string }[];
};

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
  extraGuestPriceMinor: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  detailHeroUrl: string | null;
  airbnbProfileLabel: string | null;
  airbnbListingUrl: string | null;
  galleryImageUrls: string[];
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
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
  }
  if (typeof v === 'string' && v.trim()) {
    try {
      const p = JSON.parse(v) as unknown;
      if (Array.isArray(p)) {
        return p.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function listingToDto(row: RentableUnitListing): PublicUnitListingDto {
  const galleries = jsonStringArray(row.galleryImageUrls)
    .map((u) => normalizePublicImageUrl(u))
    .filter((u): u is string => Boolean(u));
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
    extraGuestPriceMinor: row.extraGuestPriceMinor,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    detailHeroUrl: normalizePublicImageUrl(row.detailHeroUrl),
    airbnbProfileLabel: row.airbnbProfileLabel,
    airbnbListingUrl: row.airbnbListingUrl,
    galleryImageUrls: galleries,
  };
}

/** Append URLs from CMS media linked to this unit (manual gallery lines stay first). */
export function listingToDtoWithLinkedMedia(row: RentableUnitListing, linkedUrls?: readonly string[]): PublicUnitListingDto {
  const base = listingToDto(row);
  if (!linkedUrls?.length) return base;
  const seen = new Set(base.galleryImageUrls);
  const merged = [...base.galleryImageUrls];
  for (const u of linkedUrls) {
    if (seen.has(u)) continue;
    seen.add(u);
    merged.push(u);
  }
  return { ...base, galleryImageUrls: merged };
}

function listingUrlsFromLinkedMedia(media: readonly MediaAssetWithListingLinks[]): Map<string, string[]> {
  const byUnit = new Map<string, string[]>();
  for (const ma of media) {
    const url = normalizePublicImageUrl(ma.publicUrl) ?? '';
    if (!url) continue;
    for (const lk of ma.linkedUnits) {
      const prev = byUnit.get(lk.rentableUnitId) ?? [];
      if (!prev.includes(url)) prev.push(url);
      byUnit.set(lk.rentableUnitId, prev);
    }
  }
  return byUnit;
}

function mapUnit(
  u: RentableUnit & { listingProfile: RentableUnitListing | null },
  linkedGalleryUrls?: readonly string[],
): PublicRentableUnitDto {
  return {
    id: u.id,
    name: u.name,
    slug: u.slug,
    kind: u.kind,
    /** Include draft listings so the homepage gallery can show stay photos before go-live. Stay cards still filter `published` in the web app. */
    listing: u.listingProfile ? listingToDtoWithLinkedMedia(u.listingProfile, linkedGalleryUrls) : null,
  };
}

/** Full public marketing payload (inventory + CMS + reviews + ticker offers). */
export function buildPublicSitePayload(args: {
  organization: Organization;
  siteSettings: OrgSiteSettings | null;
  properties: (Property & { units: (RentableUnit & { listingProfile: RentableUnitListing | null })[] })[];
  sections: SiteSection[];
  media: MediaAssetWithListingLinks[];
  guestReviews: GuestReview[];
  tickerOffers: Pick<LandingOffer, 'id' | 'label'>[];
}): PublicSitePayloadDto {
  const homepageKind: OrgHomepageKind = args.siteSettings?.homepageKind ?? OrgHomepageKind.LISTING_GRID;
  const galleryExtrasByUnitId = listingUrlsFromLinkedMedia(args.media);

  return {
    organization: { slug: args.organization.slug, name: args.organization.name },
    siteSettings: { homepageKind },
    properties: args.properties.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      units: p.units.map((u) => mapUnit(u, galleryExtrasByUnitId.get(u.id))),
    })),
    sections: args.sections,
    media: args.media.map(({ linkedUnits: _links, ...row }) => ({
      ...row,
      publicUrl: normalizePublicImageUrl(row.publicUrl) ?? row.publicUrl,
    })),
    reviews: args.guestReviews.map(toPublicGuestReviewDto),
    offers: args.tickerOffers.map((o) => ({ id: o.id, label: o.label })),
  };
}
