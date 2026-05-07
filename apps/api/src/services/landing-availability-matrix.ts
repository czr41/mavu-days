import type { PrismaClient } from '@prisma/client';
import { RentableUnitMatrixRole } from '@prisma/client';
import { conflictingUnitFootprint, detectAvailabilityConflicts } from './availability.js';

/** Recognized unit slugs for the landing availability matrix (fallback if matrix roles unset). */
export const FULL_FARM_SLUGCandidates = [
  'full-farm',
  'full-farm-stay',
  'fullfarm',
  'mavu-full-farm',
] as const;
export const BH1_SLUGCandidates = [
  '1bhk-villa',
  '1bhk',
  'villa-1bhk',
  'mavu-1bhk-farm',
  'mavu-1bhk',
] as const;
export const BH2_SLUGCandidates = [
  '2bhk-villa',
  '2bhk',
  'villa-2bhk',
  'mavu-2bhk-farm',
  'mavu-2bhk',
] as const;

function firstMatchSlug<T extends readonly string[]>(
  units: { id: string; slug: string }[],
  candidates: T,
): string | null {
  const lowerMap = new Map(units.map((u) => [u.slug.toLowerCase(), u.id]));
  for (const c of candidates) {
    const id = lowerMap.get(c.toLowerCase());
    if (id) return id;
  }
  return null;
}

function legacySlugResolve(units: { id: string; slug: string }[]) {
  return {
    fullFarm: firstMatchSlug(units, FULL_FARM_SLUGCandidates),
    bhk1: firstMatchSlug(units, BH1_SLUGCandidates),
    bhk2: firstMatchSlug(units, BH2_SLUGCandidates),
  };
}

/** Resolve matrix SKU ids: prefer `RentableUnitListing.matrixRole`, then slug aliases. */
export async function resolveLandingUnitIds(prisma: PrismaClient, organizationId: string) {
  const units = await prisma.rentableUnit.findMany({
    where: { property: { organizationId } },
    select: {
      id: true,
      slug: true,
      listingProfile: { select: { matrixRole: true } },
    },
  });

  const byRole = (role: RentableUnitMatrixRole) =>
    units.find((u) => u.listingProfile?.matrixRole === role)?.id ?? null;

  let fullFarm = byRole(RentableUnitMatrixRole.FULL_FARM);
  let bhk1 = byRole(RentableUnitMatrixRole.VILLA_1BHK);
  let bhk2 = byRole(RentableUnitMatrixRole.VILLA_2BHK);

  const slugOnly = units.map((u) => ({ id: u.id, slug: u.slug }));
  if (!fullFarm || !bhk1 || !bhk2) {
    const leg = legacySlugResolve(slugOnly);
    fullFarm = fullFarm ?? leg.fullFarm;
    bhk1 = bhk1 ?? leg.bhk1;
    bhk2 = bhk2 ?? leg.bhk2;
  }

  return {
    configured: !!(fullFarm && bhk1 && bhk2),
    fullFarm,
    bhk1,
    bhk2,
  };
}

async function rawOverlap(
  prisma: PrismaClient,
  organizationId: string,
  unitId: string,
  checkInUtc: Date,
  checkOutUtc: Date,
): Promise<boolean> {
  const { hasConflict } = await detectAvailabilityConflicts(prisma, {
    organizationId,
    footprintUnitIds: [unitId],
    checkInUtc,
    checkOutUtc,
  });
  return hasConflict;
}

/**
 * Mavu-style mutual-exclusion matrix (booking rows are per SKU only):
 * — Full Farm free only if FF + both villas free for the interval.
 * — Each villa free only if that villa + FF are free for the interval.
 */
export async function computeLandingAvailabilityMatrix(
  prisma: PrismaClient,
  organizationId: string,
  ids: { fullFarm: string; bhk1: string; bhk2: string },
  range: { checkInUtc: Date; checkOutUtc: Date },
) {
  const [ffBusy, v1Busy, v2Busy] = await Promise.all([
    rawOverlap(prisma, organizationId, ids.fullFarm, range.checkInUtc, range.checkOutUtc),
    rawOverlap(prisma, organizationId, ids.bhk1, range.checkInUtc, range.checkOutUtc),
    rawOverlap(prisma, organizationId, ids.bhk2, range.checkInUtc, range.checkOutUtc),
  ]);

  return {
    fullFarm: !(ffBusy || v1Busy || v2Busy),
    villa1bhk: !ffBusy && !v1Busy,
    villa2bhk: !ffBusy && !v2Busy,
    rawBusy: {
      fullFarm: ffBusy,
      villa1bhk: v1Busy,
      villa2bhk: v2Busy,
    },
  };
}

/** Per-unit availability for LISTING_GRID homepage (uses SKU footprint rules). */
export async function computePerUnitAvailability(
  prisma: PrismaClient,
  organizationId: string,
  unitIds: string[],
  range: { checkInUtc: Date; checkOutUtc: Date },
): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  await Promise.all(
    unitIds.map(async (unitId) => {
      const footprintIds = await conflictingUnitFootprint(prisma, unitId);
      const { hasConflict } = await detectAvailabilityConflicts(prisma, {
        organizationId,
        footprintUnitIds: footprintIds,
        checkInUtc: range.checkInUtc,
        checkOutUtc: range.checkOutUtc,
      });
      out.set(unitId, !hasConflict);
    }),
  );
  return out;
}

export type LandingBookingTargetDto = { propertySlug: string; unitSlug: string };

/** Property + unit slugs for direct-site POST /public/.../bookings per landing matrix column. */
export async function resolveLandingBookingTargets(
  prisma: PrismaClient,
  ids: { fullFarm: string; bhk1: string; bhk2: string },
): Promise<{
  fullFarm: LandingBookingTargetDto | null;
  villa1bhk: LandingBookingTargetDto | null;
  villa2bhk: LandingBookingTargetDto | null;
}> {
  const rows = await prisma.rentableUnit.findMany({
    where: { id: { in: [ids.fullFarm, ids.bhk1, ids.bhk2] } },
    select: { id: true, slug: true, property: { select: { slug: true } } },
  });
  const map = new Map(rows.map((r) => [r.id, { propertySlug: r.property.slug, unitSlug: r.slug }]));
  return {
    fullFarm: map.get(ids.fullFarm) ?? null,
    villa1bhk: map.get(ids.bhk1) ?? null,
    villa2bhk: map.get(ids.bhk2) ?? null,
  };
}

/** Published offers for this unit: org-wide (`rentableUnitId` null) plus unit-specific rows. */
export async function publishedOffersForLandingUnit(
  prisma: PrismaClient,
  organizationId: string,
  unitId: string,
): Promise<{ id: string; label: string }[]> {
  return prisma.landingOffer.findMany({
    where: {
      organizationId,
      published: true,
      OR: [{ rentableUnitId: null }, { rentableUnitId: unitId }],
    },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, label: true },
  });
}
