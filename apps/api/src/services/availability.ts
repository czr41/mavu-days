import type { PrismaClient } from '@prisma/client';
import { AvailabilityBlockReason, BookingStatus, RentableUnitKind } from '@prisma/client';

/** Half-open UTC overlap: [checkInUtc, checkOutUtc). */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** BFS descendant rentable-unit ids beneath a SKU. */
export async function collectDescendantUnitIds(prisma: PrismaClient, rootId: string): Promise<string[]> {
  const out: string[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const children = await prisma.rentableUnit.findMany({
      where: { parentRentableUnitId: id },
      select: { id: true },
    });
    for (const c of children) {
      out.push(c.id);
      queue.push(c.id);
    }
  }
  return out;
}

/**
 * SKU-level conflict footprint when checking overlaps:
 * - Whole-home SKU includes nested children.
 * - Child SKU blocks overlapping parent whole-villa availability.
 */
export async function conflictingUnitFootprint(prisma: PrismaClient, unitId: string): Promise<string[]> {
  const unit = await prisma.rentableUnit.findUnique({
    where: { id: unitId },
    select: { id: true, kind: true, parentRentableUnitId: true },
  });
  if (!unit) throw new Error('Unknown rentable_unit');

  const ids = new Set<string>([unit.id]);

  if (unit.kind === RentableUnitKind.WHOLE_HOME) {
    const desc = await collectDescendantUnitIds(prisma, unit.id);
    desc.forEach((id) => ids.add(id));
  }

  if (unit.parentRentableUnitId) {
    ids.add(unit.parentRentableUnitId);
  }

  return [...ids];
}

export async function detectAvailabilityConflicts(
  prisma: PrismaClient,
  args: {
    organizationId: string;
    footprintUnitIds: string[];
    checkInUtc: Date;
    checkOutUtc: Date;
    ignoreBookingId?: string;
    ignoreAvailabilityBlockIds?: string[];
  },
): Promise<{ hasConflict: boolean; blockCount: number; bookingCount: number }> {
  const blockWhere = {
    organizationId: args.organizationId,
    rentableUnitId: { in: args.footprintUnitIds },
    startsAtUtc: { lt: args.checkOutUtc },
    endsAtUtc: { gt: args.checkInUtc },
    ...(args.ignoreAvailabilityBlockIds?.length
      ? { id: { notIn: args.ignoreAvailabilityBlockIds } }
      : {}),
  };

  const bookingWhere = {
    organizationId: args.organizationId,
    rentableUnitId: { in: args.footprintUnitIds },
    status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
    checkInUtc: { lt: args.checkOutUtc },
    checkOutUtc: { gt: args.checkInUtc },
    ...(args.ignoreBookingId ? { id: { not: args.ignoreBookingId } } : {}),
  };

  const [bCount, bkCount] = await prisma.$transaction([
    prisma.availabilityBlock.count({ where: blockWhere }),
    prisma.booking.count({ where: bookingWhere }),
  ]);

  const hasConflict = bCount > 0 || bkCount > 0;
  return { hasConflict, blockCount: bCount, bookingCount: bkCount };
}

export function staffBlockAllowedFor(reason: AvailabilityBlockReason, membershipRoleAllows: boolean) {
  if (reason === AvailabilityBlockReason.PERSONAL_HOLD) return membershipRoleAllows;
  return true;
}
