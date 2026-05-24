import type { Prisma } from '@prisma/client';

/** UTC calendar “today” at 00:00:00.000 — used with `@db.Date` validity fields. */
export function utcTodayDateOnly(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/** Prisma clause: offer is active on `d` (inclusive calendar-day window). */
export function landingOfferActiveOnDateClause(d: Date): Prisma.LandingOfferWhereInput {
  return {
    AND: [
      { OR: [{ validFrom: null }, { validFrom: { lte: d } }] },
      { OR: [{ validTo: null }, { validTo: { gte: d } }] },
    ],
  };
}
