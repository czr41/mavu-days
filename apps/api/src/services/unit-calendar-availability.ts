import type { PrismaClient } from '@prisma/client';
import { OrgHomepageKind } from '@prisma/client';

import {
  computeLandingAvailabilityMatrix,
  computePerUnitAvailability,
  resolveLandingUnitIds,
} from './landing-availability-matrix.js';

export type UnitCalendarDayDto = { date: string; available: boolean };

function utcDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function addUtcDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function daysInUtcMonth(year: number, /** 1-based */ month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Availability for each calendar night `[date, date+1)` for a concrete rentable unit.
 * Mirrors landing date search: MATRIX_THREE_SKU uses SKU mutual-exclusion logic; LISTING_GRID uses per-unit footprints.
 */
export async function computePublicUnitCalendarMonth(params: {
  prisma: PrismaClient;
  organizationId: string;
  homepageKind: OrgHomepageKind;
  rentableUnitId: string;
  year: number;
  /** 1–12 */
  month: number;
}): Promise<{ month: string; days: UnitCalendarDayDto[] }> {
  const { prisma, organizationId, homepageKind, rentableUnitId } = params;
  const y = params.year;
  const m = params.month;
  const monthStr = `${String(y)}-${String(m).padStart(2, '0')}`;
  const dim = daysInUtcMonth(y, m);
  const matrixIds = await resolveLandingUnitIds(prisma, organizationId);
  const useMatrixNight =
    homepageKind === OrgHomepageKind.MATRIX_THREE_SKU &&
    matrixIds.configured &&
    (matrixIds.fullFarm === rentableUnitId ||
      matrixIds.bhk1 === rentableUnitId ||
      matrixIds.bhk2 === rentableUnitId);

  const chunks = await Promise.all(
    Array.from({ length: dim }, (_, i) => i + 1).map(async (dom) => {
      const dateStr = `${String(y)}-${String(m).padStart(2, '0')}-${String(dom).padStart(2, '0')}`;
      const checkInUtc = utcDay(dateStr);
      const checkOutUtc = addUtcDays(checkInUtc, 1);

      try {
        if (useMatrixNight) {
          const a = await computeLandingAvailabilityMatrix(
            prisma,
            organizationId,
            {
              fullFarm: matrixIds.fullFarm!,
              bhk1: matrixIds.bhk1!,
              bhk2: matrixIds.bhk2!,
            },
            { checkInUtc, checkOutUtc },
          );
          let available = false;
          if (rentableUnitId === matrixIds.fullFarm) available = a.fullFarm;
          else if (rentableUnitId === matrixIds.bhk1) available = a.villa1bhk;
          else if (rentableUnitId === matrixIds.bhk2) available = a.villa2bhk;
          return { date: dateStr, available };
        }

        const map = await computePerUnitAvailability(prisma, organizationId, [rentableUnitId], {
          checkInUtc,
          checkOutUtc,
        });
        return { date: dateStr, available: map.get(rentableUnitId) ?? false };
      } catch {
        return { date: dateStr, available: false };
      }
    }),
  );

  chunks.sort((a, b) => a.date.localeCompare(b.date));
  return { month: monthStr, days: chunks };
}
