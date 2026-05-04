import type { PrismaClient } from '@prisma/client';
import { detectAvailabilityConflicts } from './availability.js';

export const FULL_FARM_SLUGCandidates = ['full-farm', 'full-farm-stay', 'fullfarm'] as const;
export const BH1_SLUGCandidates = ['1bhk-villa', '1bhk', 'villa-1bhk'] as const;
export const BH2_SLUGCandidates = ['2bhk-villa', '2bhk', 'villa-2bhk'] as const;

function firstMatchSlug<T extends readonly string[]>(units: { id: string; slug: string }[], candidates: T): string | null {
  const lowerMap = new Map(units.map((u) => [u.slug.toLowerCase(), u.id]));
  for (const c of candidates) {
    const id = lowerMap.get(c.toLowerCase());
    if (id) return id;
  }
  return null;
}

/** Resolve landing SKUs anywhere under the org's properties. */
export async function resolveLandingUnitIds(prisma: PrismaClient, organizationId: string) {
  const units = await prisma.rentableUnit.findMany({
    where: { property: { organizationId } },
    select: { id: true, slug: true },
  });

  const fullFarm = firstMatchSlug(units, FULL_FARM_SLUGCandidates);
  const bhk1 = firstMatchSlug(units, BH1_SLUGCandidates);
  const bhk2 = firstMatchSlug(units, BH2_SLUGCandidates);

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
 * Mavu Days mutual-exclusion matrix (booking rows are per SKU only; no inferred parent linkage):
 * — Full Farm free only if FF + both villas free for the interval.
 * — Each villa free only if that villa + FF are free for the interval (villas independent of each other).
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
