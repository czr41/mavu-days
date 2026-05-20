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

import type { StayGallerySlot } from '@mavu/contracts';
import { stayGallerySlotsFromUnknown } from '@mavu/contracts';

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
  /** Flattened HTTPS URLs — same order as {@link gallerySlots}; kept for backwards consumers. */
  galleryImageUrls: string[];
  /**
   * Per-photo category tag (homepage bento grouping). Matches Prisma `GalleryCategory` tokens or null =
   * keyword inference only.
   */
  gallerySlots: Array<{ url: string; galleryCategory: string | null }>;
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
  siteSettings: {
    homepageKind: OrgHomepageKind;
    externalReviewsFirstSyncAt: string | null;
  };
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

function normalizedStayGallerySlots(row: RentableUnitListing): StayGallerySlot[] {
  const raw = row.galleryImageUrls;
  let slots = stayGallerySlotsFromUnknown(raw, 24);
  slots = slots
    .map((s): StayGallerySlot => {
      const u = normalizePublicImageUrl(s.url);
      return { url: (u ?? s.url).trim(), category: s.category };
    })
    .filter((s): s is StayGallerySlot => s.url.length > 8);
  return slots;
}

export function listingToDto(row: RentableUnitListing): PublicUnitListingDto {
  const slots = normalizedStayGallerySlots(row);
  const galleries = slots.map((s) => s.url).filter(Boolean);
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
    gallerySlots: slots.map((s) => ({ url: s.url, galleryCategory: s.category })),
  };
}

/** Append URLs from CMS media linked to this unit (manual gallery lines stay first). */
export function listingToDtoWithLinkedMedia(row: RentableUnitListing, linkedUrls?: readonly string[]): PublicUnitListingDto {
  const base = listingToDto(row);
  if (!linkedUrls?.length) return base;
  const seen = new Set(base.galleryImageUrls);
  const mergedSlots = [...base.gallerySlots];
  for (const raw of linkedUrls) {
    const u = normalizePublicImageUrl(raw) ?? '';
    if (!u || seen.has(u)) continue;
    seen.add(u);
    mergedSlots.push({ url: u, galleryCategory: null });
  }
  return {
    ...base,
    galleryImageUrls: mergedSlots.map((s) => s.url),
    gallerySlots: mergedSlots,
  };
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
    siteSettings: {
      homepageKind,
      externalReviewsFirstSyncAt: args.siteSettings?.externalReviewsFirstSyncAt
        ? args.siteSettings.externalReviewsFirstSyncAt.toISOString()
        : null,
    },
    properties: args.properties.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      units: p.units.map((u) => mapUnit(u, galleryExtrasByUnitId.get(u.id))),
    })),
    sections: args.sections,
    media: args.media.map(({ linkedUnits: _links, ...row }) => ({
      ...row,
      publicUrl: normalizePublicImageUrl(row.publicUrl) ?? '',
    })),
    reviews: args.guestReviews.map(toPublicGuestReviewDto),
    offers: args.tickerOffers.map((o) => ({ id: o.id, label: o.label })),
  };
}
