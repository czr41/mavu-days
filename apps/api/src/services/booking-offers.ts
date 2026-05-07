import type { PrismaClient } from '@prisma/client';

const MAX_OFFERS_PER_BOOKING = 24;

/** Validates published org offers that apply to this unit (org-wide or scoped). */
export async function validateOffersForBookingUnit(
  prisma: PrismaClient,
  organizationId: string,
  rentableUnitId: string,
  offerIds: string[] | undefined,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  if (!offerIds?.length) return { ok: true, ids: [] };
  const unique = [...new Set(offerIds)];
  if (unique.length > MAX_OFFERS_PER_BOOKING) {
    return { ok: false, error: `At most ${MAX_OFFERS_PER_BOOKING} offers per booking` };
  }
  const rows = await prisma.landingOffer.findMany({
    where: { id: { in: unique }, organizationId, published: true },
    select: { id: true, rentableUnitId: true },
  });
  if (rows.length !== unique.length) {
    return { ok: false, error: 'One or more offers are invalid or no longer available' };
  }
  for (const row of rows) {
    if (row.rentableUnitId != null && row.rentableUnitId !== rentableUnitId) {
      return { ok: false, error: 'One or more offers do not apply to this stay option' };
    }
  }
  return { ok: true, ids: unique };
}
